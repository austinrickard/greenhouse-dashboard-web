import { useMemo } from "react";
import { useFilters } from "../context/FilterContext";
import { COLORS, CHART_PALETTE } from "../config";
import { fmtDays } from "../utils/formatters";
import PageHeader from "../components/PageHeader";
import MetricRow from "../components/MetricRow";
import ChartCard from "../components/ChartCard";

function mean(arr) {
  if (arr.length === 0) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr) {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export default function TimeToHire() {
  const { filteredJobs, rawData } = useFilters();

  const kpis = useMemo(() => {
    const tthValues = filteredJobs
      .map((r) => r.DaysToAcceptedOffer)
      .filter((v) => v != null && !isNaN(v) && v >= 0);
    const daysOpenValues = filteredJobs
      .map((r) => r.JobOpenDays)
      .filter((v) => v != null && !isNaN(v));

    return {
      avgTTH: mean(tthValues),
      medianTTH: median(tthValues),
      avgDaysOpen: mean(daysOpenValues),
      ytdTTH: rawData.kpiScalars?.avg_tth_ytd ?? null,
    };
  }, [filteredJobs, rawData.kpiScalars]);

  // Box plot data — one box per Division
  const boxTraces = useMemo(() => {
    const divs = [...new Set(filteredJobs.map((r) => r.Division).filter(Boolean))];
    return divs.map((div, i) => ({
      type: "box",
      name: div,
      y: filteredJobs
        .filter((r) => r.Division === div && r.DaysToAcceptedOffer != null && r.DaysToAcceptedOffer >= 0)
        .map((r) => r.DaysToAcceptedOffer),
      marker: { color: CHART_PALETTE[i % CHART_PALETTE.length] },
    }));
  }, [filteredJobs]);

  // Histogram of Days to Offer
  const histValues = useMemo(
    () => filteredJobs.map((r) => r.DaysToAcceptedOffer).filter((v) => v != null && v >= 0),
    [filteredJobs]
  );

  // Monthly TTH trend
  const trendData = useMemo(() => {
    const rows = filteredJobs.filter(
      (r) => r.JobCloseDate && r.DaysToAcceptedOffer != null && r.DaysToAcceptedOffer >= 0
    );
    const byMonth = {};
    rows.forEach((r) => {
      const month = r.JobCloseDate.substring(0, 7); // "YYYY-MM"
      if (!byMonth[month]) byMonth[month] = [];
      byMonth[month].push(r.DaysToAcceptedOffer);
    });
    const sorted = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]));
    return {
      months: sorted.map((e) => e[0] + "-01"),
      values: sorted.map((e) => mean(e[1])),
    };
  }, [filteredJobs]);

  // Avg Days by Department (horizontal bar)
  const deptTTH = useMemo(() => {
    const map = {};
    filteredJobs.forEach((r) => {
      if (r.Department && r.DaysToAcceptedOffer != null && r.DaysToAcceptedOffer >= 0) {
        if (!map[r.Department]) map[r.Department] = [];
        map[r.Department].push(r.DaysToAcceptedOffer);
      }
    });
    const entries = Object.entries(map)
      .map(([dept, vals]) => ({ dept, avg: mean(vals) }))
      .sort((a, b) => a.avg - b.avg);
    return {
      departments: entries.map((e) => e.dept),
      values: entries.map((e) => e.avg),
    };
  }, [filteredJobs]);

  if (filteredJobs.length === 0) {
    return (
      <>
        <PageHeader title="Time-to-Hire & Efficiency" description="Analyze hiring speed and identify bottlenecks across divisions and departments." />
        <p className="empty-state">No data available for the selected filters.</p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Time-to-Hire & Efficiency"
        description="Analyze hiring speed and identify bottlenecks across divisions and departments."
      />

      <MetricRow
        metrics={[
          { label: "Avg Days to Offer", value: fmtDays(kpis.avgTTH) },
          { label: "Median Days to Offer", value: fmtDays(kpis.medianTTH) },
          { label: "Avg Days Open", value: fmtDays(kpis.avgDaysOpen) },
          { label: "YTD Avg TTH (table)", value: fmtDays(kpis.ytdTTH) },
        ]}
      />

      <div className="two-col" style={{ marginTop: 16 }}>
        <ChartCard
          title="Days to Accepted Offer by Division"
          data={boxTraces}
          layout={{
            height: 450,
            showlegend: false,
            xaxis: { title: "" },
            yaxis: { title: "Days to Accepted Offer" },
          }}
        />

        <ChartCard
          title="Distribution of Days to Offer"
          data={[
            {
              type: "histogram",
              x: histValues,
              nbinsx: 30,
              marker: { color: COLORS.primary },
            },
          ]}
          layout={{
            height: 450,
            xaxis: { title: "Days to Accepted Offer" },
            yaxis: { title: "Count" },
            showlegend: false,
          }}
        />
      </div>

      {trendData.months.length > 0 && (
        <ChartCard
          title="Average Time-to-Hire Trend"
          data={[
            {
              type: "scatter",
              mode: "lines+markers",
              x: trendData.months,
              y: trendData.values,
              marker: { color: COLORS.primary },
              line: { color: COLORS.primary },
            },
          ]}
          layout={{
            height: 350,
            xaxis: { title: "" },
            yaxis: { title: "Avg Days to Offer" },
          }}
        />
      )}

      {deptTTH.departments.length > 0 && (
        <ChartCard
          title="Average Days to Offer by Department"
          data={[
            {
              type: "bar",
              x: deptTTH.values,
              y: deptTTH.departments,
              orientation: "h",
              marker: {
                color: deptTTH.values,
                colorscale: [
                  [0, "#2ECC71"],
                  [0.5, "#F39C12"],
                  [1, "#E74C3C"],
                ],
              },
            },
          ]}
          layout={{
            height: Math.max(300, deptTTH.departments.length * 28),
            margin: { l: 180, r: 20, t: 10, b: 40 },
            yaxis: { title: "" },
            xaxis: { title: "Avg Days to Accepted Offer" },
            coloraxis: { showscale: false },
          }}
        />
      )}
    </>
  );
}
