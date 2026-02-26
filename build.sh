#!/bin/bash
set -e

echo "=== Python version ==="
python3 --version

echo "=== Checking GOOGLE_APPLICATION_CREDENTIALS_JSON ==="
if [ -z "$GOOGLE_APPLICATION_CREDENTIALS_JSON" ]; then
  echo "WARNING: GOOGLE_APPLICATION_CREDENTIALS_JSON is NOT set!"
else
  echo "Yes, env var is set (length: $(echo -n "$GOOGLE_APPLICATION_CREDENTIALS_JSON" | wc -c) chars)"
fi

echo "=== Installing Python deps ==="
pip3 install -r requirements-build.txt

echo "=== Fetching data from BigQuery ==="
python3 scripts/fetch_data.py

echo "=== Data files ==="
ls -la public/data/

echo "=== Installing npm deps ==="
npm install

echo "=== Building React app ==="
npm run build

echo "=== Done ==="
