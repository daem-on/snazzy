
// convert.js
// A CardCast->Snazzy downloader/converter helper application
// For use with the command line: node convert.js DECK_ID

const fs = require("fs");
const path = require("path");
const downloadFile = require("download-file");

var urls = []

async function download(url, options) {
    downloadFile(url, options, function(err){
        if (err) throw err
        return true;
    })
}

async function convert(folder, file, deck) {
    let text = fs.readFileSync(path.join(folder, file + ".json"), "utf-8")
    let obj = JSON.parse(text)
    let out = [];
    obj.forEach(item => {out.push(item.text)})
    let p = path.join("../client/data", deck, file + "-clean.json")
    fs.writeFileSync(p, JSON.stringify(out), "utf-8")
    return obj.length;
}

async function run() {
    if (!process.argv[2]) return;
    let deck = process.argv[2];
    urls = [
        `https://api.cardcastgame.com/v1/decks/${deck}/calls`,
        `https://api.cardcastgame.com/v1/decks/${deck}/responses`
    ]
    await download(urls[0], {
        directory: "data", filename: "calls.json"
    });
    await download(urls[1], {
        directory: "data", filename: "responses.json"
    });
    if (!fs.existsSync(path.join("../client/data", deck)))
        fs.mkdirSync(path.join("../client/data", deck));
    var calls = await convert("data", "calls", deck);
    var responses = await convert("data", "responses", deck);

    var entry = {};
    entry[deck] = {"calls": calls, "responses": responses};
    console.log("Add this to your decks.json:")
    console.log(entry);

    return;
}

run()
