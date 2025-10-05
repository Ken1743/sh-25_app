    // mbti.js
    // 入力: scaled { O, C, E, A, N } すべて 0–100
    // 出力: { type: "ENTJ", letters: { EI, SN, TF, JP }, confidence: { ... } }

    function clamp01(x){ return Math.max(0, Math.min(1, x)); }
    function confFromMid(v){
    // 50からどれだけ離れているか（25離れると信頼度=1.0）
    return clamp01(Math.abs(v - 50) / 25);
    }

    // 中間帯(45–55)では簡単なタイブレークを使う
    const MID_LO = 45, MID_HI = 55;

    function pickEI(E, O, C){
    if (E >= MID_HI) return "E";
    if (E <= MID_LO) return "I";
    // tie-break: 探索的(O高) or 計画性(C高)で傾向づけ
    return (O >= C) ? "E" : "I";
    }

    function pickSN(O, E){
    // Big FiveのOpenness高→N（iNtuition）、低→S（Sensing）
    if (O >= MID_HI) return "N";
    if (O <= MID_LO) return "S";
    // tie-break: 外向性が高いとN寄りに（新奇志向をやや優先）
    return (E >= 50) ? "N" : "S";
    }

    function pickTF(A, C){
    // Agreeableness高→F（Feeling）、低→T（Thinking）
    if (A >= MID_HI) return "F";
    if (A <= MID_LO) return "T";
    // tie-break: C高→T、低→F（論理/秩序 vs 共感/柔軟）
    return (C >= 50) ? "T" : "F";
    }

    function pickJP(C, O){
    // Conscientiousness高→J、低→P
    if (C >= MID_HI) return "J";
    if (C <= MID_LO) return "P";
    // tie-break: Openness高→P、低→J（探索性を優先）
    return (O >= 50) ? "P" : "J";
    }

    function inferMBTI(scaled){
    const { O, C, E, A, N } = scaled; // N(Neuroticism)は信頼度補正にのみ軽く利用可
    const EI = pickEI(E, O, C);
    const SN = pickSN(O, E);
    const TF = pickTF(A, C);
    const JP = pickJP(C, O);

    const conf = {
        EI: confFromMid(E),
        SN: confFromMid(O),
        TF: confFromMid(A),
        JP: confFromMid(C)
    };

    // 全体信頼度（Neuroticismが高い場合は若干減衰させる：最大 -0.1）
    const avg = (conf.EI + conf.SN + conf.TF + conf.JP) / 4;
    const neuroPenalty = Math.max(0, (N - 50) / 500); // N=100で -0.1
    const overall = clamp01(avg - neuroPenalty);

    return {
        type: `${EI}${SN}${TF}${JP}`,
        letters: { EI, SN, TF, JP },
        confidence: { ...conf, overall }
    };
    }

    module.exports = { inferMBTI };
