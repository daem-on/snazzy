<script setup lang="ts">

import { computed, onBeforeUnmount, provide, reactive, ref, shallowRef, watch, type Ref } from "vue";
import { fetchDeck, type DeckDefinition } from "../../../server/fetchDeck.ts";
import { Msg, Response } from "../../../server/shared-enums.ts";
import type { State } from "../../../server/shared-schema";
import { connect } from "../connect.ts";
import HandView from "./HandView.vue";
import SimpleHandView from "./SimpleHandView.vue";
import Tabletop from "./Tabletop.vue";
import PlayerList from "./PlayerList.vue";

export type CardType = { id: number, text: string };

const stateHolder: Ref<State | null> = shallowRef(null);
const hand = reactive(new Set<number>());
const deckDefinition: Ref<DeckDefinition | undefined> = ref(undefined);
const cardsInRound = ref(1);
let myId: Ref<string | undefined> = ref(undefined);
let updateKey = ref(0);
let useSimpleView = ref(localStorage.getItem("useSimpleView") === "true");

provide("deckDefinition", deckDefinition);

const myStatus = computed(() => {
	updateKey.value; // force update
	if (stateHolder.value == null || myId.value == undefined) return undefined;
	return stateHolder.value.players.get(myId.value)?.status;
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

watch(useSimpleView,
	() => localStorage.setItem("useSimpleView", useSimpleView.value.toString())
);

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

room.onMessage(Msg.Over, ({winner}: {winner: string}) => {
	const name = (winner === myId.value)
		? "You"
		: stateHolder.value?.players.get(winner)?.name;
	alert(`Game over! ${name} won!`);
});

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
	room.send(Response.pickCard, { cardIndex: index });
}

onBeforeUnmount(() => room.leave());

</script>

<template>
	<div :key="updateKey">
		<div class="player-list">
			<PlayerList v-if="stateHolder != null" :state-holder="stateHolder" :update-key="updateKey" />
		</div>

		<div v-if="deckDefinition && stateHolder" class="center">
			<Tabletop :my-status="myStatus" :update-key="updateKey" :state-holder="stateHolder" @pick-card="pickCard" />
		</div>

		<button @click="startGame" v-if="stateHolder?.host === myId">Start</button>
		<button @click="useSimpleView = !useSimpleView">Switch view</button>
		<div v-if="deckDefinition && stateHolder">
			<SimpleHandView v-if="useSimpleView" :cards-in-round="cardsInRound" :status="myStatus" :hand="hand" @play="playCard"></SimpleHandView>
			<HandView v-else :cards-in-round="cardsInRound" :status="myStatus" :hand="hand" @play="playCard"></HandView>
		</div>
	</div>
</template>

<style scoped>
.player-list {
	margin: 10px;
}

.center {
	display: flex;
	justify-content: center;
}
</style>
