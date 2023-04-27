import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";

export class Card extends Schema {
	@type(["number"]) cardid = new ArraySchema<number>();
	@type("string") playedBy: string;
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