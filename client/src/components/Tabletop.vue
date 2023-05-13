<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import { PlayerStatus, type State } from "../../../server/shared-schema";
import Card from "./Card.vue";

const props = defineProps<{
	stateHolder: State;
	updateKey: number;
	myStatus?: PlayerStatus;
}>();

const emit = defineEmits<{
	(e: "pickCard", index: number): void;
}>();

const state = reactive({
	callId: props.stateHolder.callId,
	responses: props.stateHolder.responses,
	reveal: props.stateHolder.reveal
});
const localWinner = ref<number | undefined>(undefined);

// update state when stateHolder changes
watch(() => props.updateKey, () => {
	if (props.stateHolder?.responses.toArray().some(r => r.winner))
		localWinner.value = undefined;
	state.callId = props.stateHolder.callId;
	state.responses = props.stateHolder.responses;
	state.reveal = props.stateHolder.reveal;
});

function pickCard(index: number) {
	if (props.myStatus !== PlayerStatus.Czar || !props.stateHolder.reveal) return;
	emit("pickCard", index);
	localWinner.value = index;
}

</script>

<template>
	<div id="tabletop" class="cardrow">
		<Card v-if="state.callId != undefined" :id="state.callId" type="black" />
		<div v-if="state.responses.length" class="innerrow">
			<Card
				v-for="(response, index) in state.responses"
				class="white card"
				@click="pickCard(index)"
				:key="response.playedBy"
				:id="state.callId"
				:winner="response.winner || localWinner === index"
				:interpolate-ids="response.cardid.toArray()"
				:hide="state.reveal == false"
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