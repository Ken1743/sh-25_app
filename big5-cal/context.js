// context.js
const { clamp, addVec } = require("./utils");

function applyWakeDelay(acc, seq, rules) {
  const r = rules.wake_delay || {};
  if (typeof r.N_per_min !== "number") return;
  let delay = 0;
  for (const s of seq) { if (s.def.scene==="wake" && s.def.break) break; delay += s.dur; }
  if (delay<=0) return;
  acc.N += clamp(delay * r.N_per_min, 0, r.N_cap ?? Infinity);
  acc.C += clamp(delay * r.C_per_min, r.C_cap ?? -Infinity, 0);
}

function applyProcrastinationChain(acc, seq, rules) {
  const r = rules.procrastination_chain; if (!r) return;
  const set = new Set(r.ids || []);
  let streak=0, given=false;
  for (const s of seq) {
    if (set.has(s.def.id)) { streak++; if(!given && streak >= (r.min_consecutive||2)){ addVec(acc, r.bonus||{}); given=true; } }
    else streak=0;
  }
}

function applyGameDecision(acc, seq, events, rules) {
  const r = rules.game_decision; if (!r) return;
  for (let i=0;i<seq.length;i++) {
    if (seq[i].def.id === r.target_id) {
      const dec = (events[i] && events[i].meta && events[i].meta.gameDecision) || seq[i].meta.gameDecision;
      if (dec === "continue") addVec(acc, r.continue_delta || {});
      if (dec === "stop")     addVec(acc, r.stop_delta || {});
    }
  }
}

function applySceneSwitch(acc, seq, rules) {
  const r = rules.scene_switch; if (!r) return;
  let switches=0; for(let i=1;i<seq.length;i++) if(seq[i-1].def.scene !== seq[i].def.scene) switches++;
  const per=r.per_switch||{}, caps=r.caps||{};
  if (per.O) acc.O += clamp(switches * per.O, 0, caps.O ?? Infinity);
  if (per.C) acc.C += clamp(switches * per.C, caps.C ?? -Infinity, 0);
  if (per.E) acc.E += clamp(switches * per.E, 0, caps.E ?? Infinity);
  if (per.A) acc.A += clamp(switches * per.A, 0, caps.A ?? Infinity);
  if (per.N) acc.N += clamp(switches * per.N, caps.N ?? -Infinity, 0);
}

function applyTimeBalance(acc, seq, rules) {
  const r = rules.time_balance; if (!r) return;
  const total = seq.reduce((a,s)=>a+s.dur,0) || 1;

  const pr = seq.filter(s=>s.def.tags.includes("Pln") || s.def.tags.includes("Real"))
                .reduce((a,s)=>a+s.dur,0);
  const b = r.pln_real_ratio_bonus || {};
  if (b.threshold!=null && pr/total >= b.threshold) addVec(acc, b.delta || {});

  const pen = r.passive_media_ratio_penalty || {};
  const set = new Set(pen.ids || []);
  const passive = seq.filter(s=>set.has(s.def.id)).reduce((a,s)=>a+s.dur,0);
  if (pen.threshold!=null && passive/total >= pen.threshold) addVec(acc, pen.delta || {});
}

function applyConsistency(acc, seq, rules) {
  const r = rules.consistency_entropy; if (!r) return;
  const tags = r.tags || [];
  const counts = new Map(tags.map(t=>[t,0]));
  for (const s of seq) for (const t of s.def.tags) if (counts.has(t)) counts.set(t,(counts.get(t)||0)+s.dur);
  const tot = Array.from(counts.values()).reduce((a,b)=>a+b,0) || 1;
  const p = Array.from(counts.values()).map(v=>v/tot);
  const H = -p.filter(x=>x>0).reduce((a,x)=>a + x*Math.log(x), 0);
  const K = Math.max(1, tags.length);
  const consistency = Math.max(0, Math.min(1, 1 - H/Math.log(K)));
  if (r.C_gain) acc.C += r.C_gain * consistency;
  if (r.O_gain) acc.O += r.O_gain * (1 - consistency);
}

function applyInstantBreak(acc, seq, rules) {
  const r = rules.instant_break; if (!r) return;
  let hits=0; const times=[]; const seen=new Set();
  for (let i=0;i<seq.length;i++) {
    const cur = seq[i];
    if (cur.def.break && cur.dur <= (r.threshold_min ?? 2)) {
      hits++; times.push(cur.start);
      const decay = 1 / Math.sqrt(hits);
      const per = r.per_hit_delta || {};
      acc.O += (per.O || 0)*decay; acc.C += (per.C || 0)*decay; acc.E += (per.E || 0)*decay;

      const burst = r.burst || {};
      const windowStart = cur.start - (burst.window_min ?? 10);
      const count = times.filter(t=>t>=windowStart).length;
      if (count === (burst.min_hits ?? 3)) addVec(acc, burst.bonus || {});

      const next = seq[i+1];
      if (next) {
        const nb = r.novel_tag_bonus || {};
        const newTags = next.def.tags.filter(t=>!seen.has(t));
        const addO = Math.min(nb.cap ?? Infinity, (nb.per_new_tag || 0) * newTags.length);
        acc.O += addO;
      }
    }
    cur.def.tags.forEach(t=>seen.add(t));
  }
  const caps=r.caps||{};
  if (caps.O != null) acc.O = Math.min(acc.O, caps.O);
  if (caps.C != null) acc.C = Math.max(acc.C, caps.C);
  if (caps.E != null) acc.E = Math.min(acc.E, caps.E);

  const guard=r.over_sampling_guard||{};
  const avgStay=(seq.reduce((a,s)=>a+s.dur,0)||0)/Math.max(1,seq.length);
  if (avgStay < (guard.avg_stay_min_lt ?? -Infinity) && hits >= (guard.min_hits ?? Infinity)) {
    addVec(acc, guard.penalty || {});
  }
}

function applyScenarios(acc, seq, scenarios) {
  if (!Array.isArray(scenarios) || !scenarios.length) return;
  const joined = seq.map(s=>s.def.id).join(" ");
  const total = seq.reduce((a,s)=>a+s.dur,0);
  for (const sc of scenarios) {
    if (sc.type !== "regex") continue;
    const re = new RegExp(sc.expr);
    if (!re.test(joined)) continue;
    if (sc.time_limits && sc.time_limits.total_minutes!=null && total>sc.time_limits.total_minutes) continue;
    addVec(acc, sc.base_bonus || {});
  }
}

module.exports = {
  applyWakeDelay, applyProcrastinationChain, applyGameDecision,
  applySceneSwitch, applyTimeBalance, applyConsistency,
  applyInstantBreak, applyScenarios
};
