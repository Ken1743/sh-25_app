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
  const hl = badges.length ? badges : extractHighlights(markdown);
  const clean = (s: string) => s.replace(/\*\*/g, "").replace(/^\s*[-*•]\s*/, "").trim();
  const cleanedBadges = hl.map(clean).filter(Boolean);
  const headBadges = cleanedBadges.slice(0, 2);

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

  setMarkdown(data.markdown || "");
      setBadges(Array.isArray(data.badges) ? data.badges : []);
    if (data.now) setNow(data.now);
  if (Array.isArray(data.history)) setHistory(data.history);
    setMbtiType(typeof data.mbtiType === "string" ? data.mbtiType : "");
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
        {now?.points?.length ? (
          <div className="bigfive-list" aria-label="Big Five percentages">
            {now.points.map((p) => (
              <div key={p.axis} className="bf-row">
                <span className="bf-name">{p.axis}</span>
                <span className="bf-bar"><span className="bf-fill" style={{ width: `${Math.round(p.value)}%` }} /></span>
                <span className="bf-pct">{Math.round(p.value)}%</span>
              </div>
            ))}
          </div>
        ) : null}
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
