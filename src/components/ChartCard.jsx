import Plot from "react-plotly.js";

const BASE_CONFIG = {
  responsive: true,
  displayModeBar: false,
};

export default function ChartCard({ title, data, layout, style }) {
  return (
    <div className="chart-card">
      {title && <h3 className="chart-title">{title}</h3>}
      <Plot
        data={data}
        layout={{
          margin: { l: 40, r: 20, t: 10, b: 40 },
          font: { family: "Inter, system-ui, sans-serif" },
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          ...layout,
        }}
        config={BASE_CONFIG}
        useResizeHandler
        style={{ width: "100%", ...style }}
      />
    </div>
  );
}
