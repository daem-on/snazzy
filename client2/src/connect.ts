import { Client } from "colyseus.js";
import type { State } from "../../server/shared-schema.ts";

const url = new URL(window.location.href);
url.port = "2567";
url.protocol = url.protocol.replace("http", "ws");
url.hash = "";

const local = localStorage.getItem("urlOverride");
if (local) url.href = local;

const client = new Client(url.href);

export async function join(title: string) {
	return client.join<State>("card_room", { title: title });
}

export async function create(options: any) {
	return client.create<State>("card_room", options);
}

export async function checkRoomExists(title: string) {
	const rooms = await client.getAvailableRooms("card_room");
	return rooms.some(room => room.metadata.title === title);
}