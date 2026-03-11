import { useMemo } from "react";
import { useFilters } from "../context/FilterContext";
import { COLORS, CHART_PALETTE, AGING_COLORS } from "../config";
import { fmtNumber, fmtDays } from "../utils/formatters";
import PageHeader from "../components/PageHeader";
import MetricRow from "../components/MetricRow";
import ChartCard from "../components/ChartCard";
import DataTable from "../components/DataTable";

const AGING_BUCKETS = ["0-30 days", "31-60 days", "61-90 days", "90+ days"];

function getAgingBucket(days) {
  if (days == null) return null;
  if (days <= 30) return "0-30 days";
  if (days <= 60) return "31-60 days";
  if (days <= 90) return "61-90 days";
  return "90+ days";
}

function highlightAging(colKey, val) {
  if (colKey !== "JobOpenDays" || val == null) return {};
  const v = parseFloat(val);
  if (isNaN(v)) return {};
  if (v > 90) return { backgroundColor: "#FADBD8" };
  if (v > 60) return { backgroundColor: "#FDEBD0" };
  if (v > 30) return { backgroundColor: "#FEF9E7" };
  return { backgroundColor: "#D5F5E3" };
}

const TABLE_COLS = [
  { key: "JobID", label: "Job ID" },
  {
    key: "JobName",
    label: "Job Name",
    render: (val, row) =>
      row.JobID ? (
        <a
          href={`https://app.greenhouse.io/sdash/${row.JobID}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#1B6B93" }}
        >
          {val || "\u2014"}
        </a>
      ) : (
        val || "\u2014"
      ),
  },
  { key: "Division", label: "Division" },
  { key: "Department", label: "Department" },
  { key: "HiringManager", label: "Hiring Manager" },
  { key: "Region", label: "Region" },
  { key: "JobOpenDays", label: "Days Open" },
  { key: "TotalApplicationsSubmitted", label: "Applications" },
  { key: "TotalScreenedApplications", label: "Screened" },
  { key: "TotalInterviewsConducted", label: "Interviews" },
  { key: "TotalOffersMade", label: "Offers" },
];

export default function OpenReqs() {
  const { filteredJobs, filteredOpenings } = useFilters();

  const openJobs = useMemo(
    () => filteredJobs.filter((r) => r.CurrentJobStatus === "open"),
    [filteredJobs]
  );

  // Total Headcount from openings data (each opening counts as 1)
  const totalHeadcount = useMemo(() => {
    const openOpenings = (filteredOpenings || []).filter(
      (r) => r.OpenClosed === "Open"
    );
    return openOpenings.length;
  }, [filteredOpenings]);

  const kpis = useMemo(() => {
    const openCount = openJobs.length;
    const daysOpen = openJobs.map((r) => r.JobOpenDays).filter((v) => v != null);
    const avgAging = daysOpen.length > 0 ? daysOpen.reduce((a, b) => a + b, 0) / daysOpen.length : null;
    // FTE count: full-time open reqs from filtered data
    const fteCount = openJobs.filter(
      (r) => r.EmployementType && r.EmployementType.toLowerCase().includes("full")
    ).length;
    return { openCount, fteCount, avgAging };
  }, [openJobs]);

  // Treemap: Division → Department
  const treemapData = useMemo(() => {
    const map = {};
    openJobs.forEach((r) => {
      if (r.Division && r.Department) {
        const key = `${r.Division}|||${r.Department}`;
        map[key] = (map[key] || 0) + 1;
      }
    });

    const labels = [""];
    const parents = [""];
    const values = [0];
    const divSet = new Set();

    Object.entries(map).forEach(([key, count]) => {
      const [div, dept] = key.split("|||");
      if (!divSet.has(div)) {
        divSet.add(div);
        labels.push(div);
        parents.push("");
        values.push(0);
      }
      labels.push(dept);
      parents.push(div);
      values.push(count);
    });

    return { labels, parents, values };
  }, [openJobs]);

  // Aging buckets
  const agingData = useMemo(() => {
    const counts = {};
    AGING_BUCKETS.forEach((b) => (counts[b] = 0));
    openJobs.forEach((r) => {
      const bucket = getAgingBucket(r.JobOpenDays);
      if (bucket) counts[bucket]++;
    });
    return {
      buckets: AGING_BUCKETS,
      counts: AGING_BUCKETS.map((b) => counts[b]),
      colors: AGING_BUCKETS.map((b) => AGING_COLORS[b]),
    };
  }, [openJobs]);

  // Scatter: Age vs Applications
  const scatterTraces = useMemo(() => {
    const rows = openJobs.filter(
      (r) => r.JobOpenDays != null && r.TotalApplicationsSubmitted != null
    );
    const divs = [...new Set(rows.map((r) => r.Division).filter(Boolean))];
    return divs.map((div, i) => {
      const divRows = rows.filter((r) => r.Division === div);
      return {
        type: "scatter",
        mode: "markers",
        name: div,
        x: divRows.map((r) => r.JobOpenDays),
        y: divRows.map((r) => r.TotalApplicationsSubmitted),
        text: divRows.map((r) => r.JobName),
        marker: { color: CHART_PALETTE[i % CHART_PALETTE.length] },
      };
    });
  }, [openJobs]);

  if (openJobs.length === 0) {
    return (
      <>
        <PageHeader title="Open Requisitions" description="Monitor open requisition inventory, aging, and remaining headcount." />
        <p className="empty-state">No open requisitions found for the selected filters.</p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Open Requisitions"
        description="Monitor open requisition inventory, aging, and remaining headcount."
      />

      <MetricRow
        metrics={[
          { label: "Total Open Jobs", value: fmtNumber(kpis.openCount) },
          { label: "Total Headcount", value: fmtNumber(totalHeadcount) },
          { label: "FTE Reqs", value: fmtNumber(kpis.fteCount) },
          { label: "Avg Aging", value: fmtDays(kpis.avgAging) },
        ]}
      />

      <div className="chart-card" style={{ marginTop: 16 }}>
        <h3 className="chart-title">Open Requisitions Detail</h3>
        <p className="chart-description">Sortable table of all open requisitions with pipeline activity. Click column headers to sort. Job names link directly to Greenhouse. Days Open cells are color-coded by aging bucket.</p>
        <DataTable
          data={openJobs}
          columns={TABLE_COLS}
          defaultSort="JobOpenDays"
          cellStyle={highlightAging}
        />
      </div>

      <div className="two-col" style={{ marginTop: 16 }}>
        <ChartCard
          title="Open Reqs by Division / Department"
          description="Treemap showing how open requisitions are distributed across divisions and departments. Larger boxes indicate more open roles."
          data={[
            {
              type: "treemap",
              labels: treemapData.labels,
              parents: treemapData.parents,
              values: treemapData.values,
              textinfo: "label+value",
              marker: {
                colorscale: [
                  [0, "#4FC0D0"],
                  [1, "#1B6B93"],
                ],
              },
            },
          ]}
          layout={{ height: 450, margin: { l: 0, r: 0, t: 10, b: 0 } }}
        />

        <ChartCard
          title="Aging Buckets"
          description="Distribution of open requisitions by how long they've been open. Green (0-30 days) is healthy; red (90+ days) may indicate hard-to-fill roles that need attention."
          data={[
            {
              type: "bar",
              x: agingData.buckets,
              y: agingData.counts,
              marker: { color: agingData.colors },
            },
          ]}
          layout={{
            height: 450,
            showlegend: false,
            xaxis: { title: "" },
            yaxis: { title: "Requisitions" },
          }}
        />
      </div>

      <ChartCard
        title="Requisition Age vs Applications Submitted"
        description="Each dot is an open requisition plotted by how long it's been open (x-axis) vs. how many applications it's received (y-axis). Older reqs with few applications may need sourcing support."
        data={scatterTraces}
        layout={{
          height: 400,
          xaxis: { title: "Days Open" },
          yaxis: { title: "Applications Submitted" },
        }}
      />
    </>
  );
}
