import re
with open('D:/APLIKASI ABSENSI POJOK STATISTIK/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Remove the custom body CSS
html = re.sub(r'body\s*\{[\s\S]*?z-index: -1;\s*\}', '', html)

# Re-add bg-slate-50 to body class
html = html.replace('body class=" text-slate-800', 'body class="bg-slate-50 text-slate-800')
html = html.replace('body class="text-slate-800', 'body class="bg-slate-50 text-slate-800')

with open('D:/APLIKASI ABSENSI POJOK STATISTIK/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('Reverted!')
