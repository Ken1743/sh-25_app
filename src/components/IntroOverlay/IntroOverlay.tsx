import "./IntroOverlay.css";

interface IntroOverlayProps {
  onStart: () => void;
}

export default function IntroOverlay({ onStart }: IntroOverlayProps) {
  return (
    <div className="intro-overlay">
      <div className="intro-card">
        <h1 className="intro-title">Morning Rush</h1>
        <p className="intro-copy">
          Good morning ☀️ It's 7:00 a.m ⏰ You want to leave home by 10:00 🏠 <br />
          Choose what you'd do in each scene and try to get ready in time!!
        </p>
        <button className="intro-button" onClick={onStart}>
          Start
        </button>
      </div>
    </div>
  );
}
