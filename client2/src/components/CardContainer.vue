<script setup lang="ts">
import Card from "./Card.vue";

defineProps<{
	list: (number | undefined)[],
	listName: string
}>();

</script>

<template>
	<vue-draggable-container class="cardrow">
		<div v-for="(entry, index) in list" class="dropzone" :list="listName" :key="index" :index="index"
			:class="{ 'draggable-dropzone--occupied': entry !== undefined }">

			<div v-if="entry !== undefined" class="item" :cardId="entry">
				<Card :id="entry" type="white" />
			</div>

		</div>
	</vue-draggable-container>
</template>

<style scoped>
.dropzone {
	width: 160px;
	height: 200px;
}

.dropzone:empty {
	outline: rgba(255, 255, 255, 0.445) 3px dashed;
	outline-offset: -12px;
}

.draggable-source--is-dragging .card {
	color: rgba(0,0,0,0);
	background: none;
	outline: white 3px dashed;
}

.card {
	transition: transform 0.1s ease-in-out;
}

.draggable-mirror .card {
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