<script setup lang="ts">

import { computed, onBeforeUnmount, reactive, ref, shallowRef, watch, type Ref, provide } from "vue";
import { fetchDeck, type DeckDefinition } from "../../../server/fetchDeck.ts";
import { Msg, Response } from "../../../server/shared-enums.ts";
import type { State } from "../../../server/shared-schema";
import { connect } from "../connect.ts";
import Card from "./Card.vue";
import HandView from "./HandView.vue";
import MobileHandView from "./MobileHandView.vue";

export type CardType = { id: number, text: string };

const stateHolder: Ref<State | null> = shallowRef(null);
const hand = reactive(new Set<number>());
const localWinner: Ref<number | undefined> = ref(undefined);
const deckDefinition: Ref<DeckDefinition | undefined> = ref(undefined);
const cardsInRound = ref(1);
let myId: Ref<string | undefined> = ref(undefined);
let updateKey = ref(0);

provide("deckDefinition", deckDefinition);

const myStatus = computed(() => {
	updateKey.value; // force update
	if (stateHolder.value == null || myId.value == undefined) return undefined;
	return stateHolder.value.players.get(myId.value)?.status;
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
	if (myStatus.value !== "czar" || !stateHolder.value?.reveal) return;
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
			<Card v-if="stateHolder?.callId" :id="stateHolder.callId" type="black" />
			<div v-if="stateHolder?.responses?.length" class="innerrow">
				<Card
					v-for="(response, index) in stateHolder?.responses"
					class="white card"
					@click="pickCard(index)"
					:id="stateHolder.callId"
					:winner="response.winner || localWinner === index"
					:interpolate-ids="response.cardid.toArray()"
					:hide="stateHolder.reveal == false"
					type="played"
					/>
			</div>
		</div>

		<button @click="startGame">Start</button>
		<div v-if="deckDefinition && stateHolder">
			<MobileHandView :cards-in-round="cardsInRound" :status="myStatus" :hand="hand" @play="playCard"></MobileHandView>
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

#tabletop {
	padding: 25px 0;
}

.cardrow .innerrow {
	display: contents;
}
</style>
