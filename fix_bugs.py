import os
import re

html_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/index.html'
js_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/js/app.js'

# ==========================================
# 1. UPDATE HTML (Chart Height & Header Icon)
# ==========================================
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Add Icon to Absensi Header
old_absensi_header = '<h2 class="text-3xl font-black text-slate-800" id="today-date-display">'
new_absensi_header = '<i class="fa-solid fa-calendar-check text-blue-500 text-3xl"></i>\n                            <h2 class="text-3xl font-black text-slate-800" id="today-date-display">'
if '<i class="fa-solid fa-calendar-check text-blue-500 text-3xl"></i>' not in html:
    html = html.replace(old_absensi_header, new_absensi_header)

# Fix Chart Heights
old_chart_sesi = '<canvas id="chartSesi" height="250"></canvas>'
new_chart_sesi = '<div class="relative w-full h-80"><canvas id="chartSesi"></canvas></div>'
html = html.replace(old_chart_sesi, new_chart_sesi)

old_chart_durasi = '<canvas id="chartDurasi" height="250"></canvas>'
new_chart_durasi = '<div class="relative w-full h-80"><canvas id="chartDurasi"></canvas></div>'
html = html.replace(old_chart_durasi, new_chart_durasi)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)
    

# ==========================================
# 2. UPDATE APP.JS (Names & Ekstra Fines)
# ==========================================
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Fix Name Map
old_title_map = """const titleMap = {
                'Taslim': 'Ketua Agen',
                'Evans': 'Wakil Ketua',
                'Azka Tsabbita': 'Sekretaris & Bendahara',
                'Azmy': 'Koord. Media Kreatif',
                'Aslif': 'Koord. Analisis & Pelayanan'
            };"""
new_title_map = """const titleMap = {
                'Taslim': 'Ketua Agen',
                'Evans': 'Wakil Ketua',
                'Evanz': 'Wakil Ketua',
                'Azka Tsabbita': 'Sekretaris & Bendahara',
                'Azmy': 'Koord. Media Kreatif',
                'Aslif': 'Koord. Analisis & Pelayanan',
                'Alif': 'Koord. Analisis & Pelayanan'
            };"""
js = js.replace(old_title_map, new_title_map)

old_rank = "const rank = {'Taslim': 1, 'Evans': 2, 'Azka Tsabbita': 3, 'Azmy': 4, 'Aslif': 5};"
new_rank = "const rank = {'Taslim': 1, 'Evans': 2, 'Evanz': 2, 'Azka Tsabbita': 3, 'Azmy': 4, 'Aslif': 5, 'Alif': 5};"
js = js.replace(old_rank, new_rank)


# Fix markAbsen signature
js = js.replace('async function markAbsen(nama, sesi, status, isPj) {', 'async function markAbsen(nama, sesi, status, isPj, isEkstra = false) {')
js = js.replace('if(!isPj && status !== \'Izin\') {', 'if(!isPj && status !== \'Izin\' && !isEkstra) {')

# Fix simpanAgenEkstra
old_simpan = """async function simpanAgenEkstra() {
    const nama = document.getElementById('ekstra-nama').value;
    const sesi = document.getElementById('ekstra-sesi').value;
    if(!nama || !sesi) return;
    
    tutupModalEkstra();
    await markAbsen(nama, sesi, 'Hadir', false);
}"""

new_simpan = """async function simpanAgenEkstra() {
    const nama = document.getElementById('ekstra-nama').value;
    const sesi = document.getElementById('ekstra-sesi').value;
    if(!nama || !sesi) return;
    
    tutupModalEkstra();
    // Pass isEkstra = true to bypass late penalties
    await markAbsen(nama, sesi, 'Hadir', false, true);
}"""
js = js.replace(old_simpan, new_simpan)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
print("Updated UI layout and Ekstra logic")
