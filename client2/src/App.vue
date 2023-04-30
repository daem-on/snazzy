<script setup lang="ts">
import type { Room } from "colyseus.js";
import { ref, shallowRef } from "vue";
import type { State } from "../../server/shared-schema";
import Button from "./components/Button.vue";
import type { CreateRoomOptions } from "./components/CreateForm.vue";
import CreateForm from "./components/CreateForm.vue";
import Game from "./components/Game.vue";
import { checkRoomExists, create, join } from "./connect.ts";

const room = shallowRef<Room<State> | null>(null);
const exists = ref(false);
const username = ref("Username");

const roomId = window.location.hash.slice(1);

async function init() {
	if (window.location.hash.length > 1) {
		exists.value = await checkRoomExists(roomId);
	}
}

async function joinIfExists() {
	if (exists.value) room.value = await join(roomId);
}

async function createRoom(options: CreateRoomOptions) {
	room.value= await create(options);
	exists.value = true;
	window.location.hash = options.title;
}

init();

</script>

<template>
	<template v-if="!exists">
		<div class="page">
			<h1>Room does not exist</h1>
			<input type="text" v-model="username" placeholder="Username" />
			<CreateForm @create="createRoom"></CreateForm>
		</div>
	</template>
	<template v-else-if="room == null">
		<div class="page">
			<input type="text" v-model="username" placeholder="Username" />
		</div>
		<Button icon="done" @click="joinIfExists">Join</Button>
	</template>
	<template v-else>
		<Game :room="room" :username="username"></Game>
	</template>
</template>

<style scoped>
.page {
	background: white;
	padding: 1em;
}

input {
	margin: 0.5em;
}
</style>
