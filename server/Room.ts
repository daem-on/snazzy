import { Room, Client } from "colyseus";
import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";

enum Msg {
	Deal,
	Update,
	DealPatch,
	GiveCard,
	Czar,
	NewRound,
	Reveal,
	Winner,
	Over,
	Restart,
	Error,
	Chat
}

enum Response {
	name,
	pickCard,
	playCard,
	debug,
	startGame,
	reconnect,
	chat
}

export class Card extends Schema {
	@type(["number"]) cardid = new ArraySchema<number>();
	@type("string") playedBy: string;
}
  
class Deck {
	calls: number[];
	responses: number[];
	playing: {
		calls: number[],
		responses: number[]
	};
	
	constructor (calls: number, responses: number) {
		this.calls = [];
		this.responses = [];
		this.playing = {calls: [],
			responses: []};
		for (let i = 0; i < calls; i++) {
			this.calls.push(i);
		};
		for (let i = 0; i < responses; i++) {
			this.responses.push(i);
		};
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

export class State extends Schema {
	@type([Card]) responses = new ArraySchema<Card>();
	@type(Card) call: Card = new Card();
	@type("boolean") reveal = false;
	@type(["string"]) playerList = new ArraySchema<string>();
	@type({map: "string"}) playerStatus = new MapSchema<string>();
	@type({map: "string"}) playerNames = new MapSchema<string>();
	@type({map: "number"}) playerPoints = new MapSchema<number>();
	@type("number") roundNumber: number;
	@type("string") deck: string;
	@type("string") host: string;
}

export class CardRoom extends Room<State> {
	deck: Deck;
	czar: number;
	// workaround for not knowing how many cards are played
	cardsInRound: Record<string, number>;
	giveCardPending: Client[];
	host: Client;
	constants: {
		dealNumber: number,
		winLimit: number
	}
	
	onCreate (options: any) {
		console.log("Created", options.title);
		console.log("Options:", options);

		this.setState(new State());
		this.setPatchRate(500);

		this.constants = {
			dealNumber: options.dealNumber || options.global.dealNumber,
			winLimit: options.winLimit || options.global.winLimit
		};

		// needed for number of cards
		this.state.deck = options.global.defaultDeck;
		if (options.deck) {
			if (options.global.decks[options.deck])
				this.state.deck = options.deck;
			else
				console.log("Invalid deck:", options.deck);
		}

		let d = options.global.decks[this.state.deck];

		this.host = null;
		this.deck = new Deck(d.calls, d.responses);
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

			if (this.state.playerStatus.get(client.id) != "playing") {
				this.send(client, Msg.Error, {message: "You have played this turn."})
				return;
			}

			// store the card in responses
			let c = new Card();
			for (const num of data.cardArray) {
				c.cardid.push(num);
			}
			c.playedBy = client.id;
			this.state.responses.push(c);

			this.giveCardPending.push(client);
			this.cardsInRound[client.id] = data.cardArray.length;
			this.state.playerStatus.set(client.id, "played");

			this.broadcast(Msg.Update, null, {afterNextPatch: true});
			this.revealIfDone();
		});

		this.onMessage(Response.pickCard, (client, data) => {
			if (this.state.playerStatus.get(client.id) != "czar") {
				this.send(client, Msg.Error, {message: "You're not the Czar."})
				return;
			} if (!this.state.reveal) {
				this.send(client, Msg.Error, {message: "The cards are not revealed yet."})
				return;
			}

			if (data.cardIndex > this.state.responses.length-1){
				this.send(client, Msg.Error, {message: "That's not possible."})
				return;
			}
			let picked = this.state.responses[data.cardIndex];
			if (!this.state.playerPoints.get(picked.playedBy))
				this.state.playerPoints.set(picked.playedBy, 0);
			this.state.playerPoints.set(picked.playedBy, this.state.playerPoints.get(picked.playedBy)+1);

			this.broadcast(Msg.Winner, {cardIndex: data.cardIndex });
			this.state.playerStatus.set(client.id, "played");

			if (this.state.playerPoints.get(picked.playedBy) > this.constants.winLimit) {
				this.broadcast(Msg.Over, {winner: picked.playedBy });
				return this.disconnect();
			}

			this.givePendingCards();
			this.endRound();
		});

		this.onMessage(Response.startGame, (client, data) => {
			if (client != this.host)
				return this.send(client,  Msg.Error, {message: "You're not the Host."});
			if (this.state.roundNumber == 0) { // if it wasn't started already
				this.czar = -1;
				this.dealCards();
				this.startRound();
			}
		});

		this.onMessage(Response.name, (client, data) => {
			this.state.playerNames.set(client.id, data.text);
			if (this.state.roundNumber > 0) this.dealCardsOnce(client);
		});

		this.onMessage(Response.reconnect, (client, data) => {
			if (this.state.playerStatus.get(data.text) == "timeout") {
				this.state.playerPoints.set(client.id, this.state.playerPoints.get(data.text));
				this.state.playerNames.set(client.id, this.state.playerNames.get(data.text));
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

	onJoin (client: Client, options: any) {
		console.log("Joined", client.id, options)
		this.state.playerList.push(client.id);
		if (!this.host) this.host = client;
		this.state.host = this.host.id;
	}

	dealCards () {
		if (this.deck.playing.responses.length < 
			(this.clients.length * this.constants.dealNumber)) {
			console.error("Not enough cards to play with!")
		}

		this.clients.forEach(client => {
			let hand: number[] = [];
			for (let i = 0; i < this.constants.dealNumber; i++) {
				hand.push(this.deck.playing.responses.pop());
			}
			this.send(client, Msg.Deal, {hand: hand})
		});
	}

	dealCardsOnce(client: Client) {
		if (this.deck.playing.responses.length < this.constants.dealNumber)
			this.deck.reshuffleResponses();

		let hand: number[] = [];
		for (let i = 0; i < this.constants.dealNumber; i++) {
			hand.push(this.deck.playing.responses.pop());
		}
		this.send(client, Msg.DealPatch, {hand: hand})
		this.state.playerStatus.set(client.id, "playing");
	}

	giveCard (client: Client) {
		if (this.deck.playing.responses.length < 3) this.deck.reshuffleResponses();

		var hand = (this.deck.playing.responses.pop());
		this.send(client, Msg.GiveCard, {hand: hand});
	}

	startRound() {
		this.clients.forEach(client => {
			this.state.playerStatus.set(client.id, "playing")
		});
		this.state.responses = new ArraySchema<Card>();
		this.state.reveal = false;

		this.state.roundNumber++;
		this.giveCardPending = [];
		this.broadcast(Msg.NewRound);

		this.chooseNewCzar();

		if (this.deck.playing.calls.length < 3) this.deck.reshuffleCalls();
		this.state.call = new Card();
		this.state.call.cardid[0] = this.deck.playing.calls.pop();
		this.broadcast(Msg.Update, null, {afterNextPatch: true});
	}

	chooseNewCzar() {
		this.czar++;
		if (this.czar > this.clients.length-1) this.czar = 0;
		this.send(this.clients[this.czar], Msg.Czar, null);
		this.state.playerStatus.set(this.clients[this.czar].id, "czar");
	}

	revealIfDone() {
		// check if we're done
		if (this.clients.some(client => this.state.playerStatus.get(client.id) == "playing")) return;

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
		return (this.clients.length == 0) || (this.clients.every(client => this.state.playerStatus.get(client.id) == "timeout"));
	}

	async onLeave (client: Client, consented: boolean) {
		const id = client.id
		// if (this.isEmpty()) this.disconnect();
		if (this.state.playerStatus.get(id) == "czar") this.chooseNewCzar();
		if (id == this.host.id) this.host = this.clients[0];
		this.state.host = this.host.id;
		this.state.playerList.splice(this.state.playerList.indexOf(id), 1);

		this.revealIfDone();
		this.state.playerStatus.set(id, "timeout");
		console.log("Left", id, consented);
	}

	onDispose() {
	}

}
