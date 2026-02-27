/**
 * Apply sidebar filters to the jobs array.
 * Mirrors data.py apply_filters().
 */
export function applyFilters(data, filters) {
  if (!data || !filters) return data || [];
  let filtered = data;

  const {
    hiringManagers,
    divisions,
    departments,
    subDepartments,
    regions,
    dateFrom,
    dateTo,
    statuses,
    excludeTemplates,
    excludeInterns,
  } = filters;

  // Exclude template jobs by default
  if (excludeTemplates !== false) {
    filtered = filtered.filter((r) => !r.IsTemplate);
  }
  // Exclude intern roles
  if (excludeInterns) {
    filtered = filtered.filter(
      (r) => !r.JobName || !r.JobName.toLowerCase().includes("intern")
    );
  }
  // Job status filter
  if (statuses && statuses.length > 0) {
    const set = new Set(statuses);
    filtered = filtered.filter((r) => set.has(r.CurrentJobStatus));
  }
  if (hiringManagers && hiringManagers.length > 0) {
    const set = new Set(hiringManagers);
    filtered = filtered.filter((r) => set.has(r.HiringManager));
  }
  if (divisions && divisions.length > 0) {
    const set = new Set(divisions);
    filtered = filtered.filter((r) => set.has(r.Division));
  }
  if (departments && departments.length > 0) {
    const set = new Set(departments);
    filtered = filtered.filter((r) => set.has(r.Department));
  }
  if (subDepartments && subDepartments.length > 0) {
    const set = new Set(subDepartments);
    filtered = filtered.filter((r) => set.has(r.SubDepartment));
  }
  if (regions && regions.length > 0) {
    const set = new Set(regions);
    filtered = filtered.filter((r) => set.has(r.Region));
  }
  if (dateFrom) {
    const from = new Date(dateFrom);
    filtered = filtered.filter(
      (r) => r.JobOpenDate && new Date(r.JobOpenDate) >= from
    );
  }
  if (dateTo) {
    const to = new Date(dateTo);
    filtered = filtered.filter(
      (r) => r.JobOpenDate && new Date(r.JobOpenDate) <= to
    );
  }

  return filtered;
}

/**
 * Apply filters to the HiresSource array.
 * Uses YearMonth instead of JobOpenDate for date filtering.
 */
export function applyFiltersHiresSource(data, filters) {
  if (!data || !filters) return data || [];
  let filtered = data;

  const { hiringManagers, divisions, departments, regions, dateFrom, dateTo } =
    filters;

  if (hiringManagers && hiringManagers.length > 0) {
    const set = new Set(hiringManagers);
    filtered = filtered.filter((r) => set.has(r.HiringManager));
  }
  if (divisions && divisions.length > 0) {
    const set = new Set(divisions);
    filtered = filtered.filter((r) => set.has(r.Division));
  }
  if (departments && departments.length > 0) {
    const set = new Set(departments);
    filtered = filtered.filter((r) => set.has(r.Department));
  }
  if (regions && regions.length > 0) {
    const set = new Set(regions);
    filtered = filtered.filter((r) => set.has(r.Region));
  }
  if (dateFrom) {
    const from = new Date(dateFrom);
    filtered = filtered.filter(
      (r) => r.YearMonth && new Date(r.YearMonth) >= from
    );
  }
  if (dateTo) {
    const to = new Date(dateTo);
    filtered = filtered.filter(
      (r) => r.YearMonth && new Date(r.YearMonth) <= to
    );
  }

  return filtered;
}
