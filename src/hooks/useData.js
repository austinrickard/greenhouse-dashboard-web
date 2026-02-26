import { useState, useEffect } from "react";

const DATA_FILES = {
  jobs: "/data/jobs.json",
  hiresSource: "/data/hires_source.json",
  monthlyHires: "/data/monthly_hires.json",
  kpiScalars: "/data/kpi_scalars.json",
};

export function useData() {
  const [data, setData] = useState({
    jobs: [],
    hiresSource: [],
    monthlyHires: [],
    kpiScalars: {},
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      try {
        const [jobsRes, hsRes, mhRes, kpiRes] = await Promise.all([
          fetch(DATA_FILES.jobs),
          fetch(DATA_FILES.hiresSource),
          fetch(DATA_FILES.monthlyHires),
          fetch(DATA_FILES.kpiScalars),
        ]);

        const [jobs, hiresSource, monthlyHires, kpiScalars] = await Promise.all(
          [jobsRes.json(), hsRes.json(), mhRes.json(), kpiRes.json()]
        );

        if (!cancelled) {
          setData({
            jobs,
            hiresSource,
            monthlyHires,
            kpiScalars,
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
