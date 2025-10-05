import "./Comment.css";
import ReactMarkdown from "react-markdown";
import { useMemo } from "react";

type Props = {
  markdown: string, // ここは今はテキスト表示（必要なら react-markdown に置換OK）
  badges?: string[],
  typeCode?: string, // 例: "INFJ"（任意）
  group?: "analysts" | "diplomats" | "sentinels" | "explorers", // 任意
  comment?: string, // 追加: AIコメントを表示
  showPill?: boolean, // 追加: 見出し横のMBTIピルを出すか（デフォルト非表示）
};

export default function MbtiPic({
  markdown,
  badges = [],
  typeCode = "INFJ",
  group = "diplomats",
  comment,
  showPill = false,
}: Props) {
  // Prepare display text: remove everything from "Scored Signals" and below
  const { body, highlights } = useMemo(() => {
    const raw = markdown || "";
    // Cut off from "Scored Signals" heading (with or without ##)
    const reScored = /(\n|^)#{0,6}\s*Scored\s+Signals[\s\S]*$/i;
    const trimmed = raw.replace(reScored, "").trim();

    // Extract simple "Highlights" block: a line with "Highlights" followed by
    // 1..N non-empty lines, until a blank line or EOF
    const lines = trimmed.split(/\r?\n/);
    const idx = lines.findIndex((l) => /^\s*highlights\s*$/i.test(l));
    const items: string[] = [];
    if (idx >= 0) {
      for (let i = idx + 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line || /^\s*$/.test(line)) break;
        // Skip headings or label-like lines (defensive)
        if (/^#{1,6}\s/.test(line)) break;
        items.push(line.replace(/^[-*]\s*/, "").trim());
      }
    }
    // Remove the Highlights block from the body we feed to markdown
    let bodyText = trimmed;
    if (idx >= 0) {
      const end = idx + 1 + items.length;
      const before = lines.slice(0, idx).join("\n");
      const after = lines.slice(end).join("\n");
      bodyText = [before, after].filter(Boolean).join("\n\n").trim();
    }

    return { body: bodyText, highlights: items.filter(Boolean) };
  }, [markdown]);

  return (
    <div className="mbti-pic">
      {showPill && (
        <div className={`mbti-pill ${group}`}>
          <span className="mbti-type">{typeCode}</span>
        </div>
      )}

      <div className="mbti-badges">
        {badges.map((b) => (
          <span key={b} className="badge">
            {b}
          </span>
        ))}
      </div>

      <div className="mbti-text">
        <div className="markdown-view" aria-live="polite">
          <ReactMarkdown>{body}</ReactMarkdown>
        </div>
        {highlights.length > 0 && (
          <div className="highlight-wrap" aria-label="Highlights">
            {highlights.map((h) => (
              <span key={h} className="badge">{h}</span>
            ))}
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
