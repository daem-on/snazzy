<script setup lang="ts">
import type { DeckDefinition } from "@/DeckDefinition.ts";

const props = defineProps<{
	type: "black" | "white" | "played",
	id: number,
	definition: DeckDefinition,
	winner?: boolean,
	interpolateIds?: number[],
	hide?: boolean
}>();

function getText() {
	if (props.hide) return "";
	switch (props.type) {
		case "black":
			return props.definition.calls[props.id].join("____");
		case "white":
			return props.definition.responses[props.id][0];
		case "played":
			const list = props.definition.calls[props.id];
			if (!list || !props.interpolateIds || list.length-1 !== props.interpolateIds.length) {
				return "ERROR";
			}
			return list.map((item, index) => {
				const id = props.interpolateIds![index];
				if (id === undefined) return item;
				const response = props.definition.responses[id][0];
				return item + response;
			}).join("");
	}
}

</script>

<template>
	<div class="card" :class="{ white: type === 'played', black: type === 'black', winner }">
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
	box-shadow: 0px 12px 29px -16px rgba(0, 0, 0, 0.75);
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
</style>