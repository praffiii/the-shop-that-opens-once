#!/bin/sh
# Rebuild the presentation and publish it to https://the-shop-that-opens-once.vercel.app
set -e
cd "$(dirname "$0")"
python3 assemble.py the-shop-that-opens-once.html

# Deploy from a throwaway folder holding only the page and the project link.
# `vercel link` is skipped on purpose: it downloads a login token into the folder.
out=$(mktemp -d)
trap 'rm -rf "$out"' EXIT
mkdir "$out/.vercel"
echo '{"projectId":"prj_JaYSS1ZdMJA3lNBykjMybSgaokj7","orgId":"team_Qa7Pf8FvoElnEchXIr3ikkUk","projectName":"the-shop-that-opens-once"}' > "$out/.vercel/project.json"
cp the-shop-that-opens-once.html "$out/index.html"
cd "$out"
vercel deploy --prod --yes
