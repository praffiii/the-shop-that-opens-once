#!/usr/bin/env python3
"""Copy the game's exported art, sound, fonts and translations that the site uses into site/public/.

Usage: python3 tools/sync.py

Everything comes from the game's own export (game/Assets/Resources/Art/, drawn and synthesized in code in
game/ArtSource/); nothing is drawn again here. Images and JSON are copied as they are, without Unity's .meta files.
OGG sounds become MP3, which every browser plays. A file already up to date is left alone, so a rerun is quick.
"""
import pathlib
import shutil
import subprocess

SITE = pathlib.Path(__file__).resolve().parent.parent
GAME = SITE.parent / "game" / "Assets" / "Resources"
ART, OUT = GAME / "Art", SITE / "public"

# What the page shows: the cast, the UI kit, the keepsakes, and the two places it draws.
DIRS = ["chars", "ui", "icons", "items", "places/square", "places/grove"]
FILES = ["grades.json"]


def fresh(src: pathlib.Path, dst: pathlib.Path) -> bool:
    return dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime


def copy(src: pathlib.Path, dst: pathlib.Path) -> int:
    if fresh(src, dst):
        return 0
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    return 1


def main() -> None:
    n = 0
    for d in DIRS:
        for src in (ART / d).rglob("*"):
            if src.is_file() and src.suffix != ".meta" and src.name != ".DS_Store":
                n += copy(src, OUT / "art" / src.relative_to(ART))
    for f in FILES:
        n += copy(ART / f, OUT / "art" / f)
    for src in sorted((ART / "sound").glob("*.ogg")):
        dst = OUT / "sound" / (src.stem + ".mp3")
        if fresh(src, dst):
            continue
        dst.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-q:a", "4", str(dst)], check=True)
        n += 1
    n += copy(GAME / "Lang" / "id.json", OUT / "lang" / "id.json")
    for src in (SITE.parent / "presentation" / "fonts").glob("*"):
        n += copy(src, OUT / "fonts" / src.name)
    print(f"synced {n} files into {OUT.relative_to(SITE.parent)}")


if __name__ == "__main__":
    main()
