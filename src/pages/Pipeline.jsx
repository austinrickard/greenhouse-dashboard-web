import { useMemo } from "react";
import { useFilters } from "../context/FilterContext";
import { applyFilters } from "../utils/filters";
import { COLORS, FUNNEL_COLORS } from "../config";
import { fmtNumber, fmtPct } from "../utils/formatters";
import PageHeader from "../components/PageHeader";
import MetricRow from "../components/MetricRow";
import ChartCard from "../components/ChartCard";

const STAGE_COLS = [
  { label: "Applications", key: "TotalApplicationsSubmitted" },
  { label: "Screened", key: "TotalScreenedApplications" },
  { label: "Interviews", key: "TotalInterviewsConducted" },
  { label: "Offers", key: "TotalOffersMade" },
  { label: "Hires", key: "TotalHires" },
];

function safePct(numerator, denominator) {
  if (!denominator || denominator === 0) return null;
  return (numerator / denominator) * 100;
}

export default function Pipeline() {
  const { filteredJobs, filteredOpenings, filters, rawData } = useFilters();

  // All jobs with current filters EXCEPT status (so pipeline metrics include closed jobs)
  const allStatusJobs = useMemo(
    () => applyFilters(rawData.jobs, { ...filters, statuses: [] }),
    [rawData.jobs, filters]
  );

  const openJobs = useMemo(
    () => filteredJobs.filter((r) => r.CurrentJobStatus === "open"),
    [filteredJobs]
  );

  // Open Headcount from openings data
  const openHeadcount = useMemo(() => {
    return (filteredOpenings || []).filter((r) => r.OpenClosed === "Open").length;
  }, [filteredOpenings]);

  // Pipeline aggregates (from all-status jobs for YTD totals)
  const pipeline = useMemo(() => {
    const screens = allStatusJobs.reduce((s, r) => s + (r.TotalScreenedApplications || 0), 0);
    const interviews = allStatusJobs.reduce((s, r) => s + (r.TotalInterviewsConducted || 0), 0);
    const offers = allStatusJobs.reduce((s, r) => s + (r.TotalOffersMade || 0), 0);
    const hires = allStatusJobs.filter((r) => (r.TotalHires || 0) > 0).length;
    return { screens, interviews, offers, hires };
  }, [allStatusJobs]);

  // Passthrough rates
  const passthrough = useMemo(() => ({
    screenToInterview: safePct(pipeline.interviews, pipeline.screens),
    interviewToNext: safePct(pipeline.offers, pipeline.interviews),
    assessmentToFinal: null, // Data not available at this granularity
    finalToOffer: null,      // Data not available at this granularity
  }), [pipeline]);

  // Funnel data with passthrough labels
  const funnel = useMemo(() => {
    const stages = [];
    const values = [];
    STAGE_COLS.forEach(({ label, key }) => {
      const total = key === "TotalHires"
        ? allStatusJobs.filter((r) => (r[key] || 0) > 0).length
        : allStatusJobs.reduce((s, r) => s + (r[key] || 0), 0);
      stages.push(label);
      values.push(total);
    });
    // Build text with passthrough rates between stages
    const text = values.map((v, i) => {
      if (i === 0) return fmtNumber(v);
      const prev = values[i - 1];
      const rate = prev > 0 ? ((v / prev) * 100).toFixed(1) : 0;
      return `${fmtNumber(v)}  (${rate}% from prev)`;
    });
    return { stages, values, text };
  }, [allStatusJobs]);

  // Hires by Department (full width bar)
  const deptHires = useMemo(() => {
    const map = {};
    allStatusJobs.forEach((r) => {
      if (r.Department && (r.TotalHires || 0) > 0) {
        map[r.Department] = (map[r.Department] || 0) + 1;
      }
    });
    const entries = Object.entries(map)
      .sort((a, b) => a[1] - b[1]);
    return {
      departments: entries.map((e) => e[0]),
      hires: entries.map((e) => e[1]),
    };
  }, [allStatusJobs]);

  // Interviews per Hiring Manager (top 20)
  const hmInterviews = useMemo(() => {
    const map = {};
    allStatusJobs.forEach((r) => {
      if (r.HiringManager && (r.TotalInterviewsConducted || 0) > 0) {
        map[r.HiringManager] = (map[r.HiringManager] || 0) + (r.TotalInterviewsConducted || 0);
      }
    });
    const entries = Object.entries(map)
      .sort((a, b) => a[1] - b[1])
      .slice(-20);
    return {
      managers: entries.map((e) => e[0]),
      interviews: entries.map((e) => e[1]),
    };
  }, [allStatusJobs]);

  if (allStatusJobs.length === 0 && openJobs.length === 0) {
    return (
      <>
        <PageHeader title="Hiring Pipeline" description="Visualize the recruiting funnel, passthrough efficiency, and hiring velocity." />
        <p className="empty-state">No data available for the selected filters.</p>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Hiring Pipeline" description="Visualize the recruiting funnel, passthrough efficiency, and hiring velocity." />

      <MetricRow
        metrics={[
          { label: "Open Reqs", value: fmtNumber(openJobs.length) },
          { label: "Open Headcount", value: fmtNumber(openHeadcount) },
          { label: "YTD Recruiter Screens", value: fmtNumber(pipeline.screens) },
          { label: "YTD HM Interviews", value: fmtNumber(pipeline.interviews) },
          { label: "YTD Hires", value: fmtNumber(pipeline.hires) },
        ]}
      />
      <MetricRow
        metrics={[
          { label: "Screen \u2192 Interview %", value: fmtPct(passthrough.screenToInterview) },
          { label: "Interview \u2192 Offer %", value: fmtPct(passthrough.interviewToNext) },
          { label: "Assessment \u2192 Final %", value: passthrough.assessmentToFinal != null ? fmtPct(passthrough.assessmentToFinal) : "N/A" },
          { label: "Final \u2192 Offer %", value: passthrough.finalToOffer != null ? fmtPct(passthrough.finalToOffer) : "N/A" },
        ]}
      />

      <ChartCard
        title="Recruiting Funnel"
        description="Visualizes the drop-off at each stage of the hiring process: Applications, Screened, Interviews, Offers, and Hires. Percentages show the passthrough rate from the previous stage."
        data={[
          {
            type: "funnel",
            y: funnel.stages,
            x: funnel.values,
            text: funnel.text,
            textinfo: "text",
            textposition: "inside",
            marker: { color: FUNNEL_COLORS.slice(0, funnel.stages.length) },
            connector: { line: { color: "#DDD", width: 1 } },
          },
        ]}
        layout={{ height: 420, font: { size: 14 }, margin: { l: 120, r: 40, t: 10, b: 40 } }}
        style={{ marginTop: 16 }}
      />

      {hmInterviews.managers.length > 0 && (
        <ChartCard
          title="Interviews per Hiring Manager"
          description="Top 20 hiring managers ranked by total interviews conducted. Helps identify managers with high interview volume and potential bottlenecks."
          data={[
            {
              type: "bar",
              x: hmInterviews.interviews,
              y: hmInterviews.managers,
              orientation: "h",
              marker: { color: COLORS.secondary },
            },
          ]}
          layout={{
            height: Math.max(400, hmInterviews.managers.length * 28),
            margin: { l: 200, r: 20, t: 10, b: 40 },
            yaxis: { title: "" },
            xaxis: { title: "Interviews Conducted" },
          }}
          style={{ marginTop: 16 }}
        />
      )}

      {deptHires.departments.length > 0 && (
        <ChartCard
          title="Hires by Department"
          description="Requisitions with at least one accepted hire, grouped by department. Shows which teams are successfully closing roles."
          data={[
            {
              type: "bar",
              x: deptHires.hires,
              y: deptHires.departments,
              orientation: "h",
              marker: { color: COLORS.primary },
            },
          ]}
          layout={{
            height: Math.max(400, deptHires.departments.length * 28),
            margin: { l: 200, r: 20, t: 10, b: 40 },
            yaxis: { title: "" },
            xaxis: { title: "Reqs with Hires" },
          }}
          style={{ marginTop: 16 }}
        />
      )}
    </>
  );
}
