#!/bin/bash
set -e

# If data files already have content (committed to repo), skip the BQ fetch
JOBS_SIZE=$(wc -c < public/data/jobs.json 2>/dev/null || echo "0")

if [ "$JOBS_SIZE" -gt 10 ]; then
  echo "=== Data files already present (jobs.json: ${JOBS_SIZE} bytes), skipping BQ fetch ==="
else
  echo "=== Data files empty, attempting BQ fetch ==="
  if [ -n "$GOOGLE_APPLICATION_CREDENTIALS_JSON" ]; then
    pip3 install -r requirements-build.txt
    python3 scripts/fetch_data.py
  else
    echo "WARNING: No credentials set and no data files — dashboard will be empty"
  fi
fi

echo "=== Data files ==="
ls -la public/data/

echo "=== Building React app ==="
npm run build:vite

echo "=== Done ==="
