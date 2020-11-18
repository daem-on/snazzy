import fs from "fs";
import {default as defaultSettings} from "./settings.json";
import path from "path"

type DeckList = Record<string, DeckDefinition>;
type DeckDefinition = { calls: number; responses: number; }

async function getDeckDefinition(dataFolderPath: string): Promise<DeckDefinition> {
	const dir = await fs.promises.readdir(dataFolderPath)
	if (!dir.includes("calls-clean.json") ||
		!dir.includes("responses-clean.json"))
		throw Error

	const calls = await fs.promises.readFile(path.join(dataFolderPath, "calls-clean.json"), "utf-8")
	const responses = await fs.promises.readFile(path.join(dataFolderPath, "responses-clean.json"), "utf-8")

	return {calls: JSON.parse(calls).length, responses: JSON.parse(responses).length}
}

export async function getSettings() {
	if (!fs.existsSync("data")) {
		console.log("Server cannot start: data/ folder does not exist.");
		process.exit();
	}

	const decks: DeckList = {}
	const dataContent = await fs.promises.readdir("data", {withFileTypes: true})
	for await (let item of dataContent) {
		if (item.isDirectory()) {
			decks[item.name] = await getDeckDefinition(path.join("data", item.name))
		}
	}

	let globalSettings: Record<string, any> = {}
	Object.assign(globalSettings, defaultSettings)
	globalSettings.decks = decks
	console.log("Using settings:", globalSettings)
	return globalSettings
}
