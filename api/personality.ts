// /api/personality.ts  (Vercel Edge/NodeどちらでもOK: Node推奨)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import fs from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { createRequire } from "node:module";

// big5-cal is CommonJS. In ESM (Vercel) import via createRequire
const require = createRequire(import.meta.url);
const { calc } = require("../big5-cal/calc");

type Choices = {
  sofa?: string | number;
  kitchen?: string | number;
  wakeUp?: string | number;
  computer?: string | number;
  dining?: string | number;
};

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL = "gemini-2.0-flash-001";

function firstExisting(...relPaths: string[]): string | null {
  for (const rel of relPaths) {
    try {
      const abs = path.join(process.cwd(), rel);
      if (fs.existsSync(abs)) return abs;
    } catch {}
  }
  return null;
}
function loadTextAny(...candidates: string[]) {
  const abs = firstExisting(...candidates);
  if (abs) return fs.readFileSync(abs, "utf-8");
  return ""; // fallback to empty; caller can replace with default
}
function loadJSONAny<T = any>(...candidates: string[]): T {
  const abs = firstExisting(...candidates);
  if (!abs) throw new Error(`Config not found: ${candidates.join(", ")}`);
  return JSON.parse(fs.readFileSync(abs, "utf-8"));
}

/** Big Five(0-100) → レーダー5軸（可視化名）に変換 */
function oceanToRadar(s: { O: number; C: number; E: number; A: number; N: number }) {
  return [
    { axis: "Openness", value: Math.round(s.O ?? 0) },
    { axis: "Conscientiousness", value: Math.round(s.C ?? 0) },
    { axis: "Extraversion", value: Math.round(s.E ?? 0) },
    { axis: "Agreeableness", value: Math.round(s.A ?? 0) },
    { axis: "Neuroticism", value: Math.round(s.N ?? 0) },
  ];
}

/** trait計上（選択肢→traits）。簡易集計で上位をbadgeに */
function collectTraits(c: Choices): string[] {
  const add = (m: Record<string, number>, k: string, w = 1) => (m[k] = (m[k] ?? 0) + w);
  const score: Record<string, number> = {};

  const pick = (v: string | number | undefined) => (typeof v === "number" ? String(v) : (v ?? ""));

  // Sofa
  switch (pick(c.sofa)) {
    case "1": add(score, "Planning"); add(score, "Realistic"); break;
    case "2": add(score, "Introvert"); break;
    case "3": add(score, "Extrovert"); break;
    case "4": add(score, "Explorer"); add(score, "Intuitive"); break;
  }
  // Kitchen
  switch (pick(c.kitchen)) {
    case "1": add(score, "Planning"); add(score, "Realistic"); break;
    case "2": add(score, "Assertive"); add(score, "Action-first"); break;
    case "3": add(score, "Feeling"); add(score, "Explorer"); break;
    case "4": add(score, "Thinking"); add(score, "Realistic"); break;
  }
  // Wake-up
  switch (pick(c.wakeUp)) {
    case "1": add(score, "Planning"); break;
    case "2": add(score, "Explorer"); add(score, "Turbulent"); break;
    case "3": add(score, "Feeling"); add(score, "Introvert"); break;
    case "4": add(score, "Extrovert"); add(score, "Realistic"); break;
  }
  // Computer
  switch (pick(c.computer)) {
    case "1": add(score, "Planning"); add(score, "Assertive"); break;
    case "2": add(score, "Feeling"); add(score, "Extrovert"); break;
    case "3": add(score, "Explorer"); break;
    case "4": add(score, "Feeling"); add(score, "Introvert"); break;
  }
  // Dining
  switch (pick(c.dining)) {
    case "1": add(score, "Planning"); add(score, "Realistic"); break;
    case "2": add(score, "Action-first"); break;
    case "3": add(score, "Feeling"); add(score, "Explorer"); break;
    case "4": add(score, "Thinking"); add(score, "Realistic"); break;
  }

  return Object.entries(score)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k]) => k);
}

/** Big Five + MBTI の簡単サマリをMarkdown化（Geminiへのヒント） */
function buildSignalsMarkdown(result: any) {
  const s = result?.scaled ?? {};
  const mbti = result?.mbti?.type ?? "?";
  const conf = result?.mbti?.overall ?? 0;
  const confWord = conf >= 0.6 ? "high" : conf <= 0.25 ? "low" : "medium";

  return [
    `## Scored Signals (model ${result?.modelVersion ?? "?"})`,
    `**MBTI Guess**: ${mbti} (confidence: ${confWord}).`,
    "",
    "### Big Five (scaled 0–100)",
    `- **Openness**: ${Math.round(s.O ?? 0)}%`,
    `- **Conscientiousness**: ${Math.round(s.C ?? 0)}%`,
    `- **Extraversion**: ${Math.round(s.E ?? 0)}%`,
    `- **Agreeableness**: ${Math.round(s.A ?? 0)}%`,
    `- **Neuroticism**: ${Math.round(s.N ?? 0)}%`,
    "",
    "_Note: Use these as gentle hints, not hard labels._",
  ].join("\n");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  // Don't hard-fail without an API key; we'll fall back to local markdown below.

  try {
    // 1) 入力
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body as any) || {};
    const choices: Choices = body?.choices ?? {};

    // 2) ベースprompt + calc
    // Prompt: try common locations; provide a small default if missing
    let basePrompt = loadTextAny(
      "src/utils/prompt.txt",
      "api/prompt.txt",
      "prompt.txt"
    );
    if (!basePrompt) {
      basePrompt = `You are a friendly guide who explains personality in very simple English.\nReturn ONLY Markdown with the specified sections.`;
    }

    // Events: prefer shared big5-cal data in repo
    const events = loadJSONAny("big5-cal/events.json", "api/events.json", "events.json");
    const result = calc(events);

    // 3) 追記
  const signals = buildSignalsMarkdown(result);
    const finalPrompt =
      [
        basePrompt.trim(),
        "",
        signals,
        "",
        "## Now process this input:",
        JSON.stringify(choices ?? {}, null, 2),
      ].join("\n");

    // 4) Gemini 呼び出し（失敗時はローカルの簡易Markdownにフォールバック）
    let markdown = "";
    if (process.env.GEMINI_API_KEY) {
      try {
        const r = await ai.models.generateContent({
          model: MODEL,
          contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
        });
        markdown = r.text ?? "";
      } catch (err) {
        markdown = `# Your Personality Snapshot ✨\n\nYou are a unique person with many cool sides! ✨\n\n## Key Traits 🧩\n- Planning: You like to organize and get things done\n- Realistic: You like things that are practical and clear\n- Thinking: You enjoy solving problems with logic\n\n## In Daily Life 🏃\n- You plan your day so you know what to expect\n- You think carefully before making a big choice\n- You enjoy things that are useful and make sense\n\n## Friendly Tips 💡\n- Remember to be flexible, things can change!\n- Take time to enjoy the little things\n\n## Compatibility ❤️\n\nBest (Top 3)\n\n- INFJ: Focus on emotions and creating meaningful connections\n- ENFP: Embrace change, valuing empathy in all endeavors\n- INTP: Shares curiosity, loves discussing new ideas together\n\nChallenge (Top 3)\n\n- ESTJ: May find each other's styles too different\n- ISTJ: Differing approaches to structure, details, and openness\n- ENFP: Your need for action could overwhelm them\n\nHighlights\nPlanning, Realistic, Thoughtful`;
      }
    } else {
      markdown = `# Your Personality Snapshot ✨\n\nYou are a unique person with many cool sides! ✨\n\n## Key Traits 🧩\n- Planning: You like to organize and get things done\n- Realistic: You like things that are practical and clear\n- Thinking: You enjoy solving problems with logic\n\n## In Daily Life 🏃\n- You plan your day so you know what to expect\n- You think carefully before making a big choice\n- You enjoy things that are useful and make sense\n\n## Friendly Tips 💡\n- Remember to be flexible, things can change!\n- Take time to enjoy the little things\n\n## Compatibility ❤️\n\nBest (Top 3)\n\n- INFJ: Focus on emotions and creating meaningful connections\n- ENFP: Embrace change, valuing empathy in all endeavors\n- INTP: Shares curiosity, loves discussing new ideas together\n\nChallenge (Top 3)\n\n- ESTJ: May find each other's styles too different\n- ISTJ: Differing approaches to structure, details, and openness\n- ENFP: Your need for action could overwhelm them\n\nHighlights\nPlanning, Realistic, Thoughtful`;
    }

    // 5) 返す構造（前面で描画しやすい形）
    const badges = collectTraits(choices);
  const now = { label: "Now", points: oceanToRadar(result.scaled) };
  const history = [{ label: "Prev", points: oceanToRadar(result.scaled) }]; // 初回は暫定で同値。履歴管理するなら差し替え可
  const mbtiType = result?.mbti?.type || "";

  return res.status(200).json({ markdown, badges, now, history, mbtiType });
  } catch (e: any) {
    console.error("[/api/personality] error:", e);
    return res.status(500).json({ error: String(e?.message ?? e) });
  }
}
