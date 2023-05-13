import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";
import type { PlayerStatus } from "./shared-enums";

export class ResponseCard extends Schema {
	@type(["uint16"]) cardid = new ArraySchema<number>();
	@type("string") playedBy!: string;
	@type("boolean") winner = false;
}

export class PlayerState extends Schema {
	@type("number") points = 0;
	@type("string") name!: string;
	@type("uint8") status!: PlayerStatus;
}

export class State extends Schema {
	@type([ResponseCard]) responses = new ArraySchema<ResponseCard>();
	@type("uint16") callId!: number;
	@type("boolean") reveal = false;
	@type({map: PlayerState}) players = new MapSchema<PlayerState>();
	@type("uint8") roundNumber!: number;
	@type("string") deckUrl!: string;
	@type("string") host!: string;
	@type("number") cardsInRound!: number;
}