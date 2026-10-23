"""Builds ONE self-contained file (dist/wedding-card.html) from index.html + css + js + data + images.
Use it for hosts or viewers that only accept a single file.   Run:  python tools/bundle.py"""
import re, base64, mimetypes, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text(encoding='utf-8')

def inline_css(m):
    path = root / m.group(1)
    text = path.read_text(encoding='utf-8')
    def to_data_uri(u):
        f = (path.parent / u.group(1)).resolve()
        mime = mimetypes.guess_type(f.name)[0] or 'application/octet-stream'
        return 'url("data:%s;base64,%s")' % (mime, base64.b64encode(f.read_bytes()).decode())
    text = re.sub(r'url\(["\']?(\.\./assets/[^"\')]+)["\']?\)', to_data_uri, text)
    return '<style>\n' + text + '\n</style>'

html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', inline_css, html)
html = re.sub(r'<script src="([^"]+)"></script>',
              lambda m: '<script>\n' + (root / m.group(1)).read_text(encoding='utf-8') + '\n</script>', html)

out = root / 'dist'
out.mkdir(exist_ok=True)
(out / 'wedding-card.html').write_text(html, encoding='utf-8')
print('built', out / 'wedding-card.html')
