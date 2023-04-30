<script setup lang="ts">

import type { Room } from "colyseus.js";
import { computed, onBeforeUnmount, provide, reactive, ref, shallowRef, watch, type Ref } from "vue";
import { fetchDeck, type DeckDefinition } from "../../../server/fetchDeck.ts";
import { Msg, Response } from "../../../server/shared-enums.ts";
import { PlayerStatus, type State } from "../../../server/shared-schema";
import Button from "./Button.vue";
import HandView from "./HandView.vue";
import PlayerList from "./PlayerList.vue";
import SimpleHandView from "./SimpleHandView.vue";
import Tabletop from "./Tabletop.vue";

export type CardType = { id: number, text: string };

const props = defineProps<{
	room: Room<State>;
	username: string;
}>();

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

const started = computed(() => {
	updateKey.value; // force update
	return (stateHolder.value?.roundNumber ?? 0) <= 0;
})

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

const room = props.room;
myId.value = room.sessionId;
room.send(Response.name, { text: props.username });

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

room.onMessage(Msg.NewRound, () => {});

room.onError((code, message) => {
	console.error(code, message);
});

room.onLeave(() => {
	alert("You have been disconnected from the server.");
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
	<template v-if="started">
		<div class="column">
			<div class="waiting">
				<h2>Snazzy.</h2>
				<p>The game has not started yet.</p>
				<ul>
					<li v-for="[id, player] in stateHolder?.players">
						{{ player.name }} ({{ id }})
						<span v-if="player.status === PlayerStatus.Timeout">t/o</span>
					</li>
				</ul>
			</div>
			<Button icon="play_circle" @click="startGame" v-if="stateHolder?.host === myId">Start</Button>
		</div>
	</template>
	<template v-else>
		<div class="margin-10">
			<PlayerList v-if="stateHolder != null" :state-holder="stateHolder" :update-key="updateKey" />
		</div>

		<div v-if="deckDefinition && stateHolder" class="center">
			<Tabletop :my-status="myStatus" :update-key="updateKey" :state-holder="stateHolder" @pick-card="pickCard" />
		</div>
		<div v-if="deckDefinition">
			<SimpleHandView v-if="useSimpleView" :cards-in-round="cardsInRound" :status="myStatus" :hand="hand" @play="playCard"></SimpleHandView>
			<HandView v-else :cards-in-round="cardsInRound" :status="myStatus" :hand="hand" @play="playCard"></HandView>
		</div>
		<div class="center margin-10">
			<Button icon="autorenew" @click="useSimpleView = !useSimpleView">Switch view</Button>
		</div>
	</template>
</template>

<style scoped>
.margin-10 {
	margin: 10px;
}

.center {
	display: flex;
	justify-content: center;
}

.column {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin: 10px;
	gap: 10px;
}

.waiting {
	background-color: white;
	padding: 2em;
	border-radius: 10px;
}

.waiting h2 {
	margin: 6px 0;
}

.waiting ul {
	margin: 0;
	padding: 0;
	list-style: none;
}

.waiting li {
	border-top: 1px solid black;
	padding: 4px 0;
}
</style>
