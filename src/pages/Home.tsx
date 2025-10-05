import { useState, useRef } from "react";
import "./Home.css";
import IntroOverlay from "../components/IntroOverlay/IntroOverlay";
import UnityGame from "../components/UnityGame/UnityGame";
import type { UnityInstance } from "../types/unity";

export default function HomePage() {
  const [showIntro, setShowIntro] = useState(true);
  const unityRef = useRef<UnityInstance | null>(null);

  const handleStart = async () => {
    setShowIntro(false);
    const candidates = ["/Unity/index.html", "/unity/index.html"];
    for (const url of candidates) {
      try {
        const r = await fetch(url, { method: "HEAD", cache: "no-store" });
        if (r.ok) { window.location.href = url; return; }
      } catch {}
    }
    window.location.href = candidates[candidates.length - 1];
  };

  // 例：Unityへ通知
  // unityRef.current?.SendMessage("GameManager", "OnResultReady");

  return (
    <div className="home-page">
      <div className="unity-wrap">
        <UnityGame ref={unityRef} />
        {showIntro && <IntroOverlay onStart={handleStart} />}
      </div>
    </div>
  );
}
