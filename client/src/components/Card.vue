<script setup lang="ts">
import type { DeckDefinition } from "@/DeckDefinition";
import { inject, type Ref } from "vue";

const props = defineProps<{
	type: "black" | "white" | "played",
	id: number,
	winner?: boolean,
	interpolateIds?: number[],
	hide?: boolean
}>();

const definition: Ref<DeckDefinition | undefined> = inject("deckDefinition")!;

function getText() {
	if (props.hide) return "";
	const def = definition.value;
	if (def == undefined) return "";
	switch (props.type) {
		case "black":
			return def.calls[props.id].join(" ____ ");
		case "white":
			return def.responses[props.id][0];
		case "played":
			const list = def.calls[props.id];
			if (!list || !props.interpolateIds || list.length-1 !== props.interpolateIds.length) {
				return "ERROR";
			}
			return list.map((item, index) => {
				const id = props.interpolateIds![index];
				if (id === undefined) return item;
				const response = def.responses[id][0];
				return item + response;
			}).join("");
	}
}

</script>

<template>
	<div class="card" :class="{ white: type === 'played', black: type === 'black', winner, hide }">
		<p>
			{{ getText() }}
		</p>
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
	overflow-wrap: break-word;
	/* hyphens: auto; */
	overflow-y: hidden;
	white-space: pre-line;

	transform: rotateY(0deg);
	transition: transform 0.2s ease-in-out;
}

.card p {
	margin: 4px 0;
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
	transition: transform 0.1s;
	box-shadow: 0px 10px 20px -12px rgba(0, 0, 0, 0.75);
	transform: scale(1.2);
	z-index: 3;
}

.hide {
	transform: rotateY(180deg);
}

</style>