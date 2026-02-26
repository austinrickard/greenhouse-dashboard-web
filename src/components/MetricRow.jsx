import { COLORS } from "../config";

export default function MetricRow({ metrics }) {
  return (
    <div className="metric-row">
      {metrics.map((m, i) => (
        <div key={i} className="metric-card">
          <p className="metric-label">{m.label}</p>
          <p className="metric-value">{m.value}</p>
          {m.delta && <p className="metric-delta">{m.delta}</p>}
        </div>
      ))}
    </div>
  );
}
