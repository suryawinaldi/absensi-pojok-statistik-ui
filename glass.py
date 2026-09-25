import re
with open('D:/APLIKASI ABSENSI POJOK STATISTIK/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Body Gradient & Blobs
css = '''body { 
    background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);
    position: relative;
}
body::before {
    content: ""; position: absolute; top: -10%; left: -10%; width: 500px; height: 500px; background: rgba(59, 130, 246, 0.25); border-radius: 50%; filter: blur(100px); z-index: -1;
}
body::after {
    content: ""; position: absolute; bottom: -10%; right: -10%; width: 600px; height: 600px; background: rgba(236, 72, 153, 0.15); border-radius: 50%; filter: blur(100px); z-index: -1;
}'''

if 'body {' in html:
    html = re.sub(r'body\s*\{.*?\}', css, html, flags=re.DOTALL)
else:
    html = html.replace('</style>', css + '\n</style>')

# Body class
html = html.replace('body class="bg-slate-50', 'body class="')

# Sidebar
html = html.replace('bg-slate-900 text-slate-300', 'bg-slate-900/70 backdrop-blur-2xl text-slate-200 border-r border-white/10')
html = html.replace('border-slate-800', 'border-white/10')
html = html.replace('bg-slate-800', 'bg-white/10')
html = html.replace('bg-slate-700', 'bg-white/20 border-white/10')

# Header
html = html.replace('header class="bg-white border-b border-slate-200', 'header class="bg-white/40 backdrop-blur-lg border-b border-white/40')

# Cards & Tables
html = html.replace('bg-white rounded-2xl shadow-sm border border-slate-200', 'bg-white/50 backdrop-blur-xl rounded-3xl shadow-xl border border-white/60')
html = html.replace('bg-white p-3 rounded-lg border', 'bg-white/60 backdrop-blur-md p-3 rounded-xl border border-white/50')
html = html.replace('class="bg-white rounded-2xl', 'class="bg-white/50 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl')
html = html.replace('bg-white', 'bg-white/70')

# Kanban
html = html.replace('w-80 bg-white/70 rounded-2xl', 'w-80 bg-white/40 backdrop-blur-xl rounded-3xl border border-white/50 shadow-lg')
html = html.replace('w-64 bg-white/70 rounded-2xl', 'w-64 bg-white/40 backdrop-blur-xl rounded-3xl border border-white/50 shadow-lg')
html = html.replace('bg-slate-50 text-center rounded-t-2xl', 'bg-white/30 text-center rounded-t-3xl border-b border-white/40')
html = html.replace('bg-slate-50 rounded-t-2xl', 'bg-white/30 rounded-t-3xl border-b border-white/40')

with open('D:/APLIKASI ABSENSI POJOK STATISTIK/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('Glassmorphism Applied!')
