import Select from "react-select";
import { useFilters } from "../context/FilterContext";
import { COLORS } from "../config";
import { NavLink } from "react-router-dom";

const selectStyles = {
  control: (base) => ({
    ...base,
    fontSize: "0.85rem",
    minHeight: 36,
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: "#E8F4F8",
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: COLORS.primary,
  }),
};

function toOptions(values) {
  return values.map((v) => ({ value: v, label: v }));
}

function fromOptions(selected) {
  return selected ? selected.map((s) => s.value) : [];
}

const NAV_LINKS = [
  { to: "/", label: "Overview" },
  { to: "/pipeline", label: "Hiring Pipeline" },
  { to: "/time-to-hire", label: "Time-to-Hire" },
  { to: "/open-reqs", label: "Open Requisitions" },
  { to: "/hires-source", label: "Hires & Source" },
];

export default function Sidebar() {
  const { filters, setFilters, filterOptions, cascadedOptions } = useFilters();

  const update = (key, values) => {
    setFilters((prev) => ({ ...prev, [key]: values }));
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2 style={{ color: COLORS.primary, margin: 0 }}>Greenhouse</h2>
        <p style={{ color: "#666", fontSize: "0.85rem", margin: 0 }}>
          Recruiting Dashboard
        </p>
      </div>

      <hr />

      <nav className="sidebar-nav">
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `nav-link ${isActive ? "nav-link--active" : ""}`
            }
            end={link.to === "/"}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <hr />

      <div className="sidebar-filters">
        <label className="filter-label">Division</label>
        <Select
          isMulti
          options={toOptions(filterOptions.Division)}
          value={toOptions(filters.divisions)}
          onChange={(sel) => update("divisions", fromOptions(sel))}
          styles={selectStyles}
          placeholder="All Divisions"
          isClearable
        />

        <label className="filter-label">Department</label>
        <Select
          isMulti
          options={toOptions(cascadedOptions.departments)}
          value={toOptions(filters.departments)}
          onChange={(sel) => update("departments", fromOptions(sel))}
          styles={selectStyles}
          placeholder="All Departments"
          isClearable
        />

        <label className="filter-label">Sub-Department</label>
        <Select
          isMulti
          options={toOptions(cascadedOptions.subDepartments)}
          value={toOptions(filters.subDepartments)}
          onChange={(sel) => update("subDepartments", fromOptions(sel))}
          styles={selectStyles}
          placeholder="All Sub-Departments"
          isClearable
        />

        <hr />

        <label className="filter-label">Job Status</label>
        <Select
          isMulti
          options={toOptions(filterOptions.CurrentJobStatus)}
          value={toOptions(filters.statuses)}
          onChange={(sel) => update("statuses", fromOptions(sel))}
          styles={selectStyles}
          placeholder="All Statuses"
          isClearable
        />

        <label className="filter-label">
          <input
            type="checkbox"
            checked={filters.excludeTemplates}
            onChange={(e) => update("excludeTemplates", e.target.checked)}
            style={{ marginRight: 6 }}
          />
          Exclude template jobs
        </label>

        <hr />

        <label className="filter-label">Region</label>
        <Select
          isMulti
          options={toOptions(filterOptions.Region)}
          value={toOptions(filters.regions)}
          onChange={(sel) => update("regions", fromOptions(sel))}
          styles={selectStyles}
          placeholder="All Regions"
          isClearable
        />

        <label className="filter-label">Hiring Manager</label>
        <Select
          isMulti
          options={toOptions(filterOptions.HiringManager)}
          value={toOptions(filters.hiringManagers)}
          onChange={(sel) => update("hiringManagers", fromOptions(sel))}
          styles={selectStyles}
          placeholder="All Managers"
          isClearable
        />

        <hr />

        <div className="date-range-row">
          <div>
            <label className="filter-label">From</label>
            <input
              type="date"
              className="date-input"
              value={filters.dateFrom || ""}
              onChange={(e) => update("dateFrom", e.target.value || null)}
            />
          </div>
          <div>
            <label className="filter-label">To</label>
            <input
              type="date"
              className="date-input"
              value={filters.dateTo || ""}
              onChange={(e) => update("dateTo", e.target.value || null)}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
