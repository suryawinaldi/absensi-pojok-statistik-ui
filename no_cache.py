import os

html_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

no_cache_meta = '''
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />
'''

if "Cache-Control" not in html:
    html = html.replace('<head>', '<head>' + no_cache_meta)
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print("Added no-cache headers")
else:
    print("Already has no-cache headers")
