<script setup lang="ts">
import { computed } from 'vue';
import { PlayerStatus, type State } from '../../../server/shared-schema';

const props = defineProps<{
	stateHolder: State;
	updateKey: number;
}>();

const displayed = computed(() => {
	props.updateKey; // force reactivity
	const all = props.stateHolder.players.entries();
	return Array.from(all).filter(e => e[1].status !== PlayerStatus.Timeout);
});

const statusIcons: Record<PlayerStatus, string> = {
	[PlayerStatus.Playing]: "sms",
	[PlayerStatus.Played]: "check",
	[PlayerStatus.Timeout]: "signal_wifi_bad",
	[PlayerStatus.Czar]: "event_seat"
};

</script>

<template>
	<ul>
		<li v-for="[id, player] in displayed" :title="id">
			<span>{{ player.name }}</span>
			<span class="material-icons">
				{{ statusIcons[player.status] }}
			</span>
			<span>{{ player.points }}</span>
		</li>
	</ul>
</template>

<style scoped>
ul {
	display: flex;
	flex-direction: row;
	justify-content: start;
	align-items: center;
	width: 100%;
	overflow-x: auto;
	padding-top: 25px;
	gap: 10px;
	margin: 0;
	padding: 0;
}

li {
	list-style: none;
	background-color: black;
	color: white;
	padding: 6px 10px;
	flex-shrink: 0;
	
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 4px;
}
</style>