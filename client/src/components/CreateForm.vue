<script setup lang="ts">
import { reactive } from 'vue';
import Button from './Button.vue';

const emit = defineEmits<{
	(e: "create", options: CreateRoomOptions): void
}>();

const defaultName = 
	window.location.hash.slice(1)
	|| "Room" + Math.floor(Math.random() * 1000);

export type CreateRoomOptions = {
	title: string,
	deck: string,
	dealNumber?: number,
	winLimit?: number,
};

const options: CreateRoomOptions = reactive({
	title: defaultName,
	deck: "https://gist.githubusercontent.com/daem-on/82632a44fece3017f45e4feb5b87bc4a/raw/494df51787a05fbe73b9b023f864fe3f0c7ba595/12b.json",
	dealNumber: undefined,
	winLimit: undefined,
})

function create() {
	// fix v-model empty numbers
	emit("create", {
		title: options.title,
		deck: options.deck,
		dealNumber: options.dealNumber || undefined,
		winLimit: options.winLimit || undefined,
	});
}

</script>

<template>
	<div class="room-options">
		<label>
			Title
			<input type="text" v-model="options.title" />
		</label>
		<label>
			Deck URL
			<input type="text" v-model="options.deck" />
		</label>
		<label>
			Deal Number
			<input type="number" v-model.number="options.dealNumber" />
		</label>
		<label>
			Win Limit
			<input type="number" v-model.number="options.winLimit" />
		</label>
	</div>
	<Button icon="login" black @click="create">Create</Button>
</template>

<style scoped>
.room-options {
	display: flex;
	flex-direction: column;
}

.room-options input {
	margin: 0.5rem 0;
	padding: 0.5rem;
	border-radius: 0.5rem;
	border: 1px solid #ccc;
}

.room-options label {
	display: flex;
	flex-direction: column;
}

</style>