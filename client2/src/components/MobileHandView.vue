<script setup lang="ts">
import { computed, reactive } from 'vue';
import Card from './Card.vue';

const props = defineProps<{
	hand: Set<number>,
	status: string | undefined,
	cardsInRound: number
}>();

const emit = defineEmits<{
	(e: "play", cards: number[]): void
}>();

const picked: number[] = reactive([]);

const iAmCzar = computed(() => props.status === "czar");

function pick(card: number) {
	if (props.status !== "playing") return;
	if (picked.includes(card)) picked.splice(picked.indexOf(card), 1);
	else if (picked.length >= props.cardsInRound) return;
	else picked.push(card);
}

function playCards() {
	emit("play", [...picked]);
	picked.length = 0;
}

</script>

<template>
	<button @click="playCards">Play cards</button>
	<button @click="picked.length = 0">Clear picked</button>
	<div class="row">
		<Card
			v-for="card in hand"
			:key="card"
			:id="card"
			:class="{picked: picked.includes(card), disabled: iAmCzar}"
			type="white"
			@click="pick(card)"
		/>
		<div v-if="iAmCzar" class="blocker">You are the Card Czar.</div>
	</div>
</template>

<style scoped>
.row {
	display: flex;
	flex-direction: row;
	justify-content: start;
	align-items: center;
	width: 100%;
	overflow-x: auto;
	padding-top: 25px;
}

.row div {
	flex-shrink: 0;
}

.card {
	transition: transform 0.1s ease-out;
}

.disabled {
	opacity: 0.6;
}

.picked {
	transform: translate(0, -20px);
	box-shadow: 0px 12px 29px -16px rgba(0,0,0,0.75);
}

.blocker {
	position: absolute;
	width: 95%;
	box-sizing: border-box;
	background-color: white;
	text-align: center;
	font-size: 1.5em;
	padding: 20px;
	border-radius: 10px;
}
</style>