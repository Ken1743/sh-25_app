// src/pages/Result.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import "./Result.css";

import Generating from "../components/Generating/Generating";
import Comment from "../components/Comment/Comment";
import ProfileRadar from "../components/ProfileRader/ProfileRader";
import MbtiPic from "../components/Mbtipic/MbtiPic";
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
      // Share as image instead of plaintext
      await exportImage(true);
    };

    const waitForImages = async (root: HTMLElement) => {
      const imgs = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
      await Promise.all(
        imgs.map((img) =>
          img.complete && img.naturalWidth > 0
            ? Promise.resolve()
            : new Promise<void>((res) => {
                img.onload = () => res();
                img.onerror = () => res();
              })
        )
      );
    };

    const exportImage = async (tryShare?: boolean) => {
      const el = captureRef.current as HTMLElement | null;
      if (!el) return;
      try {
        setExporting(true);
        el.classList.add("export-ready");
        await waitForImages(el);
        const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#ffffff';
        const dataUrl = await toPng(el, {
          cacheBust: true,
          pixelRatio: 3,
          backgroundColor: bg || "#ffffff",
        });
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `snapshot-${Date.now()}.png`, { type: "image/png" });
        if (tryShare && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "My Personality Snapshot" });
        } else {
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = file.name;
          document.body.appendChild(a);
          a.click();
          a.remove();
          // no toast
        }
      } catch (e) {
        console.warn("export failed", e);
      } finally {
        el.classList.remove("export-ready");
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
          <button
            className="share-btn"
            onClick={onShare}
            aria-label="Share or save image"
            disabled={exporting}
          >
            {exporting ? "Preparing…" : "Share / Save Image"}
          </button>
          <div className="badge-wrap">
            {badges.map((b) => (
              <span key={b} className="badge">{b}</span>
            ))}
          </div>
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

      {/* Hidden ShareCard container for exporting image */}
      <div className="share-sandbox">
        {/* ShareCard component removed */}
      </div>
    </div>
  );
}
