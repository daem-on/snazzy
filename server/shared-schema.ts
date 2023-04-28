import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";

export class ResponseCard extends Schema {
	@type(["number"]) cardid = new ArraySchema<number>();
	@type("string") playedBy!: string;
	@type("boolean") winner = false;
}

export class PlayerState extends Schema {
	@type(["number"]) hand = new ArraySchema<number>();
	@type("number") points = 0;
	@type("string") name!: string;
	@type("string") status!: string;
}

export class State extends Schema {
	@type([ResponseCard]) responses = new ArraySchema<ResponseCard>();
	@type("number") callId!: number;
	@type("boolean") reveal = false;
	@type({map: PlayerState}) players = new MapSchema<PlayerState>();
	@type("number") roundNumber!: number;
	@type("string") deckUrl!: string;
	@type("string") host!: string;
	@type("number") cardsInRound!: number;
}