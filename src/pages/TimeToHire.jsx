import { useMemo } from "react";
import { useFilters } from "../context/FilterContext";
import { applyFilters } from "../utils/filters";
import { COLORS } from "../config";
import { fmtDays, fmtNumber } from "../utils/formatters";
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
  const { filters, rawData } = useFilters();

  // Include closed jobs so we can compute TTH metrics
  const allStatusJobs = useMemo(
    () => applyFilters(rawData.jobs, { ...filters, statuses: [] }),
    [rawData.jobs, filters]
  );

  const kpis = useMemo(() => {
    const tthValues = allStatusJobs
      .map((r) => r.DaysToAcceptedOffer)
      .filter((v) => v != null && !isNaN(v) && v >= 0);
    const daysOpenValues = allStatusJobs
      .map((r) => r.JobOpenDays)
      .filter((v) => v != null && !isNaN(v));

    // Offers per month: total offers / number of distinct months with activity
    const totalOffers = allStatusJobs.reduce((s, r) => s + (r.TotalOffersMade || 0), 0);
    const monthsWithOffers = new Set();
    allStatusJobs.forEach((r) => {
      if ((r.TotalOffersMade || 0) > 0 && r.AcceptedOfferCreatedAt) {
        monthsWithOffers.add(r.AcceptedOfferCreatedAt.substring(0, 7));
      }
    });
    const offersPerMonth = monthsWithOffers.size > 0
      ? totalOffers / monthsWithOffers.size
      : null;

    return {
      avgTTH: mean(tthValues),
      medianTTH: median(tthValues),
      avgDaysOpen: mean(daysOpenValues),
      offersPerMonth,
    };
  }, [allStatusJobs]);

  // Monthly TTH trend
  const trendData = useMemo(() => {
    const rows = allStatusJobs.filter(
      (r) => r.JobCloseDate && r.DaysToAcceptedOffer != null && r.DaysToAcceptedOffer >= 0
    );
    const byMonth = {};
    rows.forEach((r) => {
      const month = r.JobCloseDate.substring(0, 7);
      if (!byMonth[month]) byMonth[month] = [];
      byMonth[month].push(r.DaysToAcceptedOffer);
    });
    const sorted = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]));
    return {
      months: sorted.map((e) => e[0] + "-01"),
      values: sorted.map((e) => mean(e[1])),
    };
  }, [allStatusJobs]);

  // Avg Days by Department (horizontal bar — prominent)
  const deptTTH = useMemo(() => {
    const map = {};
    allStatusJobs.forEach((r) => {
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
  }, [allStatusJobs]);

  if (allStatusJobs.length === 0) {
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
          { label: "Offers / Month", value: kpis.offersPerMonth != null ? fmtNumber(Math.round(kpis.offersPerMonth)) : "\u2014" },
        ]}
      />

      {deptTTH.departments.length > 0 && (
        <ChartCard
          title="Average Days to Offer by Department"
          description="Average number of days from job opening to accepted offer, by department. Green indicates faster hiring; red indicates longer timelines that may need attention."
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
            height: Math.max(400, deptTTH.departments.length * 28),
            margin: { l: 200, r: 20, t: 10, b: 40 },
            yaxis: { title: "" },
            xaxis: { title: "Avg Days to Accepted Offer" },
            coloraxis: { showscale: false },
          }}
          style={{ marginTop: 16 }}
        />
      )}

      {trendData.months.length > 0 && (
        <ChartCard
          title="Average Time-to-Hire Trend"
          description="Monthly trend of average days to accepted offer. Based on the job close date month. Helps track whether hiring speed is improving or declining over time."
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
          style={{ marginTop: 16 }}
        />
      )}
    </>
  );
}
