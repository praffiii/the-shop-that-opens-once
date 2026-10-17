#!/bin/sh
# Builds the web version of the game and publishes it at https://the-shop-that-opens-once-game.vercel.app
# Needs Godot 4.7.2 with its web export templates, and the Vercel CLI logged in to praffis-projects.
set -e
cd "$(dirname "$0")"
godot="${GODOT:-/Applications/Godot.app/Contents/MacOS/Godot}"
out=$(mktemp -d); trap 'rm -rf "$out"' EXIT
"$godot" --headless --path . --export-release "Web" "$out/index.html"
mkdir "$out/.vercel"
echo '{"projectId":"prj_cDACw2Q6bl3gm5MbQ5oTHiUzzaY7","orgId":"team_Qa7Pf8FvoElnEchXIr3ikkUk","projectName":"the-shop-that-opens-once-game"}' > "$out/.vercel/project.json"
cd "$out"; vercel deploy --prod --yes
