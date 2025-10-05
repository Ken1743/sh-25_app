import "./Comment.css";
import ReactMarkdown from "react-markdown";
import { useMemo, type CSSProperties } from "react";

type Props = {
  markdown: string;
  badges?: string[];
  typeCode?: string; // 例: "INFJ"（任意）
  group?: "analysts" | "diplomats" | "sentinels" | "explorers"; // 任意
  comment?: string; // 追加: AIコメントを表示
  showPill?: boolean; // 追加: 見出し横のMBTIピルを出すか（デフォルト非表示）
  bestMatches?: string[]; // 相性の良いMBTI
  challengeMatches?: string[]; // 衝突しがちなMBTI
  compatibilityAdvice?: string; // ひとことアドバイス
};

export default function Comment({
  markdown,
  badges = [],
  typeCode = "INFJ",
  group = "diplomats",
  comment,
  showPill = false,
  bestMatches = [],
  challengeMatches = [],
  compatibilityAdvice,
}: Props) {
  // Prepare display text: remove everything from "Scored Signals" and below
  const { body, highlights, title, titleEmoji } = useMemo(() => {
    const raw = markdown || "";
    // Cut off from "Scored Signals" heading (with or without ##)
    const reScored = /(\n|^)#{0,6}\s*Scored\s+Signals[\s\S]*$/i;
    let trimmed = raw.replace(reScored, "").trim();

    // Extract first H1-like title (e.g., "# Your Personality Snapshot")
    let foundTitle = "";
    const linesAll = trimmed.split(/\r?\n/);
    const h1Idx = linesAll.findIndex((l) => /^\s*#\s+/.test(l));
    if (h1Idx >= 0) {
      foundTitle = linesAll[h1Idx].replace(/^\s*#\s+/, "").trim();
      linesAll.splice(h1Idx, 1); // remove the heading line
      trimmed = linesAll.join("\n").trim();
    }

    // Extract simple "Highlights" block: a line with "Highlights" followed by
    // 1..N non-empty lines, until a blank line or EOF
    const lines = trimmed.split(/\r?\n/);
    // Accept both plain line 'Highlights' and heading form '## Highlights'
    const idx = lines.findIndex((l) => /^\s*(?:#{1,6}\s*)?highlights\s*$/i.test(l));
    const items: string[] = [];
    let consumed = 0; // number of lines consumed in Highlights block
    if (idx >= 0) {
      for (let i = idx + 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line || /^\s*$/.test(line)) break;
        // Stop if next section heading appears
        if (/^#{1,6}\s/.test(line)) break;
        consumed++;
        // Strip common bullets and markers, including '•'
        const normalized = line.replace(/^[-*•]\s*/, "").trim();
        // Split comma/ja-comma/・/pipes/slashes into multiple badges
        const parts = normalized.split(/[、,・|/]/);
        for (const p of parts) {
          const v = p.trim();
          if (v) items.push(v);
        }
      }
    }
    // Remove the Highlights block from the body we feed to markdown
    let bodyText = trimmed;
    if (idx >= 0) {
      const end = idx + 1 + consumed; // remove only the consumed lines
      const before = lines.slice(0, idx).join("\n");
      const after = lines.slice(end).join("\n");
      bodyText = [before, after].filter(Boolean).join("\n\n").trim();
    }

    // Map highlights to emojis and class names
    const toKey = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, "");
    const emap: Record<string, { emoji: string; cls: string }> = {
      planning: { emoji: "🗓️", cls: "plan" },
      realistic: { emoji: "📏", cls: "real" },
      assertive: { emoji: "💪", cls: "assert" },
      actionfirst: { emoji: "⚡", cls: "action" },
      action: { emoji: "⚡", cls: "action" },
      thinking: { emoji: "🧠", cls: "think" },
      explorer: { emoji: "🧭", cls: "explore" },
      intuitive: { emoji: "✨", cls: "intuit" },
      feeling: { emoji: "💛", cls: "feel" },
      introvert: { emoji: "🌙", cls: "intro" },
      extrovert: { emoji: "🌞", cls: "extro" },
    };
    const mapped = items.filter(Boolean).map((t) => {
      // Clean markdown emphasis and surrounding quotes/punctuation
      let display = t
        .replace(/\*\*|__/g, "") // bold markers
        .replace(/[\*_`~]/g, "") // other emphasis ticks
        .replace(/^\s*["'“”]+|["'“”]+\s*$/g, "") // surrounding quotes
        .trim();
      // Drop a trailing period or similar punctuation
      display = display.replace(/[。．｡\.!?、,\s]+$/u, "");
      const key = toKey(display);
      const m = emap[key] || { emoji: "✨", cls: "" };
      return { text: display, emoji: m.emoji, cls: m.cls };
    });

    // Pick an emoji for title (use first highlight or fallback)
    const titleEmoji = mapped[0]?.emoji || "🌟";

    // Remove trailing periods from bullet items only (not normal paragraphs)
    // Normalize bullet-form Top3 labels (e.g., "- Best (Top 3)") into standalone
    // paragraph lines so they won't render as <li> but as <p class="md-top3 ...">.
    const normalizedTop3 = bodyText
      .replace(/^[\t\s]*[-*•][\t\s]*(Best\s*\(\s*Top\s*3\s*\)\s*:?)\s*$/gim, "\n$1\n")
      .replace(/^[\t\s]*[-*•][\t\s]*((?:Challenge|Challenges)\s*\(\s*Top\s*3\s*\)\s*:?)\s*$/gim, "\n$1\n");

    const bodyPretty = normalizedTop3
      .split(/\r?\n/)
      .map((line) => {
        // Remove a period placed right before an emoji, e.g., "text. 💡" -> "text 💡"
        // Use broad emoji ranges for compatibility instead of Unicode properties.
        const emojiBefore = /([。｡．\.])\s*([\u{1F300}-\u{1FAFF}\u{1F900}-\u{1F9FF}\u{2600}-\u{27BF}])/gu;
        let out = line.replace(emojiBefore, "$2");
        // For bullet items, also remove trailing periods
        if (/^\s*[-*•]\s+/.test(out)) {
          out = out.replace(/[。\.]+\s*$/u, "");
        }
        return out;
      })
      .join("\n");

    return { body: bodyPretty, highlights: mapped, title: foundTitle, titleEmoji };
  }, [markdown]);

  return (
    <div className="mbti-pic">
      {showPill && (
        <div className={`mbti-pill ${group}`}>
          <span className="mbti-type">{typeCode}</span>
        </div>
      )}
      <div className="mbti-text">
        {title ? (
          <h2 className="card-title">
            {title} {titleEmoji}
          </h2>
        ) : null}
        {badges.length > 0 && (
          <div className="mbti-badges" style={{ marginBottom: 8 }}>
            {badges.map((b) => (
              <span key={b} className="badge">
                {b}
              </span>
            ))}
          </div>
        )}
        <div className="markdown-view" aria-live="polite">
          <ReactMarkdown
            components={{
              h2({ node, children, ...props }) {
                // Extract plain text from children
                const getText = (n: any): string => {
                  if (typeof n === "string") return n;
                  if (Array.isArray(n)) return n.map(getText).join("");
                  if (n && typeof n === "object" && "props" in n) {
                    // @ts-ignore
                    return getText((n as any).props?.children);
                  }
                  return "";
                };
                const label = getText(children).trim().toLowerCase();
                let variant = "";
                if (label === "key traits") variant = "md-key";
                else if (label === "in daily life") variant = "md-daily";
                else if (label === "friendly tips") variant = "md-tips";
                else if (label === "compability" || label === "compatibility") variant = "md-compat";
                else if (label === "highlights") variant = "md-highlights";
                // Emoji per section
                const emoji =
                  variant === "md-key"
                    ? "🧩"
                    : variant === "md-daily"
                    ? "🏃"
                    : variant === "md-tips"
                    ? "💡"
                    : variant === "md-highlights"
                    ? "✨"
                    : variant === "md-compat"
                    ? "❤️"
                    : "";
                return (
                  <h3 className={`md-h2 ${variant}`} {...props}>
                    {children} {emoji && <span aria-hidden>{emoji}</span>}
                  </h3>
                );
              },
              h3({ node, children, ...props }) {
                // Normalize h3 that are actually Top3 subtitles to paragraphs
                const getText = (n: any): string => {
                  if (typeof n === "string") return n;
                  if (Array.isArray(n)) return n.map(getText).join("");
                  if (n && typeof n === "object" && "props" in n) {
                    // @ts-ignore
                    return getText((n as any).props?.children);
                  }
                  return "";
                };
                const label = getText(children).trim().toLowerCase();
                const isBest = /^best\s*\(\s*top\s*3\s*\)\s*:?$/.test(label);
                const isChallenge = /^(challenge|challenges)\s*\(\s*top\s*3\s*\)\s*:?$/.test(label);
                if (isBest || isChallenge) {
                  const cls = isBest ? "md-top3 md-top3-best" : "md-top3 md-top3-chal";
                  return (
                    <p className={cls} {...props}>
                      {children}
                    </p>
                  );
                }
                return <h3 {...props}>{children}</h3>;
              },
              p({ node, children, ...props }) {
                // Convert specific paragraphs to labeled bars
                const getText = (n: any): string => {
                  if (typeof n === "string") return n;
                  if (Array.isArray(n)) return n.map(getText).join("");
                  if (n && typeof n === "object" && "props" in n) {
                    // @ts-ignore
                    return getText((n as any).props?.children);
                  }
                  return "";
                };
                const label = getText(children).trim().toLowerCase();
                const isBest = /^best\s*\(\s*top\s*3\s*\)\s*:?$/.test(label);
                const isChallenge = /^(challenge|challenges)\s*\(\s*top\s*3\s*\)\s*:?$/.test(label);
                if (isBest || isChallenge) {
                  const cls = isBest ? "md-top3 md-top3-best" : "md-top3 md-top3-chal";
                  return (
                    <p className={cls} {...props}>
                      {children}
                    </p>
                  );
                }
                return <p {...props}>{children}</p>;
              },
            }}
          >
            {body}
          </ReactMarkdown>
        </div>

        {highlights.length > 0 && (
          <div className="highlight-wrap" aria-label="Highlights">
            <h3 className="md-h2 md-highlights">
              Highlights <span aria-hidden>✨</span>
            </h3>
            {highlights.map((h) => {
              const styleMap: Record<string, CSSProperties> = {
                plan: { background: "#eaf3ff", color: "#175cd3" },
                real: { background: "#e8f5e9", color: "#1b5e20" },
                assert: { background: "#fdecea", color: "#d32f2f" },
                action: { background: "#fff6e6", color: "#b45309" },
                think: { background: "#eef2ff", color: "#3730a3" },
                explore: { background: "#ecfeff", color: "#0e7490" },
                intuit: { background: "#f5f3ff", color: "#7c3aed" },
                feel: { background: "#fff1f2", color: "#be123c" },
                intro: { background: "#f1f5f9", color: "#334155" },
                extro: { background: "#fff7ed", color: "#9a3412" },
              };
              // Fallback palette for unknown keys so colors vary nicely
              const palette: Array<{ bg: string; fg: string }> = [
                { bg: "#eef2ff", fg: "#3730a3" }, // indigo
                { bg: "#f5f3ff", fg: "#7c3aed" }, // violet
                { bg: "#ecfeff", fg: "#0e7490" }, // cyan
                { bg: "#f0fdf4", fg: "#166534" }, // green
                { bg: "#fff7ed", fg: "#9a3412" }, // orange
                { bg: "#fff1f2", fg: "#be123c" }, // rose
                { bg: "#faf5ff", fg: "#6b21a8" }, // purple
                { bg: "#fefce8", fg: "#854d0e" }, // amber
              ];
              const styleKnown = h.cls ? styleMap[h.cls] : undefined;
              let style: CSSProperties | undefined = styleKnown;
              if (!styleKnown) {
                // simple hash from text
                let hash = 0;
                for (let i = 0; i < h.text.length; i++) hash = (hash * 31 + h.text.charCodeAt(i)) >>> 0;
                const pick = palette[hash % palette.length];
                style = { background: pick.bg, color: pick.fg };
              }
              return (
                <span key={h.text} className={`badge ${h.cls}`} style={style}>
                  <span aria-hidden>{h.emoji}</span> {h.text}
                </span>
              );
            })}
          </div>
        )}

        {comment ? (
          <div className="mbti-comment" style={{ marginTop: 12 }}>
            <strong>Comment</strong>
            <p style={{ margin: "6px 0 0" }}>{comment}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
//