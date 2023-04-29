<script setup lang="ts">

import type { DeckDefinition } from "@/DeckDefinition.ts";
import type { DroppableDroppedEvent, DroppableReturnedEvent, DroppableStartEvent, DroppableStopEvent } from "@shopify/draggable";
import { reactive, ref, watch } from "vue";
import CardContainer from "./CardContainer.vue";

const props = defineProps<{
	hand: Set<number>,
	handSize: number,
	czar: boolean,
	definition: DeckDefinition,
	cardsInRound: number
}>();

const emit = defineEmits<{
	(e: "play", cards: number[]): void
}>();

const picked: (number | undefined)[] = reactive([undefined]);
const hand: (number | undefined)[] = reactive([...props.hand]);

while (picked.length < props.cardsInRound) picked.push(undefined);
while (hand.length < props.handSize) hand.push(undefined);

const lists: Record<string, (number | undefined)[]> = {picked, hand};

const options = {
	draggable: ".item",
	dropzone: ".dropzone",
}

let dragging: DroppableStartEvent | undefined = undefined;
let currentTarget: DroppableDroppedEvent | undefined = undefined;

function start(e: DroppableStartEvent) {
	if (props.czar) return e.cancel();
	dragging = e;
}
function dropped(e: DroppableDroppedEvent) { currentTarget = e; }
function returned(e: DroppableReturnedEvent) { currentTarget = undefined; }
function stop(e: DroppableStopEvent) {
	try {
		if (currentTarget == undefined) {
			if (dragging != undefined && dragging.dropzone !== e.dropzone)
				throw new Error("No target, but different dropzone");
			return;
		}
	
		if (dragging == undefined || (currentTarget?.dropzone !== e.dropzone))
			throw new Error("Target has incorrect dropzone");
		
		const sourceList = lists[dragging.dropzone.getAttribute("list")!];
		const targetList = lists[currentTarget.dropzone.getAttribute("list")!];
		const sourceIndex = parseInt(dragging.dropzone.getAttribute("index")!);
		const targetIndex = parseInt(currentTarget.dropzone.getAttribute("index")!);
	
		if (targetList[targetIndex] != undefined)
			throw new Error("Target already occupied");
	
		const card = sourceList.splice(sourceIndex, 1, undefined)[0];
		targetList.splice(targetIndex, 1, card);
	} catch (e) {
		console.error(e);
	} finally {
		dragging = undefined;
		currentTarget = undefined;
	}
}

function returnToHand() {
	for (let i = 0; i < picked.length; i++) {
		const card = picked[i];
		if (card == undefined) continue;
		const index = hand.findIndex(x => x == undefined);
		if (index == -1) {
			console.error("Hand is full");
			return;
		}
		hand.splice(index, 1, card);
		picked.splice(i, 1, undefined);
	}
}

watch(props.hand, (newHand, oldHand) => {
	const added = [...newHand].filter(x => !oldHand.has(x));
	const removed = [...oldHand].filter(x => !newHand.has(x));
	for (const card of added) {
		const index = hand.findIndex(x => x == undefined);
		if (index == -1) {
			console.error("Hand is full");
			return;
		}
		hand.splice(index, 1, card);
	}
	for (const card of removed) {
		const index = hand.findIndex(x => x == card);
		if (index == -1) {
			console.error("Card not found in hand");
			return;
		}
		hand.splice(index, 1, undefined);
	}
});

watch(ref(props.cardsInRound), (newValue, oldValue) => {
	returnToHand();
	console.log("Cards in round changed", oldValue, newValue);
	picked.length = newValue;
	for (let i = 0; i < picked.length; i++) picked[i] = undefined;
});

function playPicked() {
	const cards = picked.filter(x => x != undefined) as number[];
	emit("play", cards);
	for (let i = 0; i < cards.length; i++) {
		const index = picked.findIndex(x => x == cards[i]);
		picked.splice(index, 1, undefined);
	}
}

</script>

<template>
	<vue-droppable :options="options" @droppable:start="start" @droppable:dropped="dropped" @droppable:returned="returned" @droppable:stop="stop">
		<CardContainer :list="picked" listName="picked" :definition="definition"></CardContainer>
		<button @click="playPicked">Play card</button>
		<hr />
		<CardContainer :list="hand" listName="hand" :definition="definition"></CardContainer>
	</vue-droppable>
</template>

