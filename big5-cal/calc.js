    // calc.js
    const { TRAITS, tanh } = require("./utils");
    const { inferMBTI } = require("./mbti");
    const { loadModel } = require("./loader");
    const {
    applyWakeDelay, applyProcrastinationChain, applyGameDecision,
    applySceneSwitch, applyTimeBalance, applyConsistency,
    applyInstantBreak, applyScenarios
    } = require("./context");

    // alias / id 辞書
    function buildIndex(actions) {
    const byId = new Map();
    const byAlias = new Map();
    for (const a of actions) { byId.set(a.id, a); if (a.alias) byAlias.set(a.alias, a); }
    return { byId, byAlias };
    }

    // events[] を時間付きに解決
    function resolveSequence(events, model) {
        // 入力バリデーション（key 以外は無視）
        if (!Array.isArray(events)) throw new Error("events must be an array");
        const { byId, byAlias } = buildIndex(model.actions);
    
        const seq = [];
        let cursor = 0;
        for (const ev of events) {
        if (!ev || typeof ev.key !== "string") continue;
        const k = ev.key.replace(/\s+/g, " ");
        const def = byAlias.get(k) || byId.get(k);
        if (!def) continue;
    
        // ★ duration は base 定義を使用（外部の duration_min/start/meta は見ない）
        const dur = def.duration_min;
        const start = cursor;
        cursor = start + dur;
    
        seq.push({ def, dur, start, meta: {} });
        }
        return seq;
    }
    // === 外部公開：calc(events) ※設定は内部でロード
    function calc(events) {
    const model = loadModel();
    const seq = resolveSequence(events, model);

    // 1) タグ寄与 + 固有補正
    const acc = { O:0, C:0, E:0, A:0, N:0 };
    for (const s of seq) {
        const scale = s.dur / model.time_base_min;
        // タグ行列の寄与
        for (const tag of s.def.tags) {
        const vec = model.matrix[tag] || {};
        for (const tr of TRAITS) acc[tr] += scale * (vec[tr] || 0);
        }
        // 固有補正
        for (const tr of TRAITS) {
        const v = s.def.fixed_deltas && s.def.fixed_deltas[tr];
        if (v != null) acc[tr] += scale * v;
        }
    }

    // 2) 文脈補正
    const rules = model.context_rules || {};
    applyWakeDelay(acc, seq, rules);
    applyProcrastinationChain(acc, seq, rules);
    applyGameDecision(acc, seq, events, rules);
    applySceneSwitch(acc, seq, rules);
    applyTimeBalance(acc, seq, rules);
    applyConsistency(acc, seq, rules);
    applyInstantBreak(acc, seq, rules);
    applyScenarios(acc, seq, model.scenarios);

    // 3) 0–100 へ
    const scaled = { O:0, C:0, E:0, A:0, N:0 };
    for (const tr of TRAITS) scaled[tr] = 50 + 50 * tanh(acc[tr]);

    // 4) MBTI 推定
    const mbti = inferMBTI(scaled);

    return { modelVersion: model.version, raw: acc, scaled, resolved: seq, mbti };
    }

    module.exports = { calc, resolveSequence };
