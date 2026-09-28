#!/usr/bin/env python3
"""Export the presentation's code-drawn art into game/art/ as PNG and JSON.

Usage: python3 export.py [--force] [part ...]    parts: village, rooms, cast (default: all)

Renders export.html?only=<part> in headless Google Chrome and writes the files it returns.
Walk masks (walk.png) are only seeds: they are written when missing, or with --force,
because they are meant to be repainted by hand.
"""
import base64
import html
import json
import pathlib
import re
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
ART = HERE.parent.parent / "art"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PARTS = ["village", "rooms", "cast"]


def export(part: str, force: bool) -> None:
    url = (HERE / "export.html").as_uri() + "?only=" + part
    dom = subprocess.run(
        [CHROME, "--headless=new", "--disable-gpu", "--allow-file-access-from-files", "--dump-dom", url],
        capture_output=True, text=True, check=True,
    ).stdout
    err = re.search(r'<pre id="err">(.*?)</pre>', dom, re.S)
    if err:
        sys.exit(f"{part}: export failed\n{html.unescape(err.group(1))}")
    found = re.search(r'<pre id="out">(.*?)</pre>', dom, re.S)
    if not found:
        sys.exit(f"{part}: no output; open export.html?only={part} in Chrome and check the console")
    files: dict[str, str] = json.loads(html.unescape(found.group(1)))
    written = 0
    for rel, data in files.items():
        path = ART / rel
        if path.name == "walk.png" and path.exists() and not force:
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        if data.startswith("data:image/png;base64,"):
            path.write_bytes(base64.b64decode(data.split(",", 1)[1]))
        else:
            path.write_text(data)
        written += 1
    print(f"{part}: wrote {written} of {len(files)} files")


if __name__ == "__main__":
    args = sys.argv[1:]
    force = "--force" in args
    parts = [a for a in args if a != "--force"] or PARTS
    for p in parts:
        if p not in PARTS:
            sys.exit(f"unknown part {p!r}; choose from {', '.join(PARTS)}")
        export(p, force)
