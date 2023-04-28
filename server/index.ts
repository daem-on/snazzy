import { WebSocketTransport } from "@colyseus/ws-transport";
import { Server } from "colyseus";
import express from "express";
import http from "http";

import { CardRoom } from "./Room.ts";

const port = Number(process.env.PORT || 2567);
const app = express();

const server = http.createServer(app);
const gameServer = new Server({
	transport: new WebSocketTransport({
		server
	})
});

// register your room handlers
gameServer.define('card_room', CardRoom)
	.filterBy(["title"]);

gameServer.listen(port);
console.log(`Listening on ws://localhost:${ port }`)
