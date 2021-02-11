import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "colyseus";
import path from "path";
import fs from "fs";
import {default as defaultSettings} from "./settings.json";

import { CardRoom } from "./Room";

const port = Number(process.env.PORT || 2567);
const app = express()

app.use(cors());
app.use(express.json())
const clientPath = __dirname.includes("build") ? "../../client" : "../client";
app.use(express.static(path.join(__dirname, clientPath)))
app.use("/data", express.static("data"))

if (!fs.existsSync("data")) {
	console.log("Server cannot start: data/ folder does not exist.")
	process.exit()
}

let globalSettings;
try {
	globalSettings = JSON.parse(fs.readFileSync("settings.json", "utf-8"))
} catch (e) {
	console.log("There is no settings.json, using default:")
	console.log(defaultSettings)
	globalSettings = defaultSettings
}

app.get("/settings.json", (req, res) => {
	res.send(defaultSettings)
})

const server = http.createServer(app);
const gameServer = new Server({
	server,
});

// register your room handlers
gameServer.define('card_room', CardRoom, {global: globalSettings})
	.filterBy(["title"]);

gameServer.listen(port);
console.log(`Listening on ws://localhost:${ port }`)
