import { createContext, useContext, useState, useMemo } from "react";
import { applyFilters, applyFiltersHiresSource } from "../utils/filters";

const FilterContext = createContext(null);

const INITIAL_FILTERS = {
  hiringManagers: [],
  divisions: [],
  departments: [],
  subDepartments: [],
  regions: [],
  statuses: [],
  excludeTemplates: true,
  excludeInterns: false,
  dateFrom: null,
  dateTo: null,
};

export function FilterProvider({ data, children }) {
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  // Memoized filtered datasets
  const filteredJobs = useMemo(
    () => applyFilters(data.jobs, filters),
    [data.jobs, filters]
  );

  const filteredHiresSource = useMemo(
    () => applyFiltersHiresSource(data.hiresSource, filters),
    [data.hiresSource, filters]
  );

  // Extract unique filter options from raw jobs data
  const filterOptions = useMemo(() => {
    const jobs = data.jobs || [];
    const unique = (col) => {
      const vals = [...new Set(jobs.map((r) => r[col]).filter(Boolean))];
      vals.sort();
      return vals;
    };
    return {
      Division: unique("Division"),
      Department: unique("Department"),
      SubDepartment: unique("SubDepartment"),
      Region: unique("Region"),
      HiringManager: unique("HiringManager"),
      CurrentJobStatus: unique("CurrentJobStatus"),
    };
  }, [data.jobs]);

  // Cascaded filter options (Division → Department → SubDepartment)
  const cascadedOptions = useMemo(() => {
    const jobs = data.jobs || [];
    let deptPool = jobs;
    let subDeptPool = jobs;

    if (filters.divisions.length > 0) {
      const divSet = new Set(filters.divisions);
      deptPool = jobs.filter((r) => divSet.has(r.Division));
      subDeptPool = deptPool;
    }
    if (filters.departments.length > 0) {
      const deptSet = new Set(filters.departments);
      subDeptPool = deptPool.filter((r) => deptSet.has(r.Department));
    }

    const deptVals = [
      ...new Set(deptPool.map((r) => r.Department).filter(Boolean)),
    ].sort();
    const subDeptVals = [
      ...new Set(subDeptPool.map((r) => r.SubDepartment).filter(Boolean)),
    ].sort();

    return {
      departments: deptVals,
      subDepartments: subDeptVals,
    };
  }, [data.jobs, filters.divisions, filters.departments]);

  // Filter openings by division (only column available for filtering)
  const filteredOpenings = useMemo(() => {
    const openings = data.openings || [];
    if (filters.divisions.length === 0) return openings;
    const divSet = new Set(filters.divisions);
    return openings.filter((r) => divSet.has(r.Division));
  }, [data.openings, filters.divisions]);

  const value = {
    filters,
    setFilters,
    filteredJobs,
    filteredHiresSource,
    filteredOpenings,
    filterOptions,
    cascadedOptions,
    rawData: data,
  };

  return (
    <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx)
    throw new Error("useFilters must be used within a FilterProvider");
  return ctx;
}
