<script setup lang="ts">
import { computed, reactive } from 'vue';
import Card from './Card.vue';
import Button from './Button.vue';
import { PlayerStatus } from '../../../server/shared-schema';

const props = defineProps<{
	hand: Set<number>,
	status?: PlayerStatus,
	cardsInRound: number
}>();

const emit = defineEmits<{
	(e: "play", cards: number[]): void
}>();

const picked: number[] = reactive([]);

const cantPlay = computed(() => props.status !== PlayerStatus.Playing);

function pick(card: number) {
	if (props.status !== PlayerStatus.Playing) return;
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
	<div class="buttons row">
		<Button icon="front_hand" @click="playCards" :disabled="picked.length !== props.cardsInRound">Play card</Button>
		<Button icon="undo" @click="picked.length = 0" :disabled="picked.length === 0">Clear picked</Button>
	</div>
	<div class="hand row">
		<Card
			v-for="card in hand"
			:key="card"
			:id="card"
			:class="{picked: picked.includes(card), disabled: cantPlay}"
			type="white"
			@click="pick(card)"
		/>
		<div v-if="cantPlay" class="blocker">
			<template v-if="status === PlayerStatus.Czar">
				<div><span class="material-icons">event_seat</span></div>
				You are the Card Czar.
			</template>
			<template v-if="status === PlayerStatus.Played">
				<div><span class="material-icons">done_all</span></div>
				You have played this turn.
			</template>
		</div>
	</div>
</template>

<style scoped>
.row {
	display: flex;
	flex-direction: row;
	justify-content: start;
	align-items: center;
}

.hand {
	width: 100%;
	overflow-x: auto;
	padding-top: 25px;
}

.row .card {
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

.buttons {
	gap: 10px;
	margin: 10px;
}
</style>