import "./Mbtipic.css";

type Props = {
  markdown: string, // ここは今はテキスト表示（必要なら react-markdown に置換OK）
  badges?: string[],
  typeCode?: string, // 例: "INFJ"（任意）
  group?: "analysts" | "diplomats" | "sentinels" | "explorers", // 任意
};

export default function MbtiPic({
  markdown,
  badges = [],
  typeCode = "INFJ",
  group = "diplomats",

}: Props) {
  return (
    <div className="mbti-pic">
      <div className={`mbti-pill ${group}`}>
        <span className="mbti-type">{typeCode}</span>
      </div>

      <div className="mbti-badges">
        {badges.map((b) => (
          <span key={b} className="badge">
            {b}
          </span>
        ))}
      </div>

      <div className="mbti-text">
        <pre className="markdown-view" aria-live="polite">
          {markdown}
        </pre>
      </div>
    </div>
  );
}
