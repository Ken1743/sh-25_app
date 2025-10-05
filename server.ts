// server.ts
import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { createRequire } from "node:module";
import dotenv from "dotenv";

// Load env vars from .env.local first (if present), then .env
dotenv.config({ path: ".env.local" });
dotenv.config();

// big5-cal is CommonJS, import via require for compatibility
const require = createRequire(import.meta.url);
const { calc } = require("./big5-cal/calc");

const app = express();
app.use(cors());
app.use(express.json());

type AxisPoint = { axis: string; value: number }; // 0..100（レーダー用）

function oceanToRadar(s: { O: number; C: number; E: number; A: number; N: number }): AxisPoint[] {
  return [
    { axis: "Openness", value: Math.round(s.O ?? 0) },
    { axis: "Conscientiousness", value: Math.round(s.C ?? 0) },
    { axis: "Extraversion", value: Math.round(s.E ?? 0) },
    { axis: "Agreeableness", value: Math.round(s.A ?? 0) },
    { axis: "Neuroticism", value: Math.round(s.N ?? 0) },
  ];
}

function collectTraits(c: Record<string, string | number>): string[] {
  const add = (m: Record<string, number>, k: string, w = 1) => (m[k] = (m[k] ?? 0) + w);
  const score: Record<string, number> = {};
  const pick = (v: string | number | undefined) => (typeof v === "number" ? String(v) : (v ?? ""));
  switch (pick(c.sofa)) { case "1": add(score, "Planning"); add(score, "Realistic"); break; case "2": add(score, "Introvert"); break; case "3": add(score, "Extrovert"); break; case "4": add(score, "Explorer"); add(score, "Intuitive"); break; }
  switch (pick(c.kitchen)) { case "1": add(score, "Planning"); add(score, "Realistic"); break; case "2": add(score, "Assertive"); add(score, "Action-first"); break; case "3": add(score, "Feeling"); add(score, "Explorer"); break; case "4": add(score, "Thinking"); add(score, "Realistic"); break; }
  switch (pick(c.wakeUp)) { case "1": add(score, "Planning"); break; case "2": add(score, "Explorer"); add(score, "Turbulent"); break; case "3": add(score, "Feeling"); add(score, "Introvert"); break; case "4": add(score, "Extrovert"); add(score, "Realistic"); break; }
  switch (pick(c.computer)) { case "1": add(score, "Planning"); add(score, "Assertive"); break; case "2": add(score, "Feeling"); add(score, "Extrovert"); break; case "3": add(score, "Explorer"); break; case "4": add(score, "Feeling"); add(score, "Introvert"); break; }
  switch (pick(c.dining)) { case "1": add(score, "Planning"); add(score, "Realistic"); break; case "2": add(score, "Action-first"); break; case "3": add(score, "Feeling"); add(score, "Explorer"); break; case "4": add(score, "Thinking"); add(score, "Realistic"); break; }
  return Object.entries(score).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k])=>k);
}

function loadTextFromRoot(rel: string) {
  const abs = path.join(process.cwd(), rel);
  return fs.readFileSync(abs, "utf-8");
}
function loadJSONFromRoot<T = any>(rel: string): T {
  const abs = path.join(process.cwd(), rel);
  return JSON.parse(fs.readFileSync(abs, "utf-8"));
}

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

// ---- 4) API ルート --------------------------------------------------------
app.post("/api/personality", async (req, res) => {
  try {
    const choices: Record<string, string | number> = req.body?.choices ?? {};

    // Load prompt and events using project-root relative paths
    const basePrompt = loadTextFromRoot("src/utils/prompt.txt");
    const events = loadJSONFromRoot("big5-cal/events.json");

    // Run model calc
    const result = calc(events);

    // Prepare radar and badges
    const now = { label: "Now", points: oceanToRadar(result.scaled) };
    const history = [{ label: "Prev", points: oceanToRadar(result.scaled) }];
    const badges = collectTraits(choices);

    // Build final prompt for Gemini
    const signals = buildSignalsMarkdown(result);
    const finalPrompt = [
      basePrompt.trim(),
      "",
      signals,
      "",
      "## Now process this input:",
      JSON.stringify(choices ?? {}, null, 2),
    ].join("\n");

    let markdown = "";
    let comment = "";

    if (process.env.GEMINI_API_KEY2) {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY2 });
      const r = await ai.models.generateContent({
        model: "gemini-2.0-flash-001",
        contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
      });
      markdown = r.text ?? "";
      comment = markdown.split(/\n+/).find((l) => l.trim().length > 0) || "";
    } else {
      // Fallback without Gemini
      markdown = signals;
      comment = `MBTI: ${result?.mbti?.type ?? "?"}. Openness ${Math.round(result.scaled.O)}%, Conscientiousness ${Math.round(result.scaled.C)}%.`;
    }

  const mbtiType = result?.mbti?.type || "";
  res.json({ markdown, badges, now, history, comment, mbtiType });
  } catch (e: any) {
    console.error("[API /api/personality] error:", e);
    res.status(500).json({ error: String(e?.message ?? e) });
  }
});

// ログ
app.use((req, _res, next) => { console.log(`[API] ${req.method} ${req.url}`); next(); });

app.listen(8787, () => console.log("API ready: http://localhost:8787"));
