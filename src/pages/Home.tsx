import { useState, useRef } from "react";
import "./Home.css";
import IntroOverlay from "../components/IntroOverlay/IntroOverlay";

export default function HomePage() {

  const [showIntro, setShowIntro] = useState(true);
  // Unity instance 型定義（SendMessage メソッドを持つ型を指定）
  type UnityInstance = { SendMessage: (gameObject: string, method: string) => void };
  const unityRef = useRef<UnityInstance | null>(null); // あなたの Unity instance を保持

  const handleStart = async () => {
    // Overlay を閉じる（ちらつき防止）
    setShowIntro(false);
    // 同一オリジン内にある Unity ビルドへ遷移。
    // 大文字/小文字の両方を試し、最初に見つかった方へ飛ぶ。
    const candidates = ["/Unity/index.html", "/unity/index.html"];
    for (const url of candidates) {
      try {
        const r = await fetch(url, { method: "HEAD", cache: "no-store" });
        if (r.ok) {
          window.location.href = url;
          return;
        }
      } catch {}
    }
    // 最後のフォールバック
    window.location.href = candidates[candidates.length - 1];
  };

  return (
    <div className="home-page">
      <div className="unity-wrap">
        {/* Optional placeholder if Unity isn't mounted yet */}
        <div className="unity-canvas" aria-hidden>
          Unity Canvas
        </div>
      {/* Unity WebGL Canvas / コンポーネント（既存のもの） */}
      {/* 例：<UnityGame ref={unityRef} /> */}

      {showIntro && <IntroOverlay onStart={handleStart} />}
      </div>
    </div>
  );
}
