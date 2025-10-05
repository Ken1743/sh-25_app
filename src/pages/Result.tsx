// src/pages/Result.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import "./Result.css";

import Generating from "../components/Generating/Generating";
import Comment from "../components/Comment/Comment";
import ProfileRadar from "../components/ProfileRader/ProfileRader";
import MbtiPic from "../components/MbtiPic/MbtiPic";
import ShareCard from "../components/ShareCard/ShareCard";
import { toPng } from "html-to-image";

type AxisPoint = { axis: string; value: number };
type Snapshot = { label: string; points: AxisPoint[] };

export default function ResultPage() {
  const [badges, setBadges] = useState<string[]>(["Planning", "Introvert"]);
  const [markdown, setMarkdown] = useState<string>("# Your Personality Snapshot\n(placeholder)");
  const [now, setNow] = useState<Snapshot>({ label: "Now", points: [] });
  const [history, setHistory] = useState<Snapshot[]>([]);
  // const [comment, setComment] = useState<string]("");
  // const [aiMarkdown, setAiMarkdown] = useState<string>("");
  const [mbtiType, setMbtiType] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const captureRef = useRef<HTMLDivElement | null>(null);
  const LS_PREV_KEY = "radar.prev.snapshot";

  // 初回表示用: 前回値が無いときに Now と少し違う形を作る（視認しやすい差分）
  const makeSyntheticPrev = (points: AxisPoint[]): Snapshot => {
    // ルール: 50%を基準に小さく反転（±12pt）してクランプ
    const jitter = 12;
    const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
    const prevPts = (points || []).map((p) => {
      const v = typeof p.value === "number" ? p.value : 0;
      const nv = v >= 50 ? v - jitter : v + jitter;
      return { axis: p.axis, value: clamp(nv) };
    });
    return { label: "Prev", points: prevPts };
  };

  const isEffectivelySame = (a: AxisPoint[] = [], b: AxisPoint[] = []) => {
    if (a.length !== b.length) return false;
    const byAxis = (arr: AxisPoint[]) => Object.fromEntries(arr.map((p) => [p.axis, p.value ?? 0]));
    const A = byAxis(a);
    const B = byAxis(b);
    const axes = new Set([...Object.keys(A), ...Object.keys(B)]);
    for (const ax of axes) {
      const dv = Math.abs((A[ax] ?? 0) - (B[ax] ?? 0));
      if (dv > 0) return false; // 完全一致のみ同一とみなす
    }
    return true;
  };

  // 平均差が小さい（≦8pt）なら“ほぼ同じ”とみなす
  const isNearlySame = (a: AxisPoint[] = [], b: AxisPoint[] = []) => {
    if (!a.length || !b.length) return false;
    const byAxis = (arr: AxisPoint[]) => Object.fromEntries(arr.map((p) => [p.axis, p.value ?? 0]));
    const A = byAxis(a);
    const B = byAxis(b);
    const axes = new Set([...Object.keys(A), ...Object.keys(B)]);
    let total = 0, n = 0;
    for (const ax of axes) { total += Math.abs((A[ax] ?? 0) - (B[ax] ?? 0)); n++; }
    const avg = n ? total / n : 0;
    return avg <= 8;
  };

  // Fallback: try to extract an MBTI code from markdown if API field is empty
  const extractMbti = (text: string) => {
    const m = (text || "").toUpperCase().match(/\b[IE][NS][TF][JP]\b/);
    return m?.[0] || "";
  };
  const displayMbti = (mbtiType && mbtiType.toUpperCase()) || extractMbti(markdown);
  // Fallback: extract Highlights from markdown when API badges are empty
  const extractHighlights = (md: string): string[] => {
    const lines = (md || "").split(/\r?\n/);
    const idx = lines.findIndex((l) => /^\s*(?:#{1,6}\s*)?highlights\s*$/i.test(l));
    const items: string[] = [];
    if (idx >= 0) {
      for (let i = idx + 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line || /^\s*$/.test(line)) break;
        if (/^#{1,6}\s/.test(line)) break;
        const normalized = line.replace(/^[-*•]\s*/, "").trim();
        for (const part of normalized.split(/[、,・|/]/)) {
          const v = part.trim();
          if (v) items.push(v);
        }
      }
    }
    return items;
  };
  // Prefer Highlights parsed from the AI markdown; fallback to API-provided badges
  const parsedHighlights = extractHighlights(markdown);
  const hl = parsedHighlights.length > 0 ? parsedHighlights : badges;
  const clean = (s: string) => s.replace(/\*\*/g, "").replace(/^\s*[-*•]\s*/, "").trim();
  const aliasMap: Record<string, string> = {
    planning: "Organize",
    planner: "Organize",
    realistic: "Real",
    reality: "Real",
    introvert: "Intro",
    extrovert: "Extro",
    explorer: "Explore",
    intuitive: "Intuit",
    assertive: "Assert",
    "action-first": "Action",
    actionfirst: "Action",
    thinking: "Think",
    feeling: "Feel",
    turbulent: "Turbo",
  };
  const shorten = (raw: string) => {
    const s = clean(raw);
    const key = s.toLowerCase().replace(/[^a-z]+/g, "");
    if (aliasMap[key]) return aliasMap[key];
    // Heuristic: take first 1–2 capitalized/alpha tokens
    const tokens = s
      .replace(/[。．｡!?]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    if (tokens.length === 0) return s;
    // Remove trivial stop words
    const stops = new Set(["you", "are", "a", "an", "the", "i", "to", "and", "of", "is"]);
    const core: string[] = [];
    for (const t of tokens) {
      const k = t.toLowerCase();
      if (stops.has(k)) continue;
      core.push(t.replace(/[,.:;]+$/, ""));
      if (core.length >= 2) break;
    }
    const out = (core[0] ? core.join(" ") : tokens[0]).trim();
    // Title-case single word
    return out.length <= 2 ? out.toUpperCase() : out[0].toUpperCase() + out.slice(1);
  };
  const normalizedBadges = Array.from(new Set(hl.map(shorten).filter(Boolean)));
  const headBadges = normalizedBadges.slice(0, 2);

  // Map MBTI to group for theming
  const mbtiGroup = (() => {
    const t = (displayMbti || "").toUpperCase();
    if (!/^[IE][NS][TF][JP]$/.test(t)) return "ana"; // default fall back
    const analyst = new Set(["INTJ","INTP","ENTJ","ENTP"]);
    const diplomat = new Set(["INFJ","INFP","ENFJ","ENFP"]);
    const sentinel = new Set(["ISTJ","ISFJ","ESTJ","ESFJ"]);
    const explorer = new Set(["ISTP","ISFP","ESTP","ESFP"]);
    if (analyst.has(t)) return "ana";
    if (diplomat.has(t)) return "dip";
    if (sentinel.has(t)) return "sen";
    if (explorer.has(t)) return "exp";
    return "ana";
  })();

  // Simple compatibility suggestions by group
  const compat = (() => {
    const t = (displayMbti || "").toUpperCase();
    if (!/^[IE][NS][TF][JP]$/.test(t)) return { best: [] as string[], challenge: [] as string[], note: "" };
    const m: Record<string, { best: string[]; challenge: string[]; note: string }> = {
      ANA: { best: ["ENFP","ENFJ"], challenge: ["ESFP","ISFP"], note: "Vision + empathy works well; remember to share feelings." },
      DIP: { best: ["INTJ","ENTJ"], challenge: ["ISTJ","ESTJ"], note: "Pair with structure; set shared goals." },
      SEN: { best: ["ISFJ","ESFJ"], challenge: ["ENTP","INTP"], note: "Stability shines; allow room for change." },
      EXP: { best: ["ISTP","ESTP"], challenge: ["INFJ","INTJ"], note: "Adventure buddies; balance planning and spontaneity." },
    };
    const key = mbtiGroup.toUpperCase() as keyof typeof m;
    return m[key] || { best: [], challenge: [], note: "" };
  })();

  // API 呼び出し（choices は省略可）
  const fetchPersonality = useCallback(async (choices?: Record<string, string | number>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/personality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(choices ? { choices } : {}), 
      });
      const raw = await res.text();
      if (!res.ok) throw new Error(raw || `HTTP ${res.status}`);
  const data = JSON.parse(raw);

  // 受信データを反映
  setMarkdown(data.markdown || "");
      setBadges(Array.isArray(data.badges) ? data.badges : []);

    // 現在値と履歴（Prev）を決定
    const incomingNow: Snapshot = data.now || { label: "Now", points: [] };
    const incomingHistory: Snapshot[] = Array.isArray(data.history) ? data.history : [];

    // localStorageに保存されている前回値を優先して履歴に採用
    try {
      const rawPrev = typeof window !== "undefined" ? localStorage.getItem(LS_PREV_KEY) : null;
      const parsedPrev: Snapshot | null = rawPrev ? JSON.parse(rawPrev) : null;
      const apiPrevPts = incomingHistory?.[0]?.points as AxisPoint[] | undefined;

      if (parsedPrev && Array.isArray(parsedPrev.points) && parsedPrev.points.length > 0) {
        // 保存PrevがNowと“ほぼ同じ”なら、API Prev（十分違う）を優先。無ければ合成Prev。
        if (isEffectivelySame(parsedPrev.points, incomingNow.points) || isNearlySame(parsedPrev.points, incomingNow.points)) {
          if (apiPrevPts && !isNearlySame(apiPrevPts, incomingNow.points)) {
            setHistory(incomingHistory);
          } else {
            setHistory([makeSyntheticPrev(incomingNow.points)]);
          }
        } else {
          setHistory([{ label: parsedPrev.label || "Prev", points: parsedPrev.points }, ...incomingHistory.filter((h: Snapshot) => h.label !== "Prev")]);
        }
      } else {
        // APIのPrevが無い/同一なら、初回だけ視覚上の比較用に合成Prevを作る
        const needSynthetic = (!incomingHistory?.length || isEffectivelySame(apiPrevPts, incomingNow.points)) && (incomingNow.points?.length || 0) > 0;
        if (needSynthetic) {
          setHistory([makeSyntheticPrev(incomingNow.points)]);
        } else {
          setHistory(incomingHistory);
        }
      }
    } catch {
      const apiPrev = incomingHistory?.[0]?.points as AxisPoint[] | undefined;
      const needSynthetic = (!incomingHistory?.length || isEffectivelySame(apiPrev, incomingNow.points)) && (incomingNow.points?.length || 0) > 0;
      if (needSynthetic) {
        setHistory([makeSyntheticPrev(incomingNow.points)]);
      } else {
        setHistory(incomingHistory);
      }
    }

    setNow(incomingNow);
    setMbtiType(typeof data.mbtiType === "string" ? data.mbtiType : "");

    // 今回のNowを次回用のPrevとして保存
    try {
      if (typeof window !== "undefined") {
        const prevPayload: Snapshot = { label: "Prev", points: incomingNow.points || [] };
        localStorage.setItem(LS_PREV_KEY, JSON.stringify(prevPayload));
      }
    } catch {}
    } catch (e: any) {
      setError(e?.message || String(e));
      console.error("[Result] personality error:", e);
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/choices.json", { cache: "no-store" });
        if (r.ok) {
          const choices = await r.json();
          await fetchPersonality(choices);
          return;
        }
      } catch {}
      await fetchPersonality();
    })();
  }, [fetchPersonality]);

    // Build a short share text from current data
    // (text share removed; we now share/save image)

    const onShare = async () => {
      // Share a dedicated social image (ShareCard)
      await exportShareCard(true);
    };

    // waitForImages not needed for ShareCard (static dimensions)

    // snapshot export removed in favor of dedicated social card export

    const exportShareCard = async (tryShare?: boolean) => {
      const el = document.getElementById("share-card-root");
      if (!el) return;
      try {
        setExporting(true);
        const bg = "#ffffff";
        const dataUrl = await toPng(el as HTMLElement, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: bg,
        });
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `share-${Date.now()}.png`, { type: "image/png" });
        if (tryShare && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "My Personality Snapshot" });
        } else {
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = file.name;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      } catch (e) {
        console.warn("export share card failed", e);
      } finally {
        setExporting(false);
      }
    };

  return (
    <div ref={captureRef} className={`result-layout theme-${mbtiGroup}`} aria-busy={loading}>
      <Generating open={loading} label="Generating your snapshot…" sub="It takes a few seconds" />

      <header className="rl-header">
        <div className="title-wrap">
          <h1 className="title">Result</h1>
          {displayMbti ? (
            <span className="mbti" aria-label="MBTI type" title="MBTI">
              {displayMbti}
            </span>
          ) : null}
          {headBadges.length > 0 && (
            <div className="title-badges" aria-label="Highlights (top)">
              {headBadges.map((b) => (
                <span key={b} className="badge badge-mini mbti-badge">{b}</span>
              ))}
            </div>
          )}
          <button
            className="share-btn"
            onClick={onShare}
            aria-label="Share or save image"
            disabled={exporting}
          >
            {exporting ? "Preparing…" : "Share / Save Image"}
          </button>
        </div>
        <p className="muted">
          {error ? <span style={{ color: "crimson" }}>({error})</span> : null}
        </p>
      </header>

      <section className="card grid-bottom">

        <Comment
          markdown={markdown}
          badges={badges}
          bestMatches={compat.best}
          challengeMatches={compat.challenge}
          compatibilityAdvice={compat.note}
        />
      </section>

      <section className="card grid-left-top">
        <ProfileRadar now={now} history={history} />
      </section>

      <section className="card grid-right-top">
        <MbtiPic mbti={displayMbti} size="lg" />
      </section>

      {/* Hidden ShareCard container for exporting a social image (1200x630) */}
      <div className="share-sandbox">
        <div id="share-card-root">
          <ShareCard
            mbti={displayMbti}
            highlights={hl}
            axes={(now?.points || []).map((p) => ({ axis: p.axis, value: (p.value ?? 0) / 100 }))}
            theme={(`theme-${mbtiGroup}`.slice(6) as any) || "ana"}
            bestMatches={compat.best}
            challengeMatches={compat.challenge}
          />
        </div>
      </div>
    </div>
  );
}
