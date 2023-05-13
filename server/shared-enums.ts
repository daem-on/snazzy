export enum Msg {
	Deal,
	DealPatch,
	GiveCard,
	NewRound,
	Over,
	Restart,
	Chat
}

export enum PlayerStatus {
	Playing, Played, Czar, Timeout
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
