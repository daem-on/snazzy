import { Room, Client } from "colyseus";
import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";
import fs from "fs";

const DEFAULT_DECK = "12b";

class ChatMessage extends Schema {
	@type("string") message: string;
	@type("string") id: string;
}

export class Card extends Schema {
	@type(["number"]) cardid = new ArraySchema<number>();
	@type("string") playedBy: string;
}
  
class Deck {
	id: string;
	calls: number[];
	responses: number[];
	playing: {
		calls: number[],
		responses: number[]
	};
	
	constructor (id: string, calls: number, responses: number) {
		this.id = id;
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
	static shuffle(a: any[]) {
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

export class MyRoom extends Room<State> {
	deck: Deck;
	czar: number;
	// workaround for not knowing how many cards are played
	cardsInRound: Record<string, number>;
	giveCardPending: Client[];
	host: Client;
	constants = {
		callsNumber: 141,
		responsesNumber: 330,
		dealNumber: 7,
		winLimit: 5
	}
	
	onCreate (options: any) {
		console.log("Created", options);

		this.setState(new State());
		this.setPatchRate(500);

		// get number of cards from config
		if (options.deck) {
			let text = fs.readFileSync("config/decks.json", "utf-8")
			let obj = JSON.parse(text);
			if (obj[options.deck]) {
				let d = obj[options.deck];
				this.constants.callsNumber = d.calls;
				this.constants.responsesNumber = d.responses;
			}
			this.state.deck = options.deck;
		} else {
			this.state.deck = DEFAULT_DECK;
		}

		this.host = null;
		this.deck = new Deck("DHG4B",
			this.constants.callsNumber,
			this.constants.responsesNumber);
		this.state.roundNumber = 0;
		this.cardsInRound = {};
	}

	onJoin (client: Client, options: any) {
		console.log("Joined", client.id, options)
		this.state.playerList.push(client.id);
		if (!this.host) this.host = client;
		this.state.host = this.host.id;

		if (this.state.roundNumber > 0) {
			this.dealCardsOnce(client);
		}
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
			this.send(client, {type: "deal", hand: hand})
		});
	}

	dealCardsOnce(client: Client) {
		if (this.deck.playing.responses.length < 8) this.deck.reshuffleResponses();

		let hand: number[] = [];
		for (let i = 0; i < this.constants.dealNumber; i++) {
			hand.push(this.deck.playing.responses.pop());
		}
		this.send(client, {type: "dealPatch", hand: hand})
		this.state.playerStatus[client.id] = "playing";
	}

	giveCard (client: Client) {
		if (this.deck.playing.responses.length < 3) this.deck.reshuffleResponses();

		var hand = (this.deck.playing.responses.pop());
		this.send(client, {type: "giveCard", hand: hand});
	}

	startRound() {
		this.clients.forEach(client => {
			this.state.playerStatus[client.id] = "playing"
		});
		this.state.responses = new ArraySchema<Card>();
		this.state.reveal = false;

		this.state.roundNumber++;
		this.giveCardPending = [];
		this.broadcast({type: "newRound"});

		this.chooseNewCzar();

		if (this.deck.playing.calls.length < 3) this.deck.reshuffleCalls();
		this.state.call = new Card();
		this.state.call.cardid[0] = this.deck.playing.calls.pop();
		this.broadcast({type: "update"}, {afterNextPatch: true});
	}

	chooseNewCzar() {
		this.czar++;
		if (this.czar > this.clients.length-1) this.czar = 0;
		this.send(this.clients[this.czar], {type: "czar"});
		this.state.playerStatus[this.clients[this.czar].id] = "czar";
	}

	onMessage (client: Client, message: any) {
		if (message.type == "chat") {
			console.log("Message", client.id, message)

			this.broadcast({
				type: "chat", sender: client.id, text: message.text
			}, { except: client })
		} else if (message.type == "playCard") {
			// see if the player has the card

			if (this.state.playerStatus[client.id] != "playing") {
				this.send(client, {type: "error", message: "You have played this turn."})
				return;
			}

			// store the card in responses
			let c = new Card();
			for (const num of message.cardArray) {
				c.cardid.push(num);
			}
			c.playedBy = client.id;
			this.state.responses.push(c);

			this.giveCardPending.push(client);
			this.cardsInRound[client.id] = message.cardArray.length;
			this.state.playerStatus[client.id] = "played";

			this.broadcast({type: "update"}, {afterNextPatch: true});
			this.revealIfDone();
		} else if (message.type == "pickCard") {
			if (this.state.playerStatus[client.id] != "czar") {
				this.send(client, {type: "error", message: "You're not the Czar."})
				return;
			} if (!this.state.reveal) {
				this.send(client, {type: "error", message: "The cards are not revealed yet."})
				return;
			}

			if (message.cardIndex > this.state.responses.length-1){
				this.send(client, {type: "error", message: "That's not possible."})
				return;
			}
			let picked = this.state.responses[message.cardIndex];
			if (!this.state.playerPoints[picked.playedBy])
				this.state.playerPoints[picked.playedBy] = 0;
			this.state.playerPoints[picked.playedBy] += 1;

			this.broadcast({ type: "winner", cardIndex: message.cardIndex });
			this.state.playerStatus[client.id] = "played";

			if (this.state.playerPoints[picked.playedBy] > this.constants.winLimit) {
				this.broadcast({ type: "over", winner: picked.playedBy });
				return this.disconnect();
			}

			this.givePendingCards();
			this.endRound();
		} else if (message.type == "startGame") {
			if (client != this.host)
				return this.send(client, {type: "error", message: "You're not the Host."});
			if (this.state.roundNumber == 0) { // if it wasn't started already
				this.czar = -1;
				this.dealCards();
				this.startRound();
			}
		} else if (message.type == "name") {
			this.state.playerNames[client.id] = message.text;
		} else if (message.type == "debug") {
			if (message.cmd == "newRound") {
				this.givePendingCards();
				this.startRound();
			} else if (message.cmd == "stop") {
				this.broadcast({type: "restart"});
				this.disconnect();
			}
		}
	}

	revealIfDone() {
		let flag = false;
		this.clients.forEach(client => {
			if (this.state.playerStatus[client.id] == "playing") flag = true;
		});
		if (flag) return; // we're not done

		Deck.shuffle(this.state.responses);

		this.state.reveal = true;
		this.broadcast({type: "reveal"}, {afterNextPatch: true});
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
		this.broadcast({ type: "chat", sender: "Server", text: "Next round starting in 4..." });
		this.clock.setTimeout(this.startRound.bind(this), 4000);
	}

	onLeave (client: Client, consented: boolean) {
		console.log("Left", client.id, consented)
		if (this.state.playerStatus[client.id] == "czar") this.chooseNewCzar();
		if (this.host == client) this.host = this.clients.filter(item => item!=client)[0];
		console.log("new host", this.host)
		this.state.host = this.host.id;
		this.state.playerList.splice(this.state.playerList.indexOf(client.id), 1)
		this.revealIfDone();
	}

	onDispose() {
	}

}
