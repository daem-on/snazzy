import fetch from "node-fetch";

export type DeckDefinition = {
	calls: string[][];
	responses: string[][];
};

export async function fetchDeck(deckUrl: string): Promise<DeckDefinition | undefined> {
	try {
		const response = await fetch(deckUrl);
		const deck = await response.json() as any;
		if (!deck.calls || !deck.responses)
			throw Error("Invalid deck");
		// TODO: validate deck
		return deck;
	} catch (e) {
		console.error("Error fetching deck:", e);
	}
}