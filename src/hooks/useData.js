import { useState, useEffect } from "react";

const base = import.meta.env.BASE_URL;
const DATA_FILES = {
  jobs: `${base}data/jobs.json`,
  hiresSource: `${base}data/hires_source.json`,
  monthlyHires: `${base}data/monthly_hires.json`,
  kpiScalars: `${base}data/kpi_scalars.json`,
  openings: `${base}data/openings.json`,
};

export function useData() {
  const [data, setData] = useState({
    jobs: [],
    hiresSource: [],
    monthlyHires: [],
    kpiScalars: {},
    openings: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      try {
        const [jobsRes, hsRes, mhRes, kpiRes, openingsRes] = await Promise.all([
          fetch(DATA_FILES.jobs),
          fetch(DATA_FILES.hiresSource),
          fetch(DATA_FILES.monthlyHires),
          fetch(DATA_FILES.kpiScalars),
          fetch(DATA_FILES.openings),
        ]);

        const [jobs, hiresSource, monthlyHires, kpiScalars, openings] = await Promise.all(
          [jobsRes.json(), hsRes.json(), mhRes.json(), kpiRes.json(), openingsRes.json()]
        );

        if (!cancelled) {
          setData({
            jobs,
            hiresSource,
            monthlyHires,
            kpiScalars,
            openings,
            loading: false,
            error: null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setData((prev) => ({
            ...prev,
            loading: false,
            error: err.message,
          }));
        }
      }
    }

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
