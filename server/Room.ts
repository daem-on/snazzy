import { Validator } from "@cfworker/json-schema";
import { ArraySchema } from "@colyseus/schema";
import { Client, Room } from "colyseus";
import fetch from "node-fetch";
import { DeckDefinition, deckSchema, fetchDeck } from "./fetchDeck.ts";
import { Msg, Response } from "./shared-enums.ts";
import { PlayerState, PlayerStatus, ResponseCard, State } from "./shared-schema.ts";

class Deck {
	calls: number;
	responses: number;
	callLengths: number[];
	playing: {
		calls: number[],
		responses: number[]
	};
	
	constructor (calls: string[][], responses: number) {
		this.calls = calls.length;
		this.responses = responses;
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
		var c = Array.from({length: this.calls}, (_, i) => i);
		this.playing.calls = Deck.shuffle(c);
	}
	
	reshuffleResponses() {
		var r = Array.from({length: this.responses}, (_, i) => i);
		this.playing.responses = Deck.shuffle(r);
	}
}

export class CardRoom extends Room<State> {
	deck!: Deck;
	czar!: number;
	giveCardPending: Client[] = [];
	host?: Client = undefined;
	constants!: {
		dealNumber: number,
		winLimit: number
	}
	_disposed = false;
	
	async onCreate(options: any) {
		console.log("Created", options.title);
		console.log("Options:", options);
		this.setMetadata(options);

		this.setState(new State());
		this.setPatchRate(100);

		this.constants = {
			dealNumber: options.dealNumber || 7,
			winLimit: options.winLimit || 5
		};

		const deck = await fetchDeck(options.deck, fetch);
		if (deck == null) return this.disconnect();
		const validator = new Validator(deckSchema);
		const validation = validator.validate(deck);
		if (!validation.valid) {
			console.error("Invalid deck:", options.deck, validation.errors);
			return this.disconnect();
		}
		this.state.deckUrl = options.deck;

		this.deck = new Deck(deck.calls, deck.responses.length);
		this.state.roundNumber = 0;

		this.onMessage(Response.chat, (client, data) => {
			console.log("Message", client.id, data)

			this.broadcast(Msg.Chat, {
				sender: client.id, text: data.text
			}, { except: client })
		});

		this.onMessage(Response.playCard, (client, data) => {
			// TODO: see if the player has the card

			if (this.state.players.get(client.id)?.status != PlayerStatus.Playing) {
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
			this.state.players.get(client.id)!.status = PlayerStatus.Played;

			this.revealIfDone();
		});

		this.onMessage(Response.pickCard, (client, data) => {
			if (this.state.players.get(client.id)?.status != PlayerStatus.Czar) {
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
			this.state.players.get(client.id)!.status = PlayerStatus.Played;

			if (this.state.players.get(picked.playedBy)!.points > this.constants.winLimit) {
				this.broadcast(Msg.Over, {winner: picked.playedBy});
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
			if (oldPlayer?.status == PlayerStatus.Timeout) {
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

	sendError(client: Client, message: string, code = 4000) {
		client.error(code, message);
		console.log("Error", client.id, message);
	}

	onJoin(client: Client, options: any) {
		if (this._disposed) return client.leave(1001);
		console.log("Joined", client.id, options)
		this.state.players.set(client.id, new PlayerState());
		this.ensureCzar();
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
		this.state.players.get(client.id)!.status = PlayerStatus.Playing;
	}

	giveCard(client: Client) {
		if (this.deck.playing.responses.length < 3) this.deck.reshuffleResponses();

		var hand = (this.deck.playing.responses.pop());
		client.send(Msg.GiveCard, {hand: hand});
	}

	startRound() {
		this.clients.forEach(client => {
			this.state.players.get(client.id)!.status = PlayerStatus.Playing;
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
	}

	ensureCzar() {
		if (this.state.roundNumber <= 0) return;
		if ([...this.state.players.values()].some(player => player.status == PlayerStatus.Czar)) return;
		this.chooseNewCzar();
	}

	chooseNewCzar() {
		this.czar++;
		if (this.czar > this.clients.length-1) this.czar = 0;
		this.state.players.get(this.clients[this.czar].id)!.status = PlayerStatus.Czar;
	}

	revealIfDone() {
		// check if we're done
		if ([...this.state.players.values()].some(player => player.status == PlayerStatus.Playing)) return;

		Deck.shuffle(this.state.responses);

		this.state.reveal = true;
		// TODO: start timeout
	}

	givePendingCards() {
		this.giveCardPending.forEach(client => {
			if (!client) return;
			for (var i = 0; i < this.state.cardsInRound; i++) {
				this.giveCard(client);
			}
		});
	}

	endRound() {
		this.clock.setTimeout(this.startRound.bind(this), 4000);
	}

	isEmpty() {
		return (this.clients.length == 0)
			|| (this.clients.every(client => this.state.players.get(client.id)?.status == PlayerStatus.Timeout));
	}

	async onLeave(client: Client, consented: boolean) {
		const id = client.id
		console.log("Client left", id, consented);

		this.revealIfDone();
		this.state.players.get(id)!.status = PlayerStatus.Timeout;
		if (this.isEmpty()) return;

		this.ensureCzar();
		if (id == this.host?.id) this.host = this.clients[0];
		this.state.host = this.host!.id;
	}

	onDispose() {
		this._disposed = true;
	}

}
