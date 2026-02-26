// Color palette — ported from config.py
export const COLORS = {
  primary: "#1B6B93",
  secondary: "#4FC0D0",
  accent: "#FF6B35",
  success: "#2ECC71",
  warning: "#F39C12",
  danger: "#E74C3C",
  dark: "#1A1A2E",
  light: "#F8F9FA",
};

// Sequential palette for charts with multiple series
export const CHART_PALETTE = [
  "#1B6B93", // deep blue
  "#4FC0D0", // teal
  "#FF6B35", // orange
  "#2ECC71", // green
  "#9B59B6", // purple
  "#F39C12", // amber
  "#E74C3C", // red
  "#1ABC9C", // mint
  "#3498DB", // sky blue
  "#E67E22", // dark orange
  "#8E44AD", // dark purple
  "#16A085", // dark mint
];

// Funnel stage colors (gradient from blue to green)
export const FUNNEL_COLORS = ["#1B6B93", "#2980B9", "#4FC0D0", "#1ABC9C", "#2ECC71"];

// Aging bucket colors
export const AGING_COLORS = {
  "0-30 days": "#2ECC71",
  "31-60 days": "#F39C12",
  "61-90 days": "#E67E22",
  "90+ days": "#E74C3C",
};

// Column mappings (friendly name → actual BQ column name)
export const JOB_COLS = {
  id: "JobID",
  req_id: "ReqID",
  title: "JobName",
  status: "CurrentJobStatus",
  client_group: "ClientGroup",
  division: "Division",
  department: "Department",
  sub_department: "SubDepartment",
  div_equiv: "DivEquiv",
  region: "Region",
  stem: "STEM",
  hiring_manager: "HiringManager",
  recruiter: "Recruiter",
  coordinator: "Coordinator",
  opened_date: "JobOpenDate",
  closed_date: "JobCloseDate",
  days_open: "JobOpenDays",
  applications: "TotalApplicationsSubmitted",
  rejected: "TotalRejectedApplications",
  screened: "TotalScreenedApplications",
  interviews: "TotalInterviewsConducted",
  offers: "TotalOffersMade",
  offers_rejected: "TotalOffersRejected",
  hires: "TotalHires",
  days_to_offer: "DaysToAcceptedOffer",
  employment_type: "EmployementType",
  accepted_offer_created: "AcceptedOfferCreatedAt",
  accepted_offer_start: "AcceptedOfferStartDate",
  app_submitted_date: "ApplicationSubmittedDate",
  is_template: "IsTemplate",
};

export const PAGE_TITLE = "Greenhouse Recruiting Dashboard";
