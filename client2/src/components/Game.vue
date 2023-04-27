<script setup lang="ts">

import { onBeforeUnmount, reactive, shallowRef, type Ref, getCurrentInstance, ref } from "vue";
import type { State } from "../../../server/shared-schema";
import { Msg, Response } from "../../../shared-enums.ts";
import { connect } from "../connect.ts";
import HandView from "./HandView.vue";

export type Card = { id: number, text: string };

const hand = reactive(new Set<Card>());
const stateHolder: Ref<State | null> = shallowRef(null);
let winnerIndex: number | undefined = undefined;
let updateKey = ref(0);

function resolveCard(id: number): Card {
	// placeholder
	return { id, text: "Card" };
}

const room = await connect();
room.send(Response.name, { text: "Username" });

room.onStateChange(state => {
	// Colyseus has its own state management, so we need a forced update
	stateHolder.value = state;
	updateKey.value++;
});

const setHand = ({ hand: ids }: { hand: number[] }) => {
	hand.clear();
	for (const id of ids) hand.add(resolveCard(id));
};
room.onMessage(Msg.Deal, setHand);
room.onMessage(Msg.DealPatch, setHand);

room.onMessage(Msg.GiveCard,
	({ hand: id }: { hand: number }) => hand.add(resolveCard(id))
);

room.onMessage(Msg.Winner,
	({ cardIndex }: { cardIndex: number }) => winnerIndex = cardIndex
);

function startGame() {
	room.send(Response.startGame);
}

function playCard(cards: Card[]) {
	room.send(Response.playCard, { cardArray: cards.map(({ id }) => id) });
	for (const card of cards) hand.delete(card);
}

onBeforeUnmount(() => room.leave());

</script>

<template>
	<div :key="updateKey">
		<ul v-if="stateHolder != null">
			<li v-for="player in stateHolder?.playerList">
				{{ player }} :: {{ stateHolder?.playerNames?.get(player) }}
			</li>
		</ul>
		<button @click="startGame">Start</button>
		<HandView :hand="hand" :hand-size="7" @play="playCard"></HandView>
	</div>
</template>

<style scoped></style>
