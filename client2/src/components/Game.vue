<script setup lang="ts">

import { computed, onBeforeUnmount, reactive, ref, shallowRef, type Ref } from "vue";
import type { State } from "../../../server/shared-schema";
import { Msg, Response } from "../../../shared-enums.ts";
import { connect } from "../connect.ts";
import HandView from "./HandView.vue";

export type Card = { id: number, text: string };

const stateHolder: Ref<State | null> = shallowRef(null);
const hand = reactive(new Set<Card>());
let winnerIndex: Ref<number | undefined> = ref(undefined);
let myId: Ref<string | undefined> = ref(undefined);
let updateKey = ref(0);

const iAmCzar = computed(() => {
	updateKey.value; // force update
	if (stateHolder.value == null || myId.value == undefined) return false;
	return stateHolder.value.playerStatus.get(myId.value) === "czar";
});

function resolveCard(id: number): Card {
	// placeholder
	return { id, text: "Card" };
}

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
	for (const id of ids) hand.add(resolveCard(id));
};
room.onMessage(Msg.Deal, setHand);
room.onMessage(Msg.DealPatch, setHand);

room.onMessage(Msg.GiveCard,
	({ hand: id }: { hand: number }) => hand.add(resolveCard(id))
);

room.onMessage(Msg.Winner,
	({ cardIndex }: { cardIndex: number }) => winnerIndex.value = cardIndex
);

room.onMessage(Msg.Error, ({ message }: { message: string }) => {
	console.error(message);
});

function startGame() {
	room.send(Response.startGame);
}

function playCard(cards: Card[]) {
	room.send(Response.playCard, { cardArray: cards.map(({ id }) => id) });
	for (const card of cards) hand.delete(card);
}

function pickCard(index: number) {
	room.send(Response.pickCard, { cardIndex: index });
}

onBeforeUnmount(() => room.leave());

</script>

<template>
	<div :key="updateKey">
		<ul v-if="stateHolder != null">
			<li v-for="player in stateHolder?.playerList">
				{{ player }}
				:: {{ stateHolder?.playerNames?.get(player) }}
				:: {{ stateHolder?.playerStatus?.get(player) }}
			</li>
		</ul>

		<div id="tabletop" class="cardrow">
			<div v-if="stateHolder?.call" class="black card">
				<p>
					{{ stateHolder.call.cardid.at(0) }}
				</p>
			</div>
			<div v-if="stateHolder?.responses?.length">
				<div v-for="(response, index) in stateHolder?.responses" class="white card" @click="pickCard(index)">
					<p>
						{{ response.cardid.join(", ") }}
					</p>
				</div>
			</div>
		</div>

		<button @click="startGame">Start</button>
		<div v-if="iAmCzar">You are the Card Czar.</div>
		<HandView :hand="hand" :hand-size="7" @play="playCard"></HandView>
	</div>
</template>

<style scoped>

.card {
	width: 120px;
	height: 160px;
	background-color: white;
	border-radius: 10px;
	margin: 8px;
	padding: 12px;
}

.black {
	background-color: black;
	color: white;
}

.white.card {
	width: 160px;
}

.card.winner {
	border: rgb(0, 140, 255) 3px solid;
	transition: transform 0.2s;
	box-shadow: 0px 12px 29px -16px rgba(0,0,0,0.75);
	transform: scale(1.2);
	z-index: 3;
}

a.card {
	background: none;
	text-align: center;
	color: white;
}

a.card p {
	font-weight: bold;
	border: white 3px solid;
	border-radius: 10px;
	padding: 30px 0;
}

.cardrow {
	display: flex;
	flex-direction: row;
	/* Bad for accessibility, good for looks */
	outline: none;
	flex-wrap: wrap;
	justify-content: center;
}


</style>
