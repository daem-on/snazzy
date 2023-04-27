<script setup lang="ts">
import type { Card } from './Game.vue';

defineProps<{
	list: (Card | undefined)[],
	listName: string,
}>();

</script>

<template>
	<vue-draggable-container class="cardrow">
		<div v-for="(entry, index) in list" class="dropzone" :list="listName" :key="index" :index="index"
			:class="{ 'draggable-dropzone--occupied': entry !== undefined }">

			<div v-if="entry !== undefined" class="item" :cardId="entry.id">
				<div class="card">
					<p>
						{{ entry.text }} ({{ entry.id }})
					</p>
				</div>
			</div>

		</div>
	</vue-draggable-container>
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

.white.card {
	width: 160px;
}

.dropzone {
	width: 160px;
	height: 200px;
}

.dropzone:empty {
	outline: rgba(255, 255, 255, 0.445) 3px dashed;
	outline-offset: -12px;
}

.black {
	background-color: black;
	color: white;
}

.draggable-source--is-dragging .card {
	color: rgba(0,0,0,0);
	background: none;
	outline: white 3px dashed;
}

.draggable-mirror .card {
	transition: transform 0.2s;
	box-shadow: 0px 12px 29px -16px rgba(0,0,0,0.75);
	transform: scale(1.2);
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