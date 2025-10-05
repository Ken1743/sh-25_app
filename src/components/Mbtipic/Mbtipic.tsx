// src/components/Mbtipic/MbtiPic.tsx
import "./MbtiPic.css";

type Props = {
  /** 例: "INFJ"（大文字/小文字どちらでもOK） */
  mbti: string;
  /** 画像サイズ */
  size?: "sm" | "md" | "lg";
  /** 下にラベル（INFJなど）を表示するか */
  showLabel?: boolean;
};

export default function MbtiPic({ mbti, size = "md", showLabel = true }: Props) {
  const code = (mbti || "").toUpperCase().replace(/[^A-Z]/g, "");
  const isValid = /^[IE][NS][FT][JP]$/.test(code);

  // 画像は /public/mbti/INFJ.png などに置く想定
  const src = isValid ? `/mbti/${code}.jpg` : `/mbti/_placeholder.png`;

  return (
    <figure className={`mbti-pic ${size}`}>
      {/* 読み込み失敗時はプレースホルダーに差し替え */}
      <img
        src={src}
        alt={isValid ? `${code} illustration` : "MBTI illustration"}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = "/mbti/_placeholder.png";
        }}
      />
      {showLabel && (
        <figcaption className="mbti-label">{isValid ? code : "MBTI"}</figcaption>
      )}
    </figure>
  );
}
