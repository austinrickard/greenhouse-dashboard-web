import { useMemo } from "react";
import { useFilters } from "../context/FilterContext";
import { COLORS } from "../config";
import { fmtNumber, fmtPct } from "../utils/formatters";
import PageHeader from "../components/PageHeader";
import MetricRow from "../components/MetricRow";
import ChartCard from "../components/ChartCard";

export default function Overview() {
  const { filteredJobs, rawData } = useFilters();

  const kpis = useMemo(() => {
    const totalReqs = filteredJobs.length;
    const totalApps = filteredJobs.reduce(
      (s, r) => s + (r.TotalApplicationsSubmitted || 0),
      0
    );
    const totalHires = filteredJobs.reduce(
      (s, r) => s + (r.TotalHires || 0),
      0
    );
    const openReqs = filteredJobs.filter(
      (r) => r.CurrentJobStatus === "open"
    ).length;
    const conversion = totalApps > 0 ? (totalHires / totalApps) * 100 : 0;
    return { totalReqs, totalApps, totalHires, openReqs, conversion };
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
          { label: "Applications", value: fmtNumber(kpis.totalApps) },
          { label: "Total Hires", value: fmtNumber(kpis.totalHires) },
          { label: "Open Requisitions", value: fmtNumber(kpis.openReqs) },
          { label: "App \u2192 Hire Rate", value: fmtPct(kpis.conversion) },
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
