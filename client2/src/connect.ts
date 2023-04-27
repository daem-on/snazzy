import { Client } from "colyseus.js";
import type { State } from "../../server/shared-schema.ts";

export async function connect() {
	const client = new Client("ws://localhost:2567");
	
	return client.joinOrCreate<State>("card_room", {title: "test", deck: "12b"});
}