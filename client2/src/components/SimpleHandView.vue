<script setup lang="ts">
import { computed, reactive } from 'vue';
import Card from './Card.vue';

const props = defineProps<{
	hand: Set<number>,
	status?: string,
	cardsInRound: number
}>();

const emit = defineEmits<{
	(e: "play", cards: number[]): void
}>();

const picked: number[] = reactive([]);

const cantPlay = computed(() => props.status !== "playing");

function pick(card: number) {
	if (props.status !== "playing") return;
	if (picked.includes(card)) picked.splice(picked.indexOf(card), 1);
	else if (picked.length >= props.cardsInRound) return;
	else picked.push(card);
}

function playCards() {
	if (picked.length !== props.cardsInRound) return;
	emit("play", [...picked]);
	picked.length = 0;
}

</script>

<template>
	<div class="buttons">
		<button @click="playCards">
			<span class="material-icons">front_hand</span>
			Play card
		</button>
		<button @click="picked.length = 0">
			<span class="material-icons">undo</span>
			Clear picked
		</button>
	</div>
	<div class="row">
		<Card
			v-for="card in hand"
			:key="card"
			:id="card"
			:class="{picked: picked.includes(card), disabled: cantPlay}"
			type="white"
			@click="pick(card)"
		/>
		<div v-if="cantPlay" class="blocker">
			<template v-if="status === 'czar'">You are the Card Czar.</template>
			<template v-if="status === 'played'">You have played this turn.</template>
		</div>
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
	width: 100%;
	box-sizing: border-box;
	background-color: white;
	text-align: center;
	font-size: 1.5em;
	padding: 20px;
	border-radius: 10px;
}

button {
	background: white;
	text-align: center;
	font-weight: bold;
	border: white 3px solid;
	border-radius: 10px;
	padding: 10px 16px;
}

.buttons {
	display: flex;
	flex-direction: row;
	justify-content: start;
	align-items: center;
	gap: 10px;
	margin: 10px;
}
</style>