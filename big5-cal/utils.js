// utils.js
const TRAITS = ["O","C","E","A","N"];
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const tanh  = (x) => { const e1=Math.exp(x), e2=Math.exp(-x); return (e1-e2)/(e1+e2); };
const addVec = (acc, d) => TRAITS.forEach(tr => acc[tr] += (d && d[tr]) ?? 0);

module.exports = { TRAITS, clamp, tanh, addVec };
