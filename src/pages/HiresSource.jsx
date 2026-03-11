import { useMemo } from "react";
import { useFilters } from "../context/FilterContext";
import { applyFilters } from "../utils/filters";
import { COLORS, CHART_PALETTE } from "../config";
import { fmtNumber } from "../utils/formatters";
import PageHeader from "../components/PageHeader";
import ChartCard from "../components/ChartCard";

export default function HiresSource() {
  const { filteredJobs, filteredHiresSource, rawData, filters } = useFilters();

  // Include closed jobs for hire counts
  const allStatusJobs = useMemo(
    () => applyFilters(rawData.jobs, { ...filters, statuses: [] }),
    [rawData.jobs, filters]
  );

  // Hero metric: Reqs with Hires
  const hiresYTD = useMemo(
    () => allStatusJobs.filter((r) => (r.TotalHires || 0) > 0).length,
    [allStatusJobs]
  );

  // Monthly Hires Trend (from dedicated monthly_hires table, filtered by date range)
  const monthlyTrend = useMemo(() => {
    let mh = rawData.monthlyHires || [];
    if (mh.length > 0 && mh[0].Month && mh[0].FTEHires != null) {
      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom);
        mh = mh.filter((r) => r.Month && new Date(r.Month) >= from);
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        mh = mh.filter((r) => r.Month && new Date(r.Month) <= to);
      }
      const sorted = [...mh].sort((a, b) => (a.Month || "").localeCompare(b.Month || ""));
      return {
        months: sorted.map((r) => r.Month),
        values: sorted.map((r) => r.FTEHires),
        yLabel: "FTE Hires",
      };
    }
    // Fallback: build from jobs data
    const hiredJobs = allStatusJobs.filter((r) => (r.TotalHires || 0) > 0 && r.JobCloseDate);
    const byMonth = {};
    hiredJobs.forEach((r) => {
      const month = r.JobCloseDate.substring(0, 7);
      byMonth[month] = (byMonth[month] || 0) + 1;
    });
    const sorted = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]));
    return {
      months: sorted.map((e) => e[0] + "-01"),
      values: sorted.map((e) => e[1]),
      yLabel: "Reqs with Hires",
    };
  }, [rawData.monthlyHires, allStatusJobs, filters.dateFrom, filters.dateTo]);

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

  // Stacked monthly hires by Division
  const stackedData = useMemo(() => {
    const hiredJobs = allStatusJobs.filter((r) => (r.TotalHires || 0) > 0 && r.JobCloseDate);
    const months = new Set();
    const divMap = {};
    hiredJobs.forEach((r) => {
      const month = r.JobCloseDate.substring(0, 7);
      months.add(month);
      if (!divMap[r.Division]) divMap[r.Division] = {};
      divMap[r.Division][month] = (divMap[r.Division][month] || 0) + 1;
    });
    const sortedMonths = [...months].sort();
    return Object.entries(divMap).map(([div, monthData], i) => ({
      type: "bar",
      name: div,
      x: sortedMonths.map((m) => m + "-01"),
      y: sortedMonths.map((m) => monthData[m] || 0),
      marker: { color: CHART_PALETTE[i % CHART_PALETTE.length] },
    }));
  }, [allStatusJobs]);

  return (
    <>
      <PageHeader
        title="Hires & Source Analysis"
        description="Understand where hires come from and track hiring volume over time."
      />

      {/* Hero metric */}
      <div
        className="metric-card"
        style={{
          textAlign: "center",
          padding: "32px 24px",
          marginBottom: 16,
          borderLeft: `4px solid ${COLORS.success}`,
        }}
      >
        <p className="metric-label" style={{ fontSize: "1rem" }}>Hires YTD</p>
        <p className="metric-value" style={{ fontSize: "3rem" }}>{fmtNumber(hiresYTD)}</p>
      </div>

      <div className="two-col" style={{ marginTop: 16 }}>
        <ChartCard
          title="Monthly Hires Trend"
          description="Monthly hiring volume over time. Uses FTE hires from the dedicated monthly report when available; otherwise falls back to counting requisitions with hires by close date."
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
          description="Breakdown of where hires originated (e.g., referral, job board, agency). Sourced from the Greenhouse hires-by-source report."
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

      {stackedData.length > 0 && (
        <ChartCard
          title="Monthly Reqs with Hires by Division"
          description="Stacked view of monthly requisitions with hires, split by division. Shows hiring velocity distribution across the organization over time."
          data={stackedData}
          layout={{
            barmode: "stack",
            height: 450,
            xaxis: { title: "" },
            yaxis: { title: "Reqs with Hires" },
            legend: { orientation: "h", yanchor: "bottom", y: 1.02, xanchor: "right", x: 1 },
          }}
          style={{ marginTop: 16 }}
        />
      )}
    </>
  );
}
