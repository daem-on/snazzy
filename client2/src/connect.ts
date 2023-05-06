import { Client } from "colyseus.js";
import type { State } from "../../server/shared-schema";

function getServerUrl() {
	const localOverride = localStorage.getItem("urlOverride");
	if (localOverride) return localOverride;

	const buildOverride = import.meta.env.SERVER_URL;
	if (buildOverride) return buildOverride;

	const url = new URL(window.location.href);
	url.port = "2567";
	url.search = "";
	url.protocol = url.protocol.replace("http", "ws");
	url.hash = "";
	return url.href;
}

const client = new Client(getServerUrl());

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