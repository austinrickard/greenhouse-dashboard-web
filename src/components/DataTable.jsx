import { useState, useMemo } from "react";

export default function DataTable({
  data,
  columns,
  defaultSort,
  defaultSortDir = "desc",
  cellStyle,
  maxHeight = 400,
}) {
  const [sortCol, setSortCol] = useState(defaultSort || (columns.length > 0 ? columns[0].key : null));
  const [sortDir, setSortDir] = useState(defaultSortDir);

  const sorted = useMemo(() => {
    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const sa = String(av);
      const sb = String(bv);
      return sortDir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
  }, [data, sortCol, sortDir]);

  const handleSort = (key) => {
    if (sortCol === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(key);
      setSortDir("desc");
    }
  };

  if (!data || data.length === 0) {
    return <p className="empty-state">No data available for the selected filters.</p>;
  }

  return (
    <div className="table-container" style={{ maxHeight }}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} onClick={() => handleSort(col.key)}>
                {col.label}
                {sortCol === col.key ? (sortDir === "asc" ? " \u25B2" : " \u25BC") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, ri) => (
            <tr key={ri}>
              {columns.map((col) => {
                const val = row[col.key];
                const style = cellStyle ? cellStyle(col.key, val, row) : {};
                return (
                  <td key={col.key} style={style}>
                    {val != null ? String(val) : "\u2014"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
