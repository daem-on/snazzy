export type DeckDefinition = {
	calls: string[][];
	responses: string[][];
};

// compatibility with both `fetch-node` and browser `fetch`
type FetchFn = (url: string) => Promise<{ json: () => any }>;

export const deckSchema = {
	type: "object" as const,
	required: ["calls", "responses"],
	properties: {
		"calls": {
			"type": "array" as const,
			"items": {
				"type": "array" as const,
				"items": {
					"type": "string" as const
				}
			}
		},
		"responses": {
			"type": "array" as const,
			"items": {
				"type": "array" as const,
				"items": {
					"type": "string" as const
				}
			}
		}
	}
};

export async function fetchDeck(
	deckUrl: string, fetchFn: FetchFn
): Promise<DeckDefinition | undefined> {
	try {
		const response = await fetchFn(deckUrl);
		const deck = await response.json() as any;
		return deck;
	} catch (e) {
		console.error("Error fetching deck:", e);
	}
}