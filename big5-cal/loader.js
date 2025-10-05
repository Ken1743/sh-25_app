// loader.js（該当部分の差し替え）
const fs = require("fs");
const path = require("path");

function resolvePath(p) {
return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
}
function loadJSON(absPath) {
if (!fs.existsSync(absPath)) throw new Error(`Config not found: ${absPath}`);
return JSON.parse(fs.readFileSync(absPath, "utf-8"));
}

function loadModel() {
// ★ 基本は setting.base.json を見る。無ければ従来名 settings.base.json も試す
const baseCandidate = process.env.SETTINGS_BASE || "setting.base.json";
const baseAlt       = "settings.base.json"; // 互換
let basePath = resolvePath(baseCandidate);
if (!fs.existsSync(basePath)) {
    const alt = resolvePath(baseAlt);
    if (fs.existsSync(alt)) basePath = alt; // 互換として採用
}

const tuningPath = resolvePath(process.env.SETTINGS_TUNING || "settings.tuning.json");

const base   = loadJSON(basePath);
const tuning = loadJSON(tuningPath);

if (!Array.isArray(base.actions)) throw new Error("setting.base: actions must be array");
if (!tuning.matrix) throw new Error("settings.tuning: matrix is required");
if (typeof tuning.time_base_min !== "number") throw new Error("settings.tuning: time_base_min must be number");

const fixedById = new Map();
(tuning.actions_fixed || []).forEach(r => {
    if (r && typeof r.id === "string") fixedById.set(r.id, r.fixed_deltas || {});
});

const actions = base.actions.map(a => ({
    id: a.id,
    alias: a.alias,
    scene: a.scene,
    // ★ duration は base の定義を採用する（外部入力で上書きしない）
    duration_min: a.duration_min,
    tags: a.tags || [],
    break: !!a.break,
    fixed_deltas: fixedById.get(a.id) || {}
}));

return {
    version: tuning.version || "0.0.0",
    time_base_min: tuning.time_base_min,
    matrix: tuning.matrix,
    scenes: base.scenes || {},
    actions,
    context_rules: tuning.context_rules || {},
    scenarios: tuning.scenarios || []
};
}

module.exports = { loadModel };
