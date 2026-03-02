import { useMemo } from "react";
import { useFilters } from "../context/FilterContext";
import { COLORS } from "../config";
import { fmtNumber, fmtDays } from "../utils/formatters";
import PageHeader from "../components/PageHeader";
import MetricRow from "../components/MetricRow";
import ChartCard from "../components/ChartCard";

export default function Overview() {
  const { filteredJobs, rawData } = useFilters();

  const kpis = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const totalReqs = filteredJobs.length;
    // YTD hires: only count hires with accepted offer in the current year
    const ytdHires = filteredJobs.reduce((s, r) => {
      if ((r.TotalHires || 0) > 0 && r.AcceptedOfferCreatedAt) {
        const year = new Date(r.AcceptedOfferCreatedAt).getFullYear();
        if (year === currentYear) return s + (r.TotalHires || 0);
      }
      return s;
    }, 0);
    const openReqs = filteredJobs.filter(
      (r) => r.CurrentJobStatus === "open"
    ).length;
    // Avg Time to Fill YTD: average DaysToAcceptedOffer for jobs with hires this year
    const ttfValues = filteredJobs
      .filter((r) => {
        if ((r.TotalHires || 0) === 0 || r.DaysToAcceptedOffer == null) return false;
        if (!r.AcceptedOfferCreatedAt) return false;
        return new Date(r.AcceptedOfferCreatedAt).getFullYear() === currentYear;
      })
      .map((r) => r.DaysToAcceptedOffer);
    const avgTTF = ttfValues.length > 0
      ? ttfValues.reduce((a, b) => a + b, 0) / ttfValues.length
      : null;
    return { totalReqs, ytdHires, openReqs, avgTTF };
  }, [filteredJobs]);

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
