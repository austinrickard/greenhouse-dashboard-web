import { useState, useEffect } from "react";

const base = import.meta.env.BASE_URL;
const bustCache = (url) => `${url}?v=${__DATA_VERSION__}`;
const DATA_FILES = {
  jobs: bustCache(`${base}data/jobs.json`),
  hiresSource: bustCache(`${base}data/hires_source.json`),
  monthlyHires: bustCache(`${base}data/monthly_hires.json`),
  kpiScalars: bustCache(`${base}data/kpi_scalars.json`),
  openings: bustCache(`${base}data/openings.json`),
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
