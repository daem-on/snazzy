import { ArraySchema } from "@colyseus/schema";
import { Client, Room } from "colyseus";
import { Msg, Response } from "./shared-enums.ts";
import { ResponseCard, PlayerState, State } from "./shared-schema.ts";
import { fetchDeck } from "./fetchDeck.ts";

class Deck {
	calls: number[];
	callLengths: number[];
	responses: number[];
	playing: {
		calls: number[],
		responses: number[]
	};
	
	constructor (calls: string[][], responses: number) {
		this.calls = Array.from({length: calls.length}, (_, i) => i);
		this.responses = Array.from({length: responses}, (_, i) => i);
		this.playing = {calls: [], responses: []};
		this.callLengths = Array.from(
			{length: calls.length}, (_, i) => calls[i].length
		);
		this.reshuffleCalls(); this.reshuffleResponses();
	}
	
	// Fisher-Yates, copied from StackOverflow
	static shuffle<T extends { [i: number]: any, length: number }>(a: T) {
		var j, x, i;
		for (i = a.length - 1; i > 0; i--) {
			j = Math.floor(Math.random() * (i + 1));
			x = a[i];
			a[i] = a[j];
			a[j] = x;
		}
		return a;
	}
	
	reshuffleCalls() {
		var c = this.calls.slice(0, this.calls.length);
		this.playing.calls = Deck.shuffle(c);
	}
	
	reshuffleResponses() {
		var r = this.responses.slice(0, this.responses.length);
		this.playing.responses = Deck.shuffle(r);
	}
}

export class CardRoom extends Room<State> {
	deck!: Deck;
	czar!: number;
	// workaround for not knowing how many cards are played
	cardsInRound: Record<string, number> = {};
	giveCardPending: Client[] = [];
	host?: Client = undefined;
	constants!: {
		dealNumber: number,
		winLimit: number
	}
	
	async onCreate(options: any) {
		console.log("Created", options.title);
		console.log("Options:", options);

		this.setState(new State());
		this.setPatchRate(100);

		this.constants = {
			dealNumber: options.dealNumber || 7,
			winLimit: options.winLimit || 5
		};

		const deck = await fetchDeck(options.deck);
		if (deck == null) {
			this.disconnect();
			return;
		}
		this.state.deckUrl = options.deck;

		this.deck = new Deck(deck.calls, deck.responses.length);
		this.state.roundNumber = 0;
		this.cardsInRound = {};

		this.onMessage(Response.chat, (client, data) => {
			console.log("Message", client.id, data)

			this.broadcast(Msg.Chat, {
				sender: client.id, text: data.text
			}, { except: client })
		});

		this.onMessage(Response.playCard, (client, data) => {
			// see if the player has the card

			if (this.state.players.get(client.id)?.status != "playing") {
				this.sendError(client, "You have played this turn.")
				return;
			}

			// store the card in responses
			let c = new ResponseCard();
			for (const num of data.cardArray) {
				c.cardid.push(num);
			}
			c.playedBy = client.id;
			this.state.responses.push(c);

			this.giveCardPending.push(client);
			this.cardsInRound[client.id] = data.cardArray.length;
			this.state.players.get(client.id)!.status = "played";

			this.broadcast(Msg.Update, null, {afterNextPatch: true});
			this.revealIfDone();
		});

		this.onMessage(Response.pickCard, (client, data) => {
			if (this.state.players.get(client.id)?.status != "czar") {
				this.sendError(client, "You're not the Czar.")
				return;
			} if (!this.state.reveal) {
				this.sendError(client, "The cards are not revealed yet.")
				return;
			}

			if (data.cardIndex > this.state.responses.length-1){
				this.sendError(client, "That's not possible.")
				return;
			}
			let picked = this.state.responses[data.cardIndex];
			this.state.players.get(picked.playedBy)!.points++;

			this.state.responses.at(data.cardIndex).winner = true;
			this.broadcast(Msg.Winner, {cardIndex: data.cardIndex });
			this.state.players.get(client.id)!.status = "played";

			if (this.state.players.get(picked.playedBy)!.points > this.constants.winLimit) {
				this.broadcast(Msg.Over, {winner: picked.playedBy });
				return this.disconnect();
			}

			this.givePendingCards();
			this.endRound();
		});

		this.onMessage(Response.startGame, (client, data) => {
			if (client != this.host)
				return this.sendError(client, "You're not the Host.");
			if (this.state.roundNumber == 0) { // if it wasn't started already
				this.czar = -1;
				this.dealCards();
				this.startRound();
			}
		});

		this.onMessage(Response.name, (client, data) => {
			this.state.players.get(client.id)!.name = data.text;
			if (this.state.roundNumber > 0) this.dealCardsOnce(client);
		});

		this.onMessage(Response.reconnect, (client, data) => {
			const oldPlayer = this.state.players.get(data.text);
			const player = this.state.players.get(client.id)!;
			if (oldPlayer?.status == "timeout") {
				player.points = oldPlayer.points;
				player.name = oldPlayer.name;
			}
		});

		this.onMessage(Response.debug, (client, data) => {
			if (data.cmd == "newRound") {
				this.givePendingCards();
				this.startRound();
			} else if (data.cmd == "stop") {
				this.broadcast(Msg.Restart);
				this.disconnect();
			}
		});
	}

	sendError(client: Client, message: string) {
		client.send(Msg.Error, {message});
		console.log("Error", client.id, message);
	}

	onJoin(client: Client, options: any) {
		console.log("Joined", client.id, options)
		this.state.players.set(client.id, new PlayerState());
		if (!this.host) this.host = client;
		this.state.host = this.host.id;
	}

	dealCards() {
		if (this.deck.playing.responses.length < 
			(this.clients.length * this.constants.dealNumber)) {
			console.error("Not enough cards to play with!")
		}

		this.clients.forEach(client => {
			let hand: number[] = [];
			for (let i = 0; i < this.constants.dealNumber; i++) {
				hand.push(this.deck.playing.responses.pop()!);
			}
			client.send(Msg.Deal, {hand: hand})
		});
	}

	dealCardsOnce(client: Client) {
		if (this.deck.playing.responses.length < this.constants.dealNumber)
			this.deck.reshuffleResponses();

		let hand: number[] = [];
		for (let i = 0; i < this.constants.dealNumber; i++) {
			hand.push(this.deck.playing.responses.pop()!);
		}
		client.send(Msg.DealPatch, {hand: hand})
		this.state.players.get(client.id)!.status = "playing";
	}

	giveCard(client: Client) {
		if (this.deck.playing.responses.length < 3) this.deck.reshuffleResponses();

		var hand = (this.deck.playing.responses.pop());
		client.send(Msg.GiveCard, {hand: hand});
	}

	startRound() {
		this.state.players.forEach(player => {
			player.status = "playing";
		});
		this.state.responses = new ArraySchema<ResponseCard>();
		this.state.reveal = false;

		this.state.roundNumber++;
		this.giveCardPending = [];
		this.broadcast(Msg.NewRound);

		this.chooseNewCzar();

		if (this.deck.playing.calls.length < 3) this.deck.reshuffleCalls();
		this.state.callId = this.deck.playing.calls.pop()!;
		this.state.cardsInRound = this.deck.callLengths[this.state.callId]-1;
		this.broadcast(Msg.Update, null, {afterNextPatch: true});
	}

	chooseNewCzar() {
		this.czar++;
		if (this.czar > this.clients.length-1) this.czar = 0;
		this.clients[this.czar].send(Msg.Czar, null);
		this.state.players.get(this.clients[this.czar].id)!.status = "czar";
	}

	revealIfDone() {
		// check if we're done
		if ([...this.state.players.values()].some(player => player.status == "playing")) return;

		Deck.shuffle(this.state.responses);

		this.state.reveal = true;
		this.broadcast(Msg.Reveal, null, {afterNextPatch: true});
	}

	givePendingCards() {
		this.giveCardPending.forEach(client => {
			if (!client) return;
			for (var i = 0; i < this.cardsInRound[client.id]; i++) {
				this.giveCard(client);
			}
		});
	}

	endRound() {
		this.clock.setTimeout(this.startRound.bind(this), 4000);
	}

	isEmpty() {
		return (this.clients.length == 0)
			|| (this.clients.every(client => this.state.players.get(client.id)?.status == "timeout"));
	}

	async onLeave(client: Client, consented: boolean) {
		const id = client.id
		if (this.isEmpty()) return;
		if (this.state.players.get(id)?.status == "czar") this.chooseNewCzar();
		if (id == this.host?.id) this.host = this.clients[0];
		this.state.host = this.host!.id;

		this.revealIfDone();
		this.state.players.get(id)!.status = "timeout";
		console.log("Client left", id, consented);
	}

	onDispose() {
	}

}
