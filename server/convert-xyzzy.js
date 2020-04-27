txt = fs.readFileSync("download.json", "utf-8")
data = JSON.parse(txt)
fuc = data.blackCards
intlBlack = []
for (card in fuc) {if (fuc[card].watermark == "US") intlBlack.push(fuc[card])}
cleanBlack = []
for (card in intlBlack) {cleanBlack.push(intlBlack[card].text.split("____"))}
cleanWhite = []
for (card in intlWhite) {cleanWhite.push([intlWhite[card].text])}
fs.writeFileSync("data/calls.json", JSON.stringify(cleanBlack), "utf-8")