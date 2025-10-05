import "./ShareCard.css";

export type ShareCardProps = {
  mbti: string;
  highlights: string[];
  axes: Array<{ axis: string; value: number }>;
  theme: "ana" | "dip" | "sen" | "exp";
  title?: string;
  subtitle?: string;
  bestMatches?: string[];
  challengeMatches?: string[];
};

// 1200x630 social card by default
export default function ShareCard({
  mbti,
  highlights,
  axes,
  theme,
  title = "Your Personality Snapshot",
  subtitle = "Made with sh-25",
  bestMatches = [],
  challengeMatches = [],
}: ShareCardProps) {
  const imgSrc = mbti ? `/mbti/${mbti.toUpperCase()}.png` : "/mbti/placeholder.png";
  const clean = (s: string) => s.replace(/\*\*/g, "").trim();
  return (
    <div className={`share-card theme-${theme}`} role="img" aria-label="Share preview card">
      <div className="sc-header">
        <div className="sc-avatar">
          <img src={imgSrc} alt="MBTI" crossOrigin="anonymous" />
        </div>
        <div className="sc-title-wrap">
          <div className="sc-title">{title}</div>
          <div className="sc-subtitle">{subtitle}</div>
        </div>
        <div className="sc-mbti" aria-label="MBTI type">{mbti || "MBTI"}</div>
      </div>

      <div className="sc-body">
        <div className="sc-axes sc-axes-center">
          {axes.map((p) => (
            <div key={p.axis} className="sc-ax">
              <span className="name">{p.axis}</span>
              <span className="bar"><span className="fill" style={{ width: `${Math.round(p.value * 100)}%` }} /></span>
              <span className="pct">{Math.round(p.value * 100)}%</span>
            </div>
          ))}
        </div>
        <div className="sc-highlights">
          {highlights.slice(0, 6).map((raw) => {
            const h = clean(raw);
            return (
            <span key={h} className="sc-badge">
              <span className="emoji" aria-hidden>✨</span>
              {h}
            </span>
            );
          })}
        </div>
      </div>
      {(bestMatches.length > 0 || challengeMatches.length > 0) && (
        <div className="sc-compat">
          {bestMatches.length > 0 && (
            <div className="row">
              <span className="tag good">Best</span>
              {bestMatches.map((t) => (
                <span key={t} className="chip">{t}</span>
              ))}
            </div>
          )}
          {challengeMatches.length > 0 && (
            <div className="row">
              <span className="tag caution">Challenge</span>
              {challengeMatches.map((t) => (
                <span key={t} className="chip warn">{t}</span>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="sc-footer">
        <span className="brand">sh-25</span>
      </div>
    </div>
  );
}
