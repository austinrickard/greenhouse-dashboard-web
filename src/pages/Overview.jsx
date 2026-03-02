import { useMemo } from "react";
import { useFilters } from "../context/FilterContext";
import { applyFilters } from "../utils/filters";
import { COLORS } from "../config";
import { fmtNumber, fmtDays } from "../utils/formatters";
import PageHeader from "../components/PageHeader";
import MetricRow from "../components/MetricRow";
import ChartCard from "../components/ChartCard";

export default function Overview() {
  const { filteredJobs, filters, rawData } = useFilters();

  // All jobs with current filters EXCEPT status and date (so YTD hires & TTF include
  // closed jobs and jobs opened before this year that closed this year)
  const allStatusJobs = useMemo(
    () => applyFilters(rawData.jobs, { ...filters, statuses: [], dateFrom: null, dateTo: null }),
    [rawData.jobs, filters]
  );

  const kpis = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const totalReqs = filteredJobs.length;
    // YTD hires: count hires with accepted offer in the current year (across all statuses)
    const ytdHires = allStatusJobs.reduce((s, r) => {
      if ((r.TotalHires || 0) > 0 && r.AcceptedOfferCreatedAt) {
        const year = new Date(r.AcceptedOfferCreatedAt).getFullYear();
        if (year === currentYear) return s + (r.TotalHires || 0);
      }
      return s;
    }, 0);
    const openReqs = filteredJobs.filter(
      (r) => r.CurrentJobStatus === "open"
    ).length;
    // Avg Time to Fill YTD: days from JobOpenDate to JobCloseDate for jobs closed this year
    const ttfValues = allStatusJobs
      .filter((r) => r.JobOpenDate && r.JobCloseDate
        && new Date(r.JobCloseDate).getFullYear() === currentYear)
      .map((r) => {
        const open = new Date(r.JobOpenDate);
        const close = new Date(r.JobCloseDate);
        return Math.round((close - open) / (1000 * 60 * 60 * 24));
      })
      .filter((d) => d >= 0);
    const avgTTF = ttfValues.length > 0
      ? ttfValues.reduce((a, b) => a + b, 0) / ttfValues.length
      : null;
    return { totalReqs, ytdHires, openReqs, avgTTF };
  }, [filteredJobs, allStatusJobs]);

  // Hires by Division
  const divHires = useMemo(() => {
    const map = {};
    filteredJobs.forEach((r) => {
      if (r.Division) map[r.Division] = (map[r.Division] || 0) + (r.TotalHires || 0);
    });
    const entries = Object.entries(map).sort((a, b) => a[1] - b[1]);
    return {
      divisions: entries.map((e) => e[0]),
      hires: entries.map((e) => e[1]),
    };
  }, [filteredJobs]);

  // Open Reqs by Division
  const divOpen = useMemo(() => {
    const map = {};
    filteredJobs
      .filter((r) => r.CurrentJobStatus === "open")
      .forEach((r) => {
        if (r.Division) map[r.Division] = (map[r.Division] || 0) + 1;
      });
    const entries = Object.entries(map).sort((a, b) => a[1] - b[1]);
    return {
      divisions: entries.map((e) => e[0]),
      counts: entries.map((e) => e[1]),
    };
  }, [filteredJobs]);

  return (
    <>
      <PageHeader
        title="Recruiting Overview"
        description="High-level snapshot of Greenhouse recruiting activity. Use the sidebar to filter, and navigate to detailed pages using the left menu."
      />

      <MetricRow
        metrics={[
          { label: "Total Requisitions", value: fmtNumber(kpis.totalReqs) },
          { label: "Hires YTD", value: fmtNumber(kpis.ytdHires) },
          { label: "Open Requisitions", value: fmtNumber(kpis.openReqs) },
          { label: "Avg Time to Fill (YTD)", value: fmtDays(kpis.avgTTF) },
        ]}
      />

      <div className="two-col" style={{ marginTop: 16 }}>
        <ChartCard
          title="Hires by Division"
          data={[
            {
              type: "bar",
              x: divHires.hires,
              y: divHires.divisions,
              orientation: "h",
              marker: { color: COLORS.primary },
            },
          ]}
          layout={{
            height: 400,
            margin: { l: 150, r: 20, t: 10, b: 40 },
            yaxis: { title: "" },
            xaxis: { title: "Hires" },
          }}
        />

        <ChartCard
          title="Open Reqs by Division"
          data={[
            {
              type: "bar",
              x: divOpen.counts,
              y: divOpen.divisions,
              orientation: "h",
              marker: { color: COLORS.accent },
            },
          ]}
          layout={{
            height: 400,
            margin: { l: 150, r: 20, t: 10, b: 40 },
            yaxis: { title: "" },
            xaxis: { title: "Open Reqs" },
          }}
        />
      </div>

      <p className="page-footer">
        Data sourced from Greenhouse ATS via BigQuery &middot; Showing{" "}
        {fmtNumber(filteredJobs.length)} of {fmtNumber(rawData.jobs.length)}{" "}
        requisitions
      </p>
    </>
  );
}
