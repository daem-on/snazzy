var url = window.location.host
var client = new Colyseus.Client('ws://'+url);
var room;
var reference = {calls: [], responses: []};
var iAmCzar = false;
var cardsInRound = 1;
var dropzonesCreated = false;

const cardItem = `<div class="item">
		<div class="card">
		<p></p>
		</div></div>`
const cardElement = `<div class="white card"></div>`
const dropzoneItem = `<div class="dropzone"></div>`

if (window.location.hash) {
	var arr = window.location.hash.slice(1).split("&")
	if (arr.length > 1) {
		connect({title: arr[0], deck: arr[1]});
		loadReferences(arr[1]);
	} else {
		connect({title: arr[0]});
	}
} else {
	window.location.replace("/about.html");
}

async function connect(settings) {
	try {
		const name = prompt("Choose a username.", "Username");

		room = await client.joinOrCreate("my_room", settings)
		console.log("Joined", room.name, "as", room.sessionId);
		ui.ready = true;
		ui.self = room.sessionId;
	
		room.send({type: "name", text: name});
		room.onMessage(onMessage);
		room.onStateChange(onStateChange);
		room.onLeave(onLeave)
	} catch (e) {
		console.log("JOIN ERROR", e);
	}
}

function onStateChange(state) {
	// Jesus christ vue do you ever work
	ui.state = state;
	ui.$forceUpdate();
	console.log("STT");
	getReferencesFromServer();
}

function customCardItem(index, text) {
	return `<div class="white card" 
	onclick="pick(${index})" index="${index}">
	<p>${text}</p></div>`
}

function pick(index) {
	console.log("You picked " + index);
	if (!room || !room.state.reveal) return;
	room.send({type: "pickCard", cardIndex: index})
}

function remove() {
	if (iAmCzar ||
		room.state.playerStatus[room.sessionId] != "playing") return;
	var played = [];
	$("#submit .dropzone .item").toArray().forEach(card => {
		$(card).parent().removeClass("draggable-dropzone--occupied");
		played.push(Number.parseInt($(card).attr("cardid")));
		$(card).remove();
	});
	if (played.length < 1) return;
	playCard(played);
}

function playCard(array) {
	if (!room) return;
	room.send({type: "playCard", cardArray: array})
}

function revealCards() {
	// clear the tabletop
	$("#tabletop .white.card").remove();

	const tabletop = $("#tabletop");
	room.state.responses.forEach((response, index) => {
		tabletop.append(customCardItem(index, renderCard(response)));
	})
	tabletop.find(".white.card").toArray().forEach(card => {
		card.animate(
			[{ transform: "rotateY(180deg)" }, 
			{ transform: "rotateY(0deg)" }], 
			{ duration: 200, 
			easing: "ease-in-out"})
	})
}

function renderCard(response) {
	let array = reference.calls[room.state.call.cardid[0]];
	let text = "";
	array.forEach((snippet, index) => {
		text += snippet;
		if (response.cardid[index])
			text += reference.responses[response.cardid[index]];
	});
	return text;
}

function createSlotWithCard(id, text) {
	let el = $(dropzoneItem).addClass("draggable-dropzone--occupied")
		.append($(cardItem).attr("cardid", id));
	el.find("p").html(text);
	return el[0];
}

function fillSlotWithCard(slot, id, text) {
	let el = $(slot).addClass("draggable-dropzone--occupied")
		.append($(cardItem).attr("cardid", id)).find("p").html(text)
	return el[0];
}

function addToHand(id, text) {
	let dropzone = $("#hand .dropzone:not(.draggable-dropzone--occupied)");
	if (!dropzone.length) console.error("No dropzone for that!");
	else fillSlotWithCard(dropzone[0], id, text);
}

const draggable = new Draggable.Droppable($(".container").toArray(), {
	draggable: '.item',
  	dropzone: '.dropzone'
});

draggable.on("drag:stop", () => {
	$(".draggable--original")[0].animate(
		[{ transform: "scale(1.2)" }, 
		{ transform: "scale(1)" }], 
		{ duration: 200, 
		easing: "ease-in"})
})

draggable.on("drag:start", event => {
	if (iAmCzar) event.cancel();
})

function onMessage(msg) {
	console.log("MSG:", msg);

	if (msg.t == 0) { // Deal
		msg.hand.forEach(card => {
			addToHand(card, reference.responses[card]);
		});
	} else if (msg.t == 1) { // Update
		updateGame();
	} else if (msg.t == 2) { // DealPatch
		dealPatch(msg.hand)
	} else if (msg.t == 3) { // GiveCard
		addToHand(msg.hand, reference.responses[msg.hand]);
	} else if (msg.t == 4) { // Czar
		iAmCzar = true;
		$("#hand, #remove").addClass("czar");
	} else if (msg.t == 5) { // NewRound
		iAmCzar = false;
		dropzonesCreated = false;
		$("#hand, #remove").removeClass("czar");
	} else if (msg.t == 6) { // Reveal
		revealCards();
	} else if (msg.t == 7) { // Winner
		$(`.white.card[index=${msg.cardIndex}]`)
			.addClass("winner");
	} else if (msg.t == 8) { // Over
		alert("Game over. The winner is " 
		+ room.state.playerNames[msg.winner] + ".")
	} else if (msg.t == 9) { // Restart
		location.reload();
	}
}

// debug menu
document.onkeyup = function(e) {
	if (e.ctrlKey && e.altKey && e.key == "d") {
		var cmd = prompt("Msg to send:");
		room.send({type: "debug", cmd: cmd});
	}
};

// we're joining late, patch deal cards
async function dealPatch(hand) {
	let deck = room.state.deck;
	await loadReferences(deck);

	hand.forEach(card => {
		addToHand(card, reference.responses[card]);
	});

	updateGame();
}

function startGame() {
	if (!room) return;
	room.send({type: "startGame"});
}

function updateGame() {
	if (!room || !room.state) return;

	let currentCall = room.state.call.cardid[0];
	$("#tabletop .black.card").attr("cardid", currentCall)
		.find("p").html(getCallText(currentCall));

	// clear the tabletop
	$("#tabletop .white.card").remove();

	const tabletop = $("#tabletop");
	room.state.responses.forEach(() => {
		tabletop.append(cardElement);
	})

	if (!dropzonesCreated) {
		// clear dropzones, returning forgotten cards
		clearDropzone()
		$("#submit .dropzone").remove();
		const submit = $("#submit");
		for (let i = 0; i < cardsInRound; i++) {
			submit.append(dropzoneItem);
		}
		dropzonesCreated = true;
	}
}

function clearDropzone() {
	$("#submit .dropzone .item").toArray().forEach(card => {
		id = Number.parseInt($(card).attr("cardid"));
		addToHand(id, reference.responses[id])
	})
}

function getCallText(id) {
	let array = reference.calls[id];
	cardsInRound = array.length - 1;
	return array.join("____")
}

async function loadReferences(id) {
	var calls = await $.ajax({
		url: "data/" + id + "/calls-clean.json" });
	var responses = await $.ajax({
		url: "data/" + id + "/responses-clean.json" });
	reference.calls = calls;
	reference.responses = responses;
	return true;
}

function getReferencesFromServer() {
	if (reference.calls.length == 0) {
		if (room.state.deck)
			loadReferences(room.state.deck);
	}
}

function onLeave(code) {
	console.log("Connection lost:", code)
	alert("Connection lost.")
}