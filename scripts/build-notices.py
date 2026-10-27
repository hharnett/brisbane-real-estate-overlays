"""Build bundled notices and the GitHub Pages privacy policy; no dependencies."""
from pathlib import Path
from html import escape
import re

ROOT = Path(__file__).resolve().parent.parent

def inline(text):
    text = escape(text)
    text = re.sub(r'\[([^\]]+)\]\((https://[^\s)]+)\)', r'<a href="\2" target="_blank" rel="noopener noreferrer">\1</a>', text)
    text = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', text)
    return re.sub(r'`([^`]+)`', r'<code>\1</code>', text)

def render(filename):
    lines = (ROOT / filename).read_text().splitlines()
    output = []
    for line in lines:
        if not line.strip():
            continue
        if line.startswith('|'):
            if '---' in line:
                continue
            cells = [inline(c.strip()) for c in line.strip('|').split('|')]
            output.append('<p>' + ' — '.join(cells) + '</p>')
        elif line.startswith('#'):
            level = min(len(line) - len(line.lstrip('#')) + 1, 4)
            output.append(f'<h{level}>{inline(line.lstrip("# "))}</h{level}>')
        elif line.startswith('> '):
            output.append('<blockquote>' + inline(line[2:]) + '</blockquote>')
        else:
            output.append('<p>' + inline(line.removeprefix('- ')) + '</p>')
    return '\n'.join(output)

page = '''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Privacy & data notices — Brisbane Real Estate Overlay</title>
<style>body{font:15px/1.65 "Helvetica Neue",Helvetica,Arial,sans-serif;color:#173c58;background:#edf7ff;margin:0}main{max-width:850px;margin:40px auto;padding:30px;background:#fff;border:1px solid #cce1f1;border-radius:14px}h1{font-size:25px}h2{font-size:21px}h3{font-size:17px;margin-top:26px}a{color:#1c6294;overflow-wrap:anywhere}pre{white-space:pre-wrap;font-size:12px}details{border-top:1px solid #cce1f1;padding:18px 0}summary{cursor:pointer;font-weight:700}blockquote{margin:16px 0;border-left:3px solid #a9cfe9;padding-left:16px}@media(max-width:600px){main{margin:0;border:0;padding:20px}}</style>
</head><body><main><h1>Brisbane Real Estate Overlay</h1><p>Independent extension · Privacy, data attribution and code licence</p>
'''
for title, filename in [('Privacy', 'PRIVACY.md'), ('Data attribution & sources', 'ATTRIBUTION.md')]:
    page += '<details open><summary>' + title + '</summary>' + render(filename) + '</details>'
page += '<details><summary>Software licence — MIT</summary><pre>' + escape((ROOT / 'LICENSE').read_text()) + '</pre></details></main></body></html>\n'
(ROOT / 'about.html').write_text(page)

# Publish this folder through GitHub Pages (main /docs). PRIVACY.md remains the
# source of truth for both the extension's notices and the public policy.
privacy = '''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="Privacy policy for the Brisbane Real Estate Overlay browser extension.">
<title>Privacy policy — Brisbane Real Estate Overlay</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#edf7ff;color:#173c58;font:16px/1.7 "Helvetica Neue",Helvetica,Arial,sans-serif}
main{max-width:800px;margin:40px auto;padding:36px;background:white;border:1px solid #cce1f1;border-radius:16px}
h1{font-size:28px;line-height:1.2}h2{font-size:24px}h3{font-size:19px;margin-top:28px}a{color:#1c6294;overflow-wrap:anywhere}
code{font-size:.9em;overflow-wrap:anywhere}header p,footer{color:#52738b}footer{border-top:1px solid #cce1f1;margin-top:32px;padding-top:20px;font-size:14px}
a:focus-visible{outline:3px solid #78b9e6;outline-offset:3px}@media(max-width:600px){main{margin:0;padding:24px;border:0;border-radius:0}}
</style></head><body><main><header><h1>Brisbane Real Estate Overlay</h1><p>Privacy policy · Independent browser extension</p></header>
'''
privacy += render('PRIVACY.md')
privacy += '''<footer><p>Maintained by <a href="https://github.com/hharnett">hharnett</a>.</p>
<p><a href="https://github.com/hharnett/brisbane-real-estate-overlays">Project and source code</a> · <a href="https://github.com/hharnett/brisbane-real-estate-overlays/issues">Privacy questions and issues</a></p>
<p>This page has no analytics or third-party scripts. It is hosted by GitHub Pages; GitHub processes visitor request information under its <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">privacy statement</a>.</p>
</footer></main></body></html>
'''
docs = ROOT / 'docs'
docs.mkdir(exist_ok=True)
(docs / 'index.html').write_text(privacy)
(docs / '.nojekyll').touch()
