import { useMemo } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, ResponsiveContainer, Tooltip } from "recharts";
import "./ProfileRader.css";


type AxisPoint = { axis: string; value: number };
type Snapshot = { label: string; points: AxisPoint[] };

type Props = {
  now: Snapshot;
  history?: Snapshot[];
  nowLabel?: string;
  pastLabel?: string; // 使わない場合も label をそのまま使える
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
                stroke="var(--border)"         /* 薄色線 */
                fill="var(--accent)"           /* アクセント */
                fillOpacity={0.12}
              />
            ))}
            <Radar
              name={now.label}
              dataKey={now.label}
              stroke="var(--accent)"
              fill="var(--accent)"
              fillOpacity={0.24}
            />
            <Tooltip />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <p className="muted small">
        Axes are flexible. Send 4 or 5 dimensions in <code>now.points</code> &amp; <code>history[].points</code>.
      </p>
    </div>
  );
}
