#!/usr/bin/env python3
"""Export the presentation's code-drawn art and synthesized sound into game/art/.

Usage: python3 export.py [--force] [part ...]    parts: village, rooms, cast, sound (default: all)

Renders export.html?only=<part> in headless Google Chrome and writes the files it returns: PNG and JSON as they
are, and WAV audio encoded to OGG Vorbis with oggenc. Chrome is driven over the DevTools pipe, so a part may be
asynchronous: the page's `done` promise settles once the part has finished.
Walk masks (walk.png) are only seeds: they are written when missing, or with --force,
because they are meant to be repainted by hand.
"""
import base64
import json
import os
import pathlib
import shutil
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
ART = HERE.parent.parent / "art"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PARTS = ["village", "rooms", "cast", "sound"]


def run(url: str) -> tuple[str, str]:
    """Open url in headless Chrome, await the page's `done` and return the id and text of the <pre> it settles to."""
    (chrome_reads, we_write), (we_read, chrome_writes) = os.pipe(), os.pipe()
    chrome = subprocess.Popen(  # --remote-debugging-pipe: Chrome reads commands on fd 3 and answers on fd 4
        [CHROME, "--headless=new", "--disable-gpu", "--allow-file-access-from-files", "--remote-debugging-pipe"],
        pass_fds=(3, 4), preexec_fn=lambda: (os.dup2(chrome_reads, 3), os.dup2(chrome_writes, 4)),
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    os.close(chrome_reads)
    os.close(chrome_writes)
    pipe, rest, sent, events = os.fdopen(we_write, "wb"), b"", 0, set()

    def read() -> dict:  # the next message; each ends with \0
        nonlocal rest
        parts = [rest]
        while b"\0" not in parts[-1]:
            chunk = os.read(we_read, 1 << 20)
            if not chunk:
                sys.exit("Chrome closed the DevTools pipe")
            parts.append(chunk)
        last, _, rest = parts.pop().partition(b"\0")
        return json.loads(b"".join(parts) + last)

    def call(method: str, session: str = "", **params) -> dict:
        nonlocal sent
        sent += 1
        msg = {"id": sent, "method": method, "params": params, **({"sessionId": session} if session else {})}
        pipe.write(json.dumps(msg).encode() + b"\0")
        pipe.flush()
        while (msg := read()).get("id") != sent:
            events.add(msg.get("method"))
        if "error" in msg:
            sys.exit(f"Chrome: {method}: {msg['error']['message']}")
        return msg["result"]

    try:
        target = call("Target.createTarget", url="about:blank")["targetId"]
        session = call("Target.attachToTarget", targetId=target, flatten=True)["sessionId"]
        call("Page.enable", session)
        call("Page.navigate", session, url=url)
        while "Page.loadEventFired" not in events:  # until then the page's scripts may not have run
            events.add(read().get("method"))
        found = call("Runtime.evaluate", session, expression="done.then(el => [el.id, el.textContent])",
                     awaitPromise=True, returnByValue=True)
        return ("err", found["result"].get("description", "")) if "exceptionDetails" in found else found["result"]["value"]
    finally:
        chrome.terminate()
        chrome.wait()
        pipe.close()
        os.close(we_read)


def encode(wav: bytes, path: pathlib.Path) -> None:
    """Encode WAV audio to OGG Vorbis at path with a fixed stream serial, so the same sound gives the same file."""
    if not shutil.which("oggenc"):
        sys.exit("the sound part needs oggenc: brew install vorbis-tools")
    done = subprocess.run(["oggenc", "-Q", "-q", "6", "-s", "1", "-o", str(path), "-"], input=wav, capture_output=True)
    if done.returncode:
        sys.exit(f"oggenc could not encode {path.name}:\n{done.stderr.decode()}")


def export(part: str, force: bool) -> None:
    kind, text = run((HERE / "export.html").as_uri() + "?only=" + part)
    if kind != "out":
        sys.exit(f"{part}: export failed; open export.html?only={part} in Chrome and check the console\n{text}")
    files: dict[str, str] = json.loads(text)
    written = 0
    for rel, data in files.items():
        path = ART / rel
        if path.name == "walk.png" and path.exists() and not force:
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        if data.startswith("data:image/png;base64,"):
            path.write_bytes(base64.b64decode(data.split(",", 1)[1]))
        elif data.startswith("data:audio/wav;base64,"):
            encode(base64.b64decode(data.split(",", 1)[1]), path)
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
