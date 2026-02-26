import { useMemo } from "react";
import { useFilters } from "../context/FilterContext";
import { COLORS, CHART_PALETTE } from "../config";
import { fmtNumber } from "../utils/formatters";
import PageHeader from "../components/PageHeader";
import MetricRow from "../components/MetricRow";
import ChartCard from "../components/ChartCard";

export default function HiresSource() {
  const { filteredJobs, filteredHiresSource, rawData } = useFilters();

  const kpis = useMemo(() => {
    const totalHires = filteredJobs.reduce((s, r) => s + (r.TotalHires || 0), 0);

    // Top source from HiresSource data
    let topSource = "\u2014";
    if (filteredHiresSource.length > 0) {
      const srcMap = {};
      filteredHiresSource.forEach((r) => {
        if (r.SourceType) srcMap[r.SourceType] = (srcMap[r.SourceType] || 0) + (r.NumberHires || 0);
      });
      const entries = Object.entries(srcMap);
      if (entries.length > 0) {
        topSource = entries.sort((a, b) => b[1] - a[1])[0][0];
      }
    }

    // Top division
    let topDivision = "\u2014";
    const divMap = {};
    filteredJobs.forEach((r) => {
      if (r.Division) divMap[r.Division] = (divMap[r.Division] || 0) + (r.TotalHires || 0);
    });
    const divEntries = Object.entries(divMap);
    if (divEntries.length > 0) {
      topDivision = divEntries.sort((a, b) => b[1] - a[1])[0][0];
    }

    // Top hiring manager
    let topManager = "\u2014";
    const mgrMap = {};
    filteredJobs.forEach((r) => {
      if (r.HiringManager) mgrMap[r.HiringManager] = (mgrMap[r.HiringManager] || 0) + (r.TotalHires || 0);
    });
    const mgrEntries = Object.entries(mgrMap);
    if (mgrEntries.length > 0) {
      topManager = mgrEntries.sort((a, b) => b[1] - a[1])[0][0];
    }

    return { totalHires, topSource, topDivision, topManager };
  }, [filteredJobs, filteredHiresSource]);

  // Monthly Hires Trend (from dedicated monthly_hires table, fallback to jobs)
  const monthlyTrend = useMemo(() => {
    const mh = rawData.monthlyHires || [];
    if (mh.length > 0 && mh[0].Month && mh[0].FTEHires != null) {
      const sorted = [...mh].sort((a, b) => (a.Month || "").localeCompare(b.Month || ""));
      return {
        months: sorted.map((r) => r.Month),
        values: sorted.map((r) => r.FTEHires),
        yLabel: "FTE Hires",
      };
    }
    // Fallback: build from jobs data
    const hiredJobs = filteredJobs.filter((r) => (r.TotalHires || 0) > 0 && r.JobCloseDate);
    const byMonth = {};
    hiredJobs.forEach((r) => {
      const month = r.JobCloseDate.substring(0, 7);
      byMonth[month] = (byMonth[month] || 0) + (r.TotalHires || 0);
    });
    const sorted = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]));
    return {
      months: sorted.map((e) => e[0] + "-01"),
      values: sorted.map((e) => e[1]),
      yLabel: "Hires",
    };
  }, [rawData.monthlyHires, filteredJobs]);

  // Hires by Source Type (donut)
  const sourceDonut = useMemo(() => {
    const map = {};
    filteredHiresSource.forEach((r) => {
      if (r.SourceType) map[r.SourceType] = (map[r.SourceType] || 0) + (r.NumberHires || 0);
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return {
      labels: sorted.map((e) => e[0]),
      values: sorted.map((e) => e[1]),
    };
  }, [filteredHiresSource]);

  // Top 20 Hiring Managers
  const mgrHires = useMemo(() => {
    const map = {};
    filteredJobs.forEach((r) => {
      if (r.HiringManager) map[r.HiringManager] = (map[r.HiringManager] || 0) + (r.TotalHires || 0);
    });
    const sorted = Object.entries(map)
      .sort((a, b) => a[1] - b[1])
      .slice(-20);
    return {
      managers: sorted.map((e) => e[0]),
      hires: sorted.map((e) => e[1]),
    };
  }, [filteredJobs]);

  // Stacked monthly hires by Division
  const stackedData = useMemo(() => {
    const hiredJobs = filteredJobs.filter((r) => (r.TotalHires || 0) > 0 && r.JobCloseDate);
    const months = new Set();
    const divMap = {};
    hiredJobs.forEach((r) => {
      const month = r.JobCloseDate.substring(0, 7);
      months.add(month);
      if (!divMap[r.Division]) divMap[r.Division] = {};
      divMap[r.Division][month] = (divMap[r.Division][month] || 0) + (r.TotalHires || 0);
    });
    const sortedMonths = [...months].sort();
    return Object.entries(divMap).map(([div, monthData], i) => ({
      type: "bar",
      name: div,
      x: sortedMonths.map((m) => m + "-01"),
      y: sortedMonths.map((m) => monthData[m] || 0),
      marker: { color: CHART_PALETTE[i % CHART_PALETTE.length] },
    }));
  }, [filteredJobs]);

  return (
    <>
      <PageHeader
        title="Hires & Source Analysis"
        description="Understand where hires come from and track hiring volume over time."
      />

      <MetricRow
        metrics={[
          { label: "Total Hires", value: fmtNumber(kpis.totalHires) },
          { label: "Top Source", value: kpis.topSource },
          { label: "Top Division", value: kpis.topDivision },
          { label: "Top Hiring Manager", value: kpis.topManager },
        ]}
      />

      <div className="two-col" style={{ marginTop: 16 }}>
        <ChartCard
          title="Monthly Hires Trend"
          data={
            monthlyTrend.months.length > 0
              ? [
                  {
                    type: "scatter",
                    mode: "lines+markers",
                    x: monthlyTrend.months,
                    y: monthlyTrend.values,
                    marker: { color: COLORS.primary },
                    line: { color: COLORS.primary },
                  },
                ]
              : []
          }
          layout={{
            height: 400,
            xaxis: { title: "" },
            yaxis: { title: monthlyTrend.yLabel },
          }}
        />

        <ChartCard
          title="Hires by Source Type"
          data={
            sourceDonut.labels.length > 0
              ? [
                  {
                    type: "pie",
                    labels: sourceDonut.labels,
                    values: sourceDonut.values,
                    hole: 0.45,
                    textposition: "inside",
                    textinfo: "percent+label",
                    marker: {
                      colors: CHART_PALETTE.slice(0, sourceDonut.labels.length),
                    },
                  },
                ]
              : []
          }
          layout={{ height: 400 }}
        />
      </div>

      {mgrHires.managers.length > 0 && (
        <ChartCard
          title="Top 20 Hiring Managers by Hires"
          data={[
            {
              type: "bar",
              x: mgrHires.hires,
              y: mgrHires.managers,
              orientation: "h",
              marker: { color: COLORS.primary },
            },
          ]}
          layout={{
            height: Math.max(400, mgrHires.managers.length * 28),
            margin: { l: 180, r: 20, t: 10, b: 40 },
            yaxis: { title: "" },
            xaxis: { title: "Hires" },
          }}
        />
      )}

      {stackedData.length > 0 && (
        <ChartCard
          title="Monthly Hires by Division"
          data={stackedData}
          layout={{
            barmode: "stack",
            height: 450,
            xaxis: { title: "" },
            yaxis: { title: "Hires" },
            legend: { orientation: "h", yanchor: "bottom", y: 1.02, xanchor: "right", x: 1 },
          }}
        />
      )}
    </>
  );
}
