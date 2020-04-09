import "fs";

let text = fs.readFileSync("responses.json", "utf-8")
let obj = JSON.parse(text)
let out = [];
obj.forEach(item => {out.push(item.text)})
fs.writeFileSync("responses-clean.json", JSON.stringify(out), "utf-8")