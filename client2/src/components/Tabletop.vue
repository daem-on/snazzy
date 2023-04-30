<script setup lang="ts">
import { ref, watch } from "vue";
import type { State } from "../../../server/shared-schema";
import Card from "./Card.vue";

const props = defineProps<{
	stateHolder: State;
	updateKey: number;
	myStatus?: string;
}>();

const emit = defineEmits<{
	(e: "pickCard", index: number): void;
}>();

const localWinner = ref<number | undefined>(undefined);
watch(ref(props.updateKey), () => {
	if (props.stateHolder?.responses.toArray().some(r => r.winner))
		localWinner.value = undefined;
});

function pickCard(index: number) {
	if (props.myStatus !== "czar" || !props.stateHolder.reveal) return;
	emit("pickCard", index);
	localWinner.value = index;
}

</script>

<template>
	<div id="tabletop" class="cardrow">
		<Card v-if="stateHolder.callId" :id="stateHolder.callId" type="black" />
		<div v-if="stateHolder.responses?.length" class="innerrow">
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
</template>

<style scoped>
.cardrow {
	display: flex;
	flex-direction: row;
	/* Bad for accessibility, good for looks */
	outline: none;
	flex-wrap: nowrap;
	justify-content: start;
	overflow-x: auto;
}

.cardrow div {
	flex-shrink: 0;
}

#tabletop {
	padding: 30px 20px;
}

.cardrow .innerrow {
	display: contents;
}
</style>