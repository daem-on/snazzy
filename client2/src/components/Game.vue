<script setup lang="ts">

import { computed, onBeforeUnmount, reactive, ref, shallowRef, watch, type Ref } from "vue";
import { fetchDeck, type DeckDefinition } from "../../../server/fetchDeck.ts";
import { Msg, Response } from "../../../server/shared-enums.ts";
import type { State } from "../../../server/shared-schema";
import { connect } from "../connect.ts";
import Card from "./Card.vue";
import HandView from "./HandView.vue";

export type CardType = { id: number, text: string };

const stateHolder: Ref<State | null> = shallowRef(null);
const hand = reactive(new Set<number>());
const localWinner: Ref<number | undefined> = ref(undefined);
const deckDefinition: Ref<DeckDefinition | undefined> = ref(undefined);
const cardsInRound = ref(1);
let myId: Ref<string | undefined> = ref(undefined);
let updateKey = ref(0);

const iAmCzar = computed(() => {
	updateKey.value; // force update
	if (stateHolder.value == null || myId.value == undefined) return false;
	return stateHolder.value.players.get(myId.value)?.status === "czar";
});

watch(updateKey, () => {
	if (stateHolder.value?.responses.toArray().some(r => r.winner))
		localWinner.value = undefined;
});

watch(
	() => { updateKey.value; return stateHolder.value?.deckUrl; },
	async (newUrl, oldUrl) => {
		if (newUrl == undefined) return;
		deckDefinition.value = await fetchDeck(newUrl, fetch);
	}
);

watch(updateKey, () => {
	cardsInRound.value = stateHolder.value?.cardsInRound ?? 1;
});

const room = await connect();
myId.value = room.sessionId;
room.send(Response.name, { text: "Username" });

room.onStateChange(state => {
	// Colyseus has its own state management, so we need a forced update
	stateHolder.value = state;
	updateKey.value++;
});

const setHand = ({ hand: ids }: { hand: number[] }) => {
	hand.clear();
	for (const id of ids) hand.add(id);
};
room.onMessage(Msg.Deal, setHand);
room.onMessage(Msg.DealPatch, setHand);

room.onMessage(Msg.GiveCard,
	({ hand: id }: { hand: number }) => hand.add(id)
);

room.onError((code, message) => {
	console.error(code, message);
});

function startGame() {
	room.send(Response.startGame);
}

function playCard(cards: number[]) {
	room.send(Response.playCard, { cardArray: cards });
	for (const card of cards) hand.delete(card);
}

function pickCard(index: number) {
	if (!iAmCzar.value) return;
	room.send(Response.pickCard, { cardIndex: index });
	localWinner.value = index;
}

onBeforeUnmount(() => room.leave());

</script>

<template>
	<div :key="updateKey">
		<ul v-if="stateHolder != null">
			<li v-for="[id, player] in stateHolder?.players.entries()">
				{{ id }}
				:: {{ player.name }}
				:: {{ player.status }}
				:: {{ player.points }}
			</li>
		</ul>

		<div id="tabletop" class="cardrow" v-if="deckDefinition">
			<Card v-if="stateHolder?.callId" :id="stateHolder.callId" :definition="deckDefinition" type="black" />
			<div v-if="stateHolder?.responses?.length" class="innerrow">
				<Card
					v-for="(response, index) in stateHolder?.responses"
					class="white card"
					@click="pickCard(index)"
					:id="stateHolder.callId"
					:definition="deckDefinition"
					:winner="response.winner || localWinner === index"
					:interpolate-ids="response.cardid.toArray()"
					:hide="stateHolder.reveal == false"
					type="played"
					/>
			</div>
		</div>

		<button @click="startGame">Start</button>
		<div v-if="deckDefinition && stateHolder">
			<div v-if="iAmCzar">You are the Card Czar.</div>
			<HandView :cards-in-round="cardsInRound" :czar="iAmCzar" :hand="hand" :hand-size="7" :definition="deckDefinition" @play="playCard"></HandView>
		</div>
	</div>
</template>

<style scoped>
.cardrow {
	display: flex;
	flex-direction: row;
	/* Bad for accessibility, good for looks */
	outline: none;
	flex-wrap: wrap;
	justify-content: center;
}

.cardrow .innerrow {
	display: contents;
}
</style>
