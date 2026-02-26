import { useMemo } from "react";
import { useFilters } from "../context/FilterContext";
import { COLORS, CHART_PALETTE, FUNNEL_COLORS } from "../config";
import { fmtNumber, fmtPct } from "../utils/formatters";
import PageHeader from "../components/PageHeader";
import MetricRow from "../components/MetricRow";
import ChartCard from "../components/ChartCard";
import DataTable from "../components/DataTable";

const STAGE_COLS = [
  { label: "Applications", key: "TotalApplicationsSubmitted" },
  { label: "Screened", key: "TotalScreenedApplications" },
  { label: "Interviews", key: "TotalInterviewsConducted" },
  { label: "Offers", key: "TotalOffersMade" },
  { label: "Hires", key: "TotalHires" },
];

const TABLE_COLS = [
  { key: "JobID", label: "Job ID" },
  { key: "JobName", label: "Job Name" },
  { key: "CurrentJobStatus", label: "Status" },
  { key: "Division", label: "Division" },
  { key: "Department", label: "Department" },
  { key: "HiringManager", label: "Hiring Manager" },
  { key: "Region", label: "Region" },
  { key: "JobOpenDays", label: "Days Open" },
  { key: "TotalApplicationsSubmitted", label: "Applications" },
  { key: "TotalScreenedApplications", label: "Screened" },
  { key: "TotalInterviewsConducted", label: "Interviews" },
  { key: "TotalOffersMade", label: "Offers" },
  { key: "TotalHires", label: "Hires" },
];

export default function Pipeline() {
  const { filteredJobs } = useFilters();

  const kpis = useMemo(() => {
    const totalReqs = filteredJobs.length;
    const totalApps = filteredJobs.reduce((s, r) => s + (r.TotalApplicationsSubmitted || 0), 0);
    const totalScreened = filteredJobs.reduce((s, r) => s + (r.TotalScreenedApplications || 0), 0);
    const totalHires = filteredJobs.reduce((s, r) => s + (r.TotalHires || 0), 0);
    const conversion = totalApps > 0 ? (totalHires / totalApps) * 100 : 0;
    return { totalReqs, totalApps, totalScreened, totalHires, conversion };
  }, [filteredJobs]);

  // Funnel data
  const funnel = useMemo(() => {
    const stages = [];
    const values = [];
    STAGE_COLS.forEach(({ label, key }) => {
      const total = filteredJobs.reduce((s, r) => s + (r[key] || 0), 0);
      stages.push(label);
      values.push(total);
    });
    return { stages, values };
  }, [filteredJobs]);

  // Applications & Hires by Division
  const divData = useMemo(() => {
    const map = {};
    filteredJobs.forEach((r) => {
      if (!r.Division) return;
      if (!map[r.Division]) map[r.Division] = { apps: 0, hires: 0 };
      map[r.Division].apps += r.TotalApplicationsSubmitted || 0;
      map[r.Division].hires += r.TotalHires || 0;
    });
    const sorted = Object.entries(map).sort((a, b) => b[1].apps - a[1].apps);
    return {
      divisions: sorted.map((e) => e[0]),
      apps: sorted.map((e) => e[1].apps),
      hires: sorted.map((e) => e[1].hires),
    };
  }, [filteredJobs]);

  // Top 15 Departments by Hires
  const deptHires = useMemo(() => {
    const map = {};
    filteredJobs.forEach((r) => {
      if (r.Department) map[r.Department] = (map[r.Department] || 0) + (r.TotalHires || 0);
    });
    const sorted = Object.entries(map)
      .sort((a, b) => a[1] - b[1])
      .slice(-15);
    return {
      departments: sorted.map((e) => e[0]),
      hires: sorted.map((e) => e[1]),
    };
  }, [filteredJobs]);

  // Scatter: Apps vs Hires
  const scatter = useMemo(() => {
    const rows = filteredJobs.filter((r) => (r.TotalApplicationsSubmitted || 0) > 0);
    const divs = [...new Set(rows.map((r) => r.Division).filter(Boolean))];
    return divs.map((div, i) => {
      const divRows = rows.filter((r) => r.Division === div);
      return {
        type: "scatter",
        mode: "markers",
        name: div,
        x: divRows.map((r) => r.TotalApplicationsSubmitted),
        y: divRows.map((r) => r.TotalHires),
        text: divRows.map((r) => r.JobName),
        marker: {
          size: divRows.map((r) => Math.min(Math.max((r.JobOpenDays || 5) / 3, 5), 30)),
          color: CHART_PALETTE[i % CHART_PALETTE.length],
        },
      };
    });
  }, [filteredJobs]);

  if (filteredJobs.length === 0) {
    return (
      <>
        <PageHeader title="Hiring Pipeline" description="Visualize the recruiting funnel from applications through hires." />
        <p className="empty-state">No data available for the selected filters.</p>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Hiring Pipeline" description="Visualize the recruiting funnel from applications through hires." />

      <MetricRow
        metrics={[
          { label: "Total Requisitions", value: fmtNumber(kpis.totalReqs) },
          { label: "Applications", value: fmtNumber(kpis.totalApps) },
          { label: "Screened", value: fmtNumber(kpis.totalScreened) },
          { label: "Hires", value: fmtNumber(kpis.totalHires) },
          { label: "App \u2192 Hire %", value: fmtPct(kpis.conversion) },
        ]}
      />

      <ChartCard
        title="Recruiting Funnel"
        data={[
          {
            type: "funnel",
            y: funnel.stages,
            x: funnel.values,
            textinfo: "value+percent initial",
            marker: { color: FUNNEL_COLORS.slice(0, funnel.stages.length) },
            connector: { line: { color: "#DDD", width: 1 } },
          },
        ]}
        layout={{ height: 350, font: { size: 14 } }}
        style={{ marginTop: 16 }}
      />

      <div className="two-col">
        <ChartCard
          title="Applications & Hires by Division"
          data={[
            {
              type: "bar",
              x: divData.divisions,
              y: divData.apps,
              name: "Applications",
              marker: { color: COLORS.primary },
            },
            {
              type: "bar",
              x: divData.divisions,
              y: divData.hires,
              name: "Hires",
              marker: { color: COLORS.success },
            },
          ]}
          layout={{
            barmode: "group",
            height: 400,
            legend: { orientation: "h", yanchor: "bottom", y: 1.02, xanchor: "right", x: 1 },
          }}
        />

        <ChartCard
          title="Top 15 Departments by Hires"
          data={[
            {
              type: "bar",
              x: deptHires.hires,
              y: deptHires.departments,
              orientation: "h",
              marker: { color: COLORS.secondary },
            },
          ]}
          layout={{
            height: 400,
            margin: { l: 150, r: 20, t: 10, b: 40 },
            yaxis: { title: "" },
            xaxis: { title: "Hires" },
          }}
        />
      </div>

      <ChartCard
        title="Applications vs Hires per Requisition"
        data={scatter}
        layout={{
          height: 450,
          xaxis: { title: "Applications Submitted" },
          yaxis: { title: "Hires" },
        }}
      />

      <div className="chart-card">
        <h3 className="chart-title">Requisition Details</h3>
        <DataTable
          data={filteredJobs}
          columns={TABLE_COLS}
          defaultSort="TotalApplicationsSubmitted"
        />
      </div>
    </>
  );
}
