import "./Generating.css";

type GeneratingProps = {
  open: boolean;
  label: string;
  sub?: string;
};

export default function Generating({ open, label, sub }: GeneratingProps) {
  if (!open) return null;
  return (
    <div className="gen-overlay" role="status" aria-live="polite">
      <div className="gen-card">
        <div className="gen-spinner" aria-hidden />
        <div className="gen-texts">
          <div className="gen-title">{label}</div>
          {sub ? <div className="gen-sub">{sub}</div> : null}
        </div>
      </div>
    </div>
  );
}
