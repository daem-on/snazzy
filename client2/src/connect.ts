import { Client } from "colyseus.js";
import type { State } from "../../server/shared-schema.ts";

export async function connect() {
	const url = new URL(window.location.href);
	url.port = "2567";
	url.protocol = url.protocol.replace("http", "ws");
	const client = new Client(url.href);

	return client.joinOrCreate<State>("card_room", {
		title: "test2",
		deck: "https://gist.githubusercontent.com/daem-on/82632a44fece3017f45e4feb5b87bc4a/raw/494df51787a05fbe73b9b023f864fe3f0c7ba595/12b.json"
	});
}