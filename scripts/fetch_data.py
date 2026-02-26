"""Build-time BigQuery fetcher — writes static JSON files for the React dashboard."""

import json
import os
import sys

import pandas as pd
from google.cloud import bigquery

# ── BigQuery Table References ────────────────────────────────────────────────
JOBS_TABLE = "geotab-hr-prod.Recruitment_EU.Jobs_EU"
HIRES_SOURCE_TABLE = "geotab-greenhouse-prod.ConsumptionTables_EU.HiresSource_EU"
MONTHLY_HIRES_TABLE = "geotab-hr-prod.PeopleOpsDashboard_EU.MonthlyHires_EU"
AVG_TTH_TABLE = "geotab-hr-prod.PeopleOpsDashboard_EU.AverageTimeToHireYTD_EU"
OPEN_FTE_TABLE = "geotab-hr-prod.PeopleOpsDashboard_EU.NumberOfOpenFulltimeReqs_EU"
REMAINING_HC_TABLE = "geotab-hr-prod.PeopleOpsDashboard_EU.RemainingHeadcountofOpenReqs_EU"

BQ_PROJECT = "geotab-hr-prod"
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "data")


def get_client():
    """Create a BigQuery client, using GOOGLE_APPLICATION_CREDENTIALS_JSON if set."""
    creds_json = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON")
    if creds_json:
        import tempfile
        tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False)
        tmp.write(creds_json)
        tmp.close()
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = tmp.name
    return bigquery.Client(project=BQ_PROJECT)


def df_to_json(df, path):
    """Write a DataFrame to JSON with ISO dates, NaN replaced with null."""
    for col in df.select_dtypes(include=["datetime64", "datetimetz"]).columns:
        df[col] = df[col].dt.strftime("%Y-%m-%dT%H:%M:%S")
    # Replace NaN/NaT with None so json.dump writes null (valid JSON)
    df = df.where(pd.notnull(df), None)
    records = df.to_dict(orient="records")
    with open(path, "w") as f:
        json.dump(records, f, default=str)
    print(f"  -> {path} ({len(records)} rows)")


def safe_query(client, query, label):
    """Run a query, returning an empty DataFrame on error."""
    try:
        return client.query(query).to_dataframe()
    except Exception as e:
        print(f"  WARNING: {label} failed: {e}")
        return pd.DataFrame()


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    client = get_client()
    print("Fetching data from BigQuery...")

    # 1. Jobs — latest-day snapshot, selected columns only
    print("1/5  Jobs (latest snapshot)")
    jobs_query = f"""
    SELECT
        JobID, ReqID, JobName, CurrentJobStatus, ClientGroup,
        Division, Department, SubDepartment, DivEquiv, Region,
        STEM, HiringManager, Recruiter, Coordinator,
        JobOpenDate, JobCloseDate, JobOpenDays,
        TotalApplicationsSubmitted, TotalRejectedApplications,
        TotalScreenedApplications, TotalInterviewsConducted,
        TotalOffersMade, TotalOffersRejected, TotalHires,
        DaysToAcceptedOffer, EmployementType,
        AcceptedOfferCreatedAt, AcceptedOfferStartDate,
        ApplicationSubmittedDate, IsTemplate
    FROM `{JOBS_TABLE}`
    WHERE UploadDate = (SELECT MAX(UploadDate) FROM `{JOBS_TABLE}`)
    """
    jobs_df = safe_query(client, jobs_query, "Jobs")
    for col in ["JobOpenDate", "JobCloseDate", "AcceptedOfferCreatedAt",
                 "AcceptedOfferStartDate", "ApplicationSubmittedDate"]:
        if col in jobs_df.columns:
            jobs_df[col] = pd.to_datetime(jobs_df[col], errors="coerce")
    df_to_json(jobs_df, os.path.join(OUT_DIR, "jobs.json"))

    # 2. Hires Source
    print("2/5  Hires Source")
    hs_query = f"SELECT * FROM `{HIRES_SOURCE_TABLE}`"
    hs_df = safe_query(client, hs_query, "HiresSource")
    if "YearMonth" in hs_df.columns:
        hs_df["YearMonth"] = pd.to_datetime(hs_df["YearMonth"], errors="coerce")
    df_to_json(hs_df, os.path.join(OUT_DIR, "hires_source.json"))

    # 3. Monthly Hires
    print("3/5  Monthly Hires")
    mh_query = f"SELECT * FROM `{MONTHLY_HIRES_TABLE}` ORDER BY Month"
    mh_df = safe_query(client, mh_query, "MonthlyHires")
    if "Month" in mh_df.columns:
        mh_df["Month"] = pd.to_datetime(mh_df["Month"], errors="coerce")
    df_to_json(mh_df, os.path.join(OUT_DIR, "monthly_hires.json"))

    # 4–6. KPI scalars (combined into one file)
    print("4/5  KPI scalars (TTH, FTE, HC)")
    scalars = {}

    tth_df = safe_query(client, f"SELECT * FROM `{AVG_TTH_TABLE}` ORDER BY AsOfDate DESC LIMIT 1", "AvgTTH")
    if not tth_df.empty and "AverageTimeToHireYTD" in tth_df.columns:
        val = tth_df["AverageTimeToHireYTD"].iloc[0]
        if pd.notna(val):
            scalars["avg_tth_ytd"] = float(val)

    fte_df = safe_query(client, f"SELECT * FROM `{OPEN_FTE_TABLE}` ORDER BY AsOfDate DESC LIMIT 1", "OpenFTE")
    if not fte_df.empty and "NumberofOpenFulltimeReqs" in fte_df.columns:
        scalars["open_fte"] = int(fte_df["NumberofOpenFulltimeReqs"].iloc[0])

    hc_df = safe_query(client, f"SELECT * FROM `{REMAINING_HC_TABLE}` ORDER BY AsOfDate DESC LIMIT 1", "RemainingHC")
    if not hc_df.empty and "RemainingHeadcountOfOpenReqs" in hc_df.columns:
        scalars["remaining_hc"] = int(hc_df["RemainingHeadcountOfOpenReqs"].iloc[0])

    with open(os.path.join(OUT_DIR, "kpi_scalars.json"), "w") as f:
        json.dump(scalars, f)
    print(f"  -> kpi_scalars.json ({scalars})")

    print("5/5  Done! All JSON files written to", OUT_DIR)


if __name__ == "__main__":
    main()
