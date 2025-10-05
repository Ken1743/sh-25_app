// sendToGemini.js
// - calc(events) の出力を読み取り、やさしい英語の "Scored Signals" を生成
// - prompt.txt に追記合体して Vercel /api/gemini に POST する

import { readFileSync, writeFileSync, existsSync } from "fs";
import { isAbsolute, join } from "path";
import { calc } from "./calc";

// ---------- FS helpers ----------
function loadText(p) {
    const abs = isAbsolute(p) ? p : join(process.cwd(), p);
    return readFileSync(abs, "utf-8");
}
function loadJSON(p) {
    const abs = isAbsolute(p) ? p : join(process.cwd(), p);
    return JSON.parse(readFileSync(abs, "utf-8"));
}
function saveText(p, text) {
    const abs = isAbsolute(p) ? p : join(process.cwd(), p);
    writeFileSync(abs, text);
}

// ---------- Simple English formatters ----------
function bucket(v) {
    if (v >= 65) return "high";
    if (v <= 35) return "low";
    return "mid";
}
function describeBigFiveScaled(s) {
    const out = [];

    const oB = bucket(s.O ?? 0);
    out.push(
        oB === "high"
            ? "**Openness**: You like **new ideas** and **imagination**."
            : oB === "low"
                ? "**Openness**: You prefer **familiar things** and clear rules."
                : "**Openness**: You enjoy both new and familiar things."
    );

    const cB = bucket(s.C ?? 0);
    out.push(
        cB === "high"
            ? "**Conscientiousness**: You like to **plan** and **finish tasks**."
            : cB === "low"
                ? "**Conscientiousness**: You go with the **flow** and decide later."
                : "**Conscientiousness**: You plan sometimes and relax sometimes."
    );

    const eB = bucket(s.E ?? 0);
    out.push(
        eB === "high"
            ? "**Extraversion**: You gain energy from **people** and action."
            : eB === "low"
                ? "**Extraversion**: You recharge with **quiet** and **solo time**."
                : "**Extraversion**: You like both people time and quiet time."
    );

    const aB = bucket(s.A ?? 0);
    out.push(
        aB === "high"
            ? "**Agreeableness**: You are **kind** and value **harmony**."
            : aB === "low"
                ? "**Agreeableness**: You are **direct** and honest about needs."
                : "**Agreeableness**: You are kind but also **speak up**."
    );

    const nB = bucket(s.N ?? 0);
    out.push(
        nB === "high"
            ? "**Neuroticism**: You feel **stress** easily; gentle routines help."
            : nB === "low"
                ? "**Neuroticism**: You stay **calm** in many situations."
                : "**Neuroticism**: You feel ups and downs, then balance again."
    );

    return out;
}
function describeMBTI(result) {
    const t = result?.mbti?.type;
    if (!t) return { line: "", bullets: [] };

    const map = {
        INTJ: "You like **plans** and **ideas**. Quiet focus. Big picture.",
        INTP: "You enjoy **thinking** and **systems**. Curious and calm.",
        ENTJ: "You like **leading** and **goals**. Clear steps to win.",
        ENTP: "You enjoy **new ideas** and **debates**. Quick and playful.",
        INFJ: "You care about **meaning** and **people**. Gentle planner.",
        INFP: "You value **feelings** and **dreams**. Warm and creative.",
        ENFJ: "You guide **people** with **kind plans**. Team helper.",
        ENFP: "You love **possibilities** and **people**. Bright explorer.",
        ISTJ: "You value **facts** and **duty**. Steady and careful.",
        ISFJ: "You support **people** with **care**. Quiet helper.",
        ESTJ: "You like **order** and **results**. Clear action.",
        ESFJ: "You enjoy **team care** and **traditions**. Friendly.",
        ISTP: "You like **hands-on** problem solving. Calm mover.",
        ISFP: "You enjoy **beauty** and **peace**. Gentle explorer.",
        ESTP: "You like **action** and **challenges**. Bold mover.",
        ESFP: "You enjoy **fun** and **people**. Warm performer.",
    };

    const bullets = [map[t] || "You mix **planning** and **exploring** in your own way."];
    const conf = result.mbti.overall ?? 0;
    const confWord = conf >= 0.6 ? "high" : conf <= 0.25 ? "low" : "medium";
    const line = `**MBTI Guess**: ${t} (confidence: ${confWord}).`;
    return { line, bullets };
}
function buildSignalsMarkdown(result) {
    const s = result?.scaled ?? {};
    const bigFiveLines = describeBigFiveScaled(s);
    const { line: mbtiLine, bullets: mbtiBullets } = describeMBTI(result || {});

    return [
        `## Scored Signals (model ${result?.modelVersion ?? "?"})`,
        mbtiLine,
        ...(mbtiBullets.length ? mbtiBullets.map((b) => "- " + b) : []),
        "",
        "### Big Five (scaled 0–100)",
        `- **Openness**: ${Math.round(s.O ?? 0)}%`,
        `- **Conscientiousness**: ${Math.round(s.C ?? 0)}%`,
        `- **Extraversion**: ${Math.round(s.E ?? 0)}%`,
        `- **Agreeableness**: ${Math.round(s.A ?? 0)}%`,
        `- **Neuroticism**: ${Math.round(s.N ?? 0)}%`,
        "",
        "### Plain Language",
        ...bigFiveLines.map((t) => "- " + t),
        "",
        "_Note: Use these as gentle hints, not hard labels._",
    ].join("\n");
}
function buildFinalPrompt(basePrompt, result, userChoices) {
    const signals = buildSignalsMarkdown(result);
    return [
        basePrompt.trim(),
        "",
        signals,
        "",
        "## Now process this input:",
        JSON.stringify(userChoices ?? {}, null, 2),
    ].join("\n");
}

// ---------- Main ----------
async function main() {
    // 1) 必須入力
    const basePrompt = loadText("./prompt.txt");
    const events = loadJSON("./events.json");
    const result = calc(events);

    // 2) ユーザーの選択（引数で choices.json パスを渡せる。なければデモ値）
    let userChoices = {
        sofa: "2",
        kitchen: 1,
        wakeUp: "1",
        computer: 3,
        dining: "3",
    };
    const choicesArg = process.argv[2];
    if (choicesArg && existsSync(choicesArg)) {
        try { userChoices = loadJSON(choicesArg); } catch { }
    } else if (existsSync("./choices.json")) {
        try { userChoices = loadJSON("./choices.json"); } catch { }
    }

    // 3) 合体した最終プロンプトを作る
    const finalPrompt = buildFinalPrompt(basePrompt, result, userChoices);

    // （デバッグ用に保存したい場合）
    saveText("./last_prompt.txt", finalPrompt);

    // 4) 送る先（ローカル or Vercel）
    const endpoint = process.env.GEMINI_ENDPOINT || "http://localhost:5173/api/gemini";

    // 5) POST
    const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data?.error || `Request failed: ${res.status}`);
    }

    console.log("===== Gemini Output =====");
    console.log(data.text || "");
}

main().catch((e) => {
    console.error("[sendToGemini] Error:", e?.message || e);
    process.exit(1);
});
