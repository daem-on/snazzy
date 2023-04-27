export enum Msg {
	Deal,
	Update,
	DealPatch,
	GiveCard,
	Czar,
	NewRound,
	Reveal,
	Winner,
	Over,
	Restart,
	Error,
	Chat
}

export enum Response {
	name,
	pickCard,
	playCard,
	debug,
	startGame,
	reconnect,
	chat
}
