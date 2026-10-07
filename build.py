# Builds index.html (or preview.html with: python3 build.py preview) from the parts in src/.
# The app ships as one self-contained HTML file; edit src/, never index.html.
import os
ROOT = os.path.dirname(os.path.abspath(__file__))
def src(name): return open(os.path.join(ROOT, 'src', name), encoding='utf-8').read()
import sys
preview = 'preview' in sys.argv[1:]   # build preview.html instead of index.html
style=src('style.css')+src('extra.css')+src('dialog.css')
body=src('body.html').replace('{{SVG}}',src('svg.html').rstrip('\n'))
if preview:
    body = body.replace('<main class="app">', '<main class="app">\n  <a class="preview-tag" href="./">預覽版 · 回正式版</a>', 1)
    style += '.preview-tag{align-self:flex-start;font-size:.78rem;color:#fff;background:var(--kesa);padding:2px 10px;border-radius:999px;text-decoration:none}\n'
script=src('app.js')
head='''<title>警策道場</title>
<script>
/* apply a saved light/dark choice before first paint, so the page doesn't flash the other theme */
try { const t = (JSON.parse(localStorage.getItem('keisaku-opts-v1')) || {}).theme; if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; } catch (e) {}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC:wght@400;700&family=Fredoka:wght@500;600&display=swap">
<style>
'''+style+'''</style>
'''
open(os.path.join(ROOT, 'preview.html' if preview else 'index.html'),'w').write('''<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#e9ecdf" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#141816" media="(prefers-color-scheme: dark)">
<meta name="description" content="可愛的番茄鐘專注 App。拿起手機,住持就會拿警策「啪」你一下。">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="警策道場">
'''+head+'''</head>
<body>
'''+body+'\n<script>\n'+script+'</script>\n<script>\nif (\'serviceWorker\' in navigator && location.protocol.startsWith(\'http\')) {\n  addEventListener(\'load\', () => navigator.serviceWorker.register(\'sw.js\').catch(() => {}));\n}\n</script>\n</body>\n</html>\n')
