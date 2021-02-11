var ui = new Vue({
	el: '#ui',
	data: {
		ready: false,
		state: {
			roundNumber: 0,
			playerList: [],
		},
		self: null,
		icon: {
			"playing": "sms",
			"played": "check",
			"timeout": "signal_wifi_bad",
			"czar": "event_seat"
		}
	},
})