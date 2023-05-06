<script setup lang="ts">
import type { Room } from "colyseus.js";
import { ref, shallowRef } from "vue";
import type { State } from "../../server/shared-schema";
import Button from "./components/Button.vue";
import type { CreateRoomOptions } from "./components/CreateForm.vue";
import CreateForm from "./components/CreateForm.vue";
import Game from "./components/Game.vue";
import { checkRoomExists, create, join } from "./connect";

const room = shallowRef<Room<State> | null>(null);
const exists = ref<boolean | undefined>(undefined);
const username = ref("Username");
const connecting = ref(false);

const hashExists = window.location.hash.length > 1;
const roomId = window.location.hash.slice(1);

async function init() {
	if (hashExists) {
		exists.value = await checkRoomExists(roomId);
	} else {
		exists.value = false;
	}
}

async function joinIfExists() {
	if (exists.value && !connecting.value) {
		try {
			connecting.value = true;
			room.value = await join(roomId);
		} finally {
			connecting.value = false;
		}
	}
}

function joinSubmit() {
	joinIfExists();
	return false;
}

async function createRoom(options: CreateRoomOptions) {
	if (connecting.value) return;
	try {
		connecting.value = true;
		room.value = await create(options);
		exists.value = true;
		window.location.hash = options.title;
	} finally {
		connecting.value = false;
	}
	
}

init();

</script>

<template>
	<template v-if="exists == undefined">Checking...</template>
	<template v-else-if="!exists">
		<div class="page">
			<h1 v-if="hashExists">{{ roomId }} does not exist</h1>
			<h1 v-else>Create room</h1>
			<label>
				Username
				<input type="text" v-model="username" />
			</label>
			<CreateForm @create="createRoom"></CreateForm>
		</div>
	</template>
	<template v-else-if="room == null">
		<div class="page">
			<form @submit="joinSubmit">
				<label>
					Username
					<input type="text" v-model="username" />
				</label>
				<Button icon="done" black @click="joinIfExists">Join</Button>
			</form>
		</div>
	</template>
	<template v-else>
		<Game :room="room" :username="username"></Game>
	</template>
</template>

<style scoped>
.page {
	background: white;
	padding: 1em;
	max-width: 20rem;
	margin: 0 auto;
}

input {
	margin: 0.5rem 0;
	padding: 0.5rem;
	border-radius: 0.5rem;
	border: 1px solid #ccc;
}

label {
	display: flex;
	flex-direction: column;
}
</style>
