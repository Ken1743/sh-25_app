import "./MbtiPic.css";

type Props = {
  mbti: string;
  size?: "sm" | "md" | "lg";
};

export default function MbtiPic({ mbti, size = "md" }: Props) {
  const code = (mbti || "").toUpperCase().replace(/[^A-Z]/g, "");
  const isValid = /^[IE][NS][FT][JP]$/.test(code);

  const src = isValid ? `/mbti/${code}.png` : `/mbti/placeholder.jpg`;

  return (
    <figure className={`mbti-pic ${size}`}>
      <img
        src={src}
        alt={isValid ? `${code} illustration` : "MBTI illustration"}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = "/mbti/placeholder.jpg";
        }}
      />
    </figure>
  );
}
