import os

html_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Add Chart.js
if 'chart.js' not in html:
    html = html.replace('<!-- Supabase JS -->', '<!-- Chart.js -->\n    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n    <!-- Supabase JS -->')

# 2. Add Charts to Dashboard
chart_html = '''
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <h3 class="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                            <i class="fa-solid fa-chart-bar text-blue-500"></i> Top 10 Total Sesi Jaga
                        </h3>
                        <canvas id="chartSesi" height="250"></canvas>
                    </div>
                    <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <h3 class="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                            <i class="fa-solid fa-clock text-green-500"></i> Top 10 Durasi Jaga (Jam)
                        </h3>
                        <canvas id="chartDurasi" height="250"></canvas>
                    </div>
                </div>
'''
if 'id="chartSesi"' not in html:
    html = html.replace('<!-- SECTION: MASTER JADWAL (SEARCH & TAG) -->', chart_html + '\n            <!-- SECTION: MASTER JADWAL (SEARCH & TAG) -->')

# 3. Update Settings to support Friday
old_settings = '''<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-bold text-slate-700 mb-1">Jam Mulai Sesi Pagi</label>
                                <input type="time" id="set-jam-pagi" class="w-full p-2 border border-slate-300 rounded-lg bg-slate-50">
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-slate-700 mb-1">Jam Mulai Sesi Siang</label>
                                <input type="time" id="set-jam-siang" class="w-full p-2 border border-slate-300 rounded-lg bg-slate-50">
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-slate-700 mb-1">Toleransi Telat (Menit)</label>
                                <input type="number" id="set-toleransi" class="w-full p-2 border border-slate-300 rounded-lg bg-slate-50">
                            </div>
                        </div>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-bold text-slate-700 mb-1">Nominal Denda Telat (Rp)</label>
                                <input type="number" id="set-denda-telat" class="w-full p-2 border border-slate-300 rounded-lg bg-slate-50">
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-slate-700 mb-1">Nominal Denda Bolos (Rp)</label>
                                <input type="number" id="set-denda-bolos" class="w-full p-2 border border-slate-300 rounded-lg bg-slate-50">
                            </div>
                        </div>
                    </div>'''

new_settings = '''<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="space-y-4">
                            <div class="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                                <label class="block text-xs font-bold text-blue-700 mb-2 uppercase">Jadwal Reguler (Senin-Kamis)</label>
                                <div class="grid grid-cols-2 gap-3">
                                    <div>
                                        <label class="block text-[10px] text-slate-500 mb-1">Mulai Pagi</label>
                                        <input type="time" id="set-jam-pagi" class="w-full p-1.5 border border-slate-300 rounded text-sm bg-white">
                                    </div>
                                    <div>
                                        <label class="block text-[10px] text-slate-500 mb-1">Mulai Siang</label>
                                        <input type="time" id="set-jam-siang" class="w-full p-1.5 border border-slate-300 rounded text-sm bg-white">
                                    </div>
                                </div>
                            </div>
                            <div class="bg-green-50/50 p-3 rounded-lg border border-green-100">
                                <label class="block text-xs font-bold text-green-700 mb-2 uppercase">Jadwal Khusus (Jumat)</label>
                                <div class="grid grid-cols-2 gap-3">
                                    <div>
                                        <label class="block text-[10px] text-slate-500 mb-1">Mulai Pagi</label>
                                        <input type="time" id="set-jam-pagi-jumat" class="w-full p-1.5 border border-slate-300 rounded text-sm bg-white">
                                    </div>
                                    <div>
                                        <label class="block text-[10px] text-slate-500 mb-1">Mulai Siang (Set. Jum'at)</label>
                                        <input type="time" id="set-jam-siang-jumat" class="w-full p-1.5 border border-slate-300 rounded text-sm bg-white">
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="space-y-4">
                            <div class="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <label class="block text-xs font-bold text-slate-700 mb-2 uppercase">Aturan Denda & Telat</label>
                                <div class="space-y-3">
                                    <div>
                                        <label class="block text-[10px] text-slate-500 mb-1">Toleransi Telat (Menit)</label>
                                        <input type="number" id="set-toleransi" class="w-full p-1.5 border border-slate-300 rounded text-sm bg-white">
                                    </div>
                                    <div>
                                        <label class="block text-[10px] text-slate-500 mb-1">Nominal Denda Telat (Rp)</label>
                                        <input type="number" id="set-denda-telat" class="w-full p-1.5 border border-slate-300 rounded text-sm bg-white">
                                    </div>
                                    <div>
                                        <label class="block text-[10px] text-slate-500 mb-1">Nominal Denda Bolos (Rp)</label>
                                        <input type="number" id="set-denda-bolos" class="w-full p-1.5 border border-slate-300 rounded text-sm bg-white">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>'''

if old_settings in html:
    html = html.replace(old_settings, new_settings)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)
print("Updated index.html")
