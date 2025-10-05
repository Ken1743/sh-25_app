import { useMemo } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, ResponsiveContainer, Tooltip } from "recharts";
import "./ProfileRader.css";


type AxisPoint = { axis: string; value: number };
type Snapshot = { label: string; points: AxisPoint[] };

type Props = {
  now: Snapshot;
  history?: Snapshot[];
  nowLabel?: string;
  pastLabel?: string; 
};

function composeRadarData(allSeries: Snapshot[]): Array<Record<string, number | string>> {
  const axes = Array.from(new Set(allSeries.flatMap((s) => s.points.map((p) => p.axis))));
  return axes.map((axis) => {
    const row: Record<string, number | string> = { axis };
    for (const s of allSeries) {
      const pt = s.points.find((p) => p.axis === axis);
      row[s.label] = pt ? pt.value : 0;
    }
    return row;
  });
}

export default function ProfileRadar({ now, history = [] }: Props) {
  const radarData = useMemo(
    () => composeRadarData([...(history || []), now].filter(Boolean)),
    [now, history]
  );

  // --- Tooltip helpers ---
  const explain = (axis: string, v: number): string => {
    const bucket = v >= 65 ? "high" : v <= 35 ? "low" : "mid";
    switch ((axis || "").toLowerCase()) {
      case "openness":
        return bucket === "high"
          ? "You like new ideas and imagination"
          : bucket === "low"
          ? "You prefer familiar things and clear rules"
          : "You enjoy both new and familiar things";
      case "conscientiousness":
        return bucket === "high"
          ? "You like to plan and finish tasks"
          : bucket === "low"
          ? "You go with the flow and decide later"
          : "You plan sometimes and relax sometimes";
      case "extraversion":
        return bucket === "high"
          ? "You gain energy from people and action"
          : bucket === "low"
          ? "You recharge with quiet and solo time"
          : "You like both people time and quiet time";
      case "agreeableness":
        return bucket === "high"
          ? "You are kind and value harmony"
          : bucket === "low"
          ? "You are direct and honest about needs"
          : "You are kind but also speak up";
      case "neuroticism":
        return bucket === "high"
          ? "You feel stress easily; gentle routines help"
          : bucket === "low"
          ? "You stay calm in many situations"
          : "You feel ups and downs, then balance again";
      default:
        return "";
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    // payload contains entries for each series at the current axis
    const axis = label as string;
    // Prefer the "Now" series for description; else fall back to first
    const nowEntry = payload.find((p: any) => (p?.name || "").toLowerCase() === "now") || payload[0];
    const nowVal = typeof nowEntry?.value === "number" ? nowEntry.value : 0;
    const desc = explain(axis, nowVal);
    return (
      <div style={{
        background: "#fff",
        border: "1px solid #e6e6ef",
        borderRadius: 8,
        boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
        padding: 10,
        color: "#2e3142",
        maxWidth: 260
      }}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>{axis}</div>
        <div style={{ display: "grid", gap: 2, marginBottom: desc ? 6 : 0 }}>
          {payload.map((p: any) => (
            <div key={p.dataKey} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, background: p.color, borderRadius: 2, display: "inline-block" }} />
              <span style={{ fontSize: 12, color: "#5b6070" }}>{p.name}:</span>
              <strong style={{ fontSize: 12 }}>{Math.round(p.value)}%</strong>
            </div>
          ))}
        </div>
        {desc ? (
          <div style={{ fontSize: 12, color: "#61667a" }}>{desc}</div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="radar">
      <h2 className="card-title">Profile Radar</h2>
      <div className="chart-box">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} margin={{ top: 6, right: 8, bottom: 6, left: 8 }}>
            <PolarGrid />
            <PolarAngleAxis dataKey="axis" />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tickCount={6} />
            {history.map((h) => (
              <Radar
                key={h.label}
                name={h.label}
                dataKey={h.label}
                stroke="var(--radar-prev-stroke)"
                fill="var(--radar-prev-fill)"
                fillOpacity={0.12}
              />
            ))}
            <Radar
              name={now.label}
              dataKey={now.label}
              stroke="var(--radar-now-stroke)"
              fill="var(--radar-now-fill)"
              fillOpacity={0.24}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
