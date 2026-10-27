"""Build the bundled notices page from the repository documents; no dependencies."""
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
