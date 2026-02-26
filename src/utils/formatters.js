/** Format a number with comma separators. */
export function fmtNumber(n) {
  if (n == null) return "\u2014";
  const num = parseInt(n, 10);
  if (isNaN(num)) return String(n);
  return num.toLocaleString("en-US");
}

/** Format a number as a percentage string. */
export function fmtPct(n, decimals = 1) {
  if (n == null) return "\u2014";
  const num = parseFloat(n);
  if (isNaN(num)) return String(n);
  return `${num.toFixed(decimals)}%`;
}

/** Format a number as days. */
export function fmtDays(n) {
  if (n == null) return "\u2014";
  const num = parseFloat(n);
  if (isNaN(num)) return String(n);
  return `${Math.round(num)} days`;
}
