// src/pages/Result.tsx
import { useCallback, useEffect, useState } from "react";
import "./Result.css";

import Generating from "../components/Generating/Generating";
import Comment from "../components/Comment/Comment";
import ProfileRadar from "../components/ProfileRader/ProfileRader";
import MbtiPic from "../components/Mbtipic/MbtiPic";

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

  // Fallback: try to extract an MBTI code from markdown if API field is empty
  const extractMbti = (text: string) => {
    const m = (text || "").toUpperCase().match(/\b[IE][NS][TF][JP]\b/);
    return m?.[0] || "";
  };
  const displayMbti = (mbtiType && mbtiType.toUpperCase()) || extractMbti(markdown);

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

  return (
    <div className="result-layout theme-ana" aria-busy={loading}>
      <Generating open={loading} label="Generating your snapshot…" sub="It takes a few seconds" />

      <header className="rl-header">
        <div className="title-wrap">
          <h1 className="title">Result</h1>
          {displayMbti ? (
            <span className="mbti" aria-label="MBTI type" title="MBTI">
              {displayMbti}
            </span>
          ) : null}
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
        <Comment markdown={markdown} badges={badges} />
      </section>

      <section className="card grid-left-top">
        <ProfileRadar now={now} history={history} />
      </section>

      <section className="card grid-right-top">
  <MbtiPic mbti={displayMbti} size="lg" />
      </section>
    </div>
  );
}
