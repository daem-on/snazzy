<script setup lang="ts">

defineProps<{
	icon: string,
}>();

</script>

<template>
	<button>
		<span class="material-icons">{{ icon }}</span>
		<slot></slot>
	</button>
</template>

<style scoped>
button {
	background: rgba(150, 78, 44, 0.5);
	font-family: inherit;
	color: white;
	text-align: center;
	border: none;
	text-transform: uppercase;
	border-radius: 10px;
	padding: 10px 16px;
	display: flex;
	flex-direction: row;
	justify-content: start;
	align-items: center;
	gap: 4px;
}

button:hover {
	background: rgba(180, 97, 59, 0.5);
}

button:active {
	/* background: rgba(150, 78, 44, 0.6); */
	outline: 2px solid white;
}
</style>