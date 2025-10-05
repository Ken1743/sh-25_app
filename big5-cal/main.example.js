// main.example.js
const fs = require("fs");
const path = require("path");
const { calc } = require("./calc");

function loadJSON(p) {
const abs = path.isAbsolute(p) ? p : path.join(process.cwd(), p);
return JSON.parse(fs.readFileSync(abs, "utf-8"));
}

function main() {
const events = loadJSON("./events.json");

// ★ ここで必ず result に代入
const result = calc(events);

console.log("Model:", result.modelVersion);
console.log("Raw  :", result.raw);
console.log("Scaled (0–100):", result.scaled);
console.log("MBTI :", result.mbti.type, result.mbti.confidence);

// 解決済みシーケンスを見たい場合:
console.log(result.resolved.map(r => ({ id: r.def.id, dur: r.dur, start: r.start })));
}

main();
