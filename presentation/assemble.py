"""Assemble the single-file presentation. Usage: python3 assemble.py OUT [--dev]
--dev: use stubs instead of the art modules (for layout work while art is in progress)."""
import base64, os, sys
B = os.path.dirname(os.path.abspath(__file__))
out, dev = sys.argv[1], '--dev' in sys.argv
use = set(sys.argv[sys.argv.index('--use') + 1].split(',')) if '--use' in sys.argv else set()
rd = lambda f: open(os.path.join(B, f)).read()
b64 = lambda f, m: f'data:{m};base64,' + base64.b64encode(open(os.path.join(B, f), 'rb').read()).decode()
t = rd('template.html')
t = t.replace('%%FONT_PIXELIFY%%', b64('fonts/pixelify-latin.woff2', 'font/woff2'))
t = t.replace('%%FONT_DM400%%', b64('fonts/dmsans-400.woff2', 'font/woff2')).replace('%%FONT_DM500%%', b64('fonts/dmsans-500.woff2', 'font/woff2'))
mods = {'PX': 'px.js', 'TITLE': 'title.js', 'AUDIO': 'audio.js', 'MAIN': 'main.js'}
art = {'WORLD': 'world.js', 'CHARS': 'chars.js', 'INTERIORS': 'interiors.js', 'DIORAMAS': 'dioramas.js'}
for k, f in mods.items(): t = t.replace(f'%%{k}%%', rd(f))
for k, f in art.items(): t = t.replace(f'%%{k}%%', rd(f) if (not dev or k.lower() in use) and os.path.exists(os.path.join(B, f)) else '')
t = t.replace('%%STUBS%%', rd('stubs.js') if dev else '')
assert '%%' not in t
for tag in ('</script',):
    pass
open(out, 'w').write(t)
print(out, round(len(t) / 1024), 'KB', '(dev)' if dev else '')
