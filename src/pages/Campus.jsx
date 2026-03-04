import { useMemo } from "react";
import { useFilters } from "../context/FilterContext";
import { applyFilters } from "../utils/filters";
import { COLORS, CHART_PALETTE, AGING_COLORS } from "../config";
import { fmtNumber, fmtDays } from "../utils/formatters";
import PageHeader from "../components/PageHeader";
import MetricRow from "../components/MetricRow";
import ChartCard from "../components/ChartCard";
import DataTable from "../components/DataTable";

const CAMPUS_TYPES = new Set(["Student - Intern/Co-op", "Intern/Student"]);

function isCampusJob(r) {
  return CAMPUS_TYPES.has(r.EmployementType);
}

const AGING_BUCKETS = ["0-30 days", "31-60 days", "61-90 days", "90+ days"];

function getAgingBucket(days) {
  if (days == null) return null;
  if (days <= 30) return "0-30 days";
  if (days <= 60) return "31-60 days";
  if (days <= 90) return "61-90 days";
  return "90+ days";
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
  { key: "HiringManager", label: "Hiring Manager" },
  { key: "Recruiter", label: "Recruiter" },
  { key: "Region", label: "Region" },
  { key: "CurrentJobStatus", label: "Status" },
  { key: "JobOpenDays", label: "Days Open" },
  { key: "TotalApplicationsSubmitted", label: "Applications" },
  { key: "TotalHires", label: "Hires" },
];

export default function Campus() {
  const { filters, rawData } = useFilters();

  // Apply all filters except status/date, then filter to campus jobs only
  const allCampusJobs = useMemo(() => {
    const all = applyFilters(rawData.jobs, { ...filters, statuses: [], dateFrom: null, dateTo: null });
    return all.filter(isCampusJob);
  }, [rawData.jobs, filters]);

  // Campus jobs respecting the date filter but not status
  const campusJobs = useMemo(() => {
    const filtered = applyFilters(rawData.jobs, { ...filters, statuses: [] });
    return filtered.filter(isCampusJob);
  }, [rawData.jobs, filters]);

  const openCampus = useMemo(
    () => campusJobs.filter((r) => r.CurrentJobStatus === "open"),
    [campusJobs]
  );

  const currentYear = new Date().getFullYear();

  const kpis = useMemo(() => {
    const openCount = openCampus.length;

    // YTD hires
    const ytdHires = allCampusJobs.reduce((s, r) => {
      if ((r.TotalHires || 0) > 0 && r.AcceptedOfferCreatedAt) {
        if (new Date(r.AcceptedOfferCreatedAt).getFullYear() === currentYear)
          return s + (r.TotalHires || 0);
      }
      return s;
    }, 0);

    // Avg Time to Fill YTD (open → close for jobs closed this year)
    const ttfValues = allCampusJobs
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

    // Avg days open for currently open reqs
    const daysOpen = openCampus.map((r) => r.JobOpenDays).filter((v) => v != null);
    const avgAging = daysOpen.length > 0
      ? daysOpen.reduce((a, b) => a + b, 0) / daysOpen.length
      : null;

    // Total applications YTD
    const totalApps = campusJobs.reduce(
      (s, r) => s + (r.TotalApplicationsSubmitted || 0), 0
    );

    return { openCount, ytdHires, avgTTF, avgAging, totalApps };
  }, [openCampus, campusJobs, allCampusJobs, currentYear]);

  // Open reqs by Division
  const divOpen = useMemo(() => {
    const map = {};
    openCampus.forEach((r) => {
      if (r.Division) map[r.Division] = (map[r.Division] || 0) + 1;
    });
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return {
      divisions: entries.map((e) => e[0]),
      counts: entries.map((e) => e[1]),
    };
  }, [openCampus]);

  // Aging buckets for open reqs
  const agingData = useMemo(() => {
    const counts = {};
    AGING_BUCKETS.forEach((b) => (counts[b] = 0));
    openCampus.forEach((r) => {
      const bucket = getAgingBucket(r.JobOpenDays);
      if (bucket) counts[bucket]++;
    });
    return {
      buckets: AGING_BUCKETS,
      counts: AGING_BUCKETS.map((b) => counts[b]),
      colors: AGING_BUCKETS.map((b) => AGING_COLORS[b]),
    };
  }, [openCampus]);

  // YTD hires by Division
  const divHires = useMemo(() => {
    const map = {};
    allCampusJobs.forEach((r) => {
      if (r.Division && (r.TotalHires || 0) > 0 && r.AcceptedOfferCreatedAt
        && new Date(r.AcceptedOfferCreatedAt).getFullYear() === currentYear) {
        map[r.Division] = (map[r.Division] || 0) + (r.TotalHires || 0);
      }
    });
    const entries = Object.entries(map).sort((a, b) => a[1] - b[1]);
    return {
      divisions: entries.map((e) => e[0]),
      hires: entries.map((e) => e[1]),
    };
  }, [allCampusJobs, currentYear]);

  // Monthly hires trend (YTD)
  const monthlyTrend = useMemo(() => {
    const byMonth = {};
    allCampusJobs.forEach((r) => {
      if ((r.TotalHires || 0) > 0 && r.AcceptedOfferCreatedAt) {
        const d = new Date(r.AcceptedOfferCreatedAt);
        if (d.getFullYear() === currentYear) {
          const month = r.AcceptedOfferCreatedAt.substring(0, 7);
          byMonth[month] = (byMonth[month] || 0) + (r.TotalHires || 0);
        }
      }
    });
    const sorted = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]));
    return {
      months: sorted.map((e) => e[0] + "-01"),
      values: sorted.map((e) => e[1]),
    };
  }, [allCampusJobs, currentYear]);

  return (
    <>
      <PageHeader
        title="Campus Recruiting"
        description="Overview of intern and co-op requisitions, hiring velocity, and pipeline health."
      />

      <MetricRow
        metrics={[
          { label: "Active Campus Reqs", value: fmtNumber(kpis.openCount) },
          { label: "Hires YTD", value: fmtNumber(kpis.ytdHires) },
          { label: "Avg Time to Fill (YTD)", value: fmtDays(kpis.avgTTF) },
          { label: "Avg Aging (Open)", value: fmtDays(kpis.avgAging) },
          { label: "Applications", value: fmtNumber(kpis.totalApps) },
        ]}
      />

      <div className="chart-card" style={{ marginTop: 16 }}>
        <h3 className="chart-title">Campus Requisitions</h3>
        <DataTable
          data={campusJobs}
          columns={TABLE_COLS}
          defaultSort="JobOpenDays"
          maxHeight={500}
        />
      </div>

      <div className="two-col" style={{ marginTop: 16 }}>
        <ChartCard
          title="Active Campus Reqs by Division"
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
            margin: { l: 200, r: 20, t: 10, b: 40 },
            yaxis: { title: "" },
            xaxis: { title: "Open Reqs" },
          }}
        />

        <ChartCard
          title="Aging Buckets (Open Reqs)"
          data={[
            {
              type: "bar",
              x: agingData.buckets,
              y: agingData.counts,
              marker: { color: agingData.colors },
            },
          ]}
          layout={{
            height: 400,
            showlegend: false,
            xaxis: { title: "" },
            yaxis: { title: "Requisitions" },
          }}
        />
      </div>

      <div className="two-col" style={{ marginTop: 16 }}>
        <ChartCard
          title="Campus Hires YTD by Division"
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
            margin: { l: 200, r: 20, t: 10, b: 40 },
            yaxis: { title: "" },
            xaxis: { title: "Hires" },
          }}
        />

        {monthlyTrend.months.length > 0 ? (
          <ChartCard
            title="Campus Hires by Month (YTD)"
            data={[
              {
                type: "bar",
                x: monthlyTrend.months,
                y: monthlyTrend.values,
                marker: { color: COLORS.primary },
              },
            ]}
            layout={{
              height: 400,
              xaxis: { title: "" },
              yaxis: { title: "Hires" },
            }}
          />
        ) : (
          <ChartCard
            title="Campus Hires by Month (YTD)"
            data={[]}
            layout={{ height: 400 }}
          />
        )}
      </div>
    </>
  );
}
