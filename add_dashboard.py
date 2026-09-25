import os

index_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/index.html'
with open(index_path, 'r', encoding='utf-8') as f:
    html = f.read()

dashboard_tab = '''
            <button onclick="switchTab('dashboard')" id="tab-dashboard" class="w-full flex items-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-xl transition-all shadow-md">
                <i class="fa-solid fa-chart-pie w-5"></i> Dashboard Analytics
            </button>
'''

# We need to change the old tab-absensi back to inactive by default, and make dashboard active
html = html.replace('''<button onclick="switchTab('absensi')" id="tab-absensi" class="w-full flex items-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-xl transition-all shadow-md">''', 
'''<button onclick="switchTab('absensi')" id="tab-absensi" class="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-xl transition-all">''')

html = html.replace('''<nav class="flex-1 px-4 py-4 space-y-1 overflow-y-auto">''', 
'''<nav class="flex-1 px-4 py-4 space-y-1 overflow-y-auto">\n''' + dashboard_tab)

dashboard_section = '''
            <!-- SECTION: DASHBOARD -->
            <section id="sec-dashboard" class="max-w-6xl mx-auto space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <!-- Total Agen -->
                    <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
                        <div class="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-2xl">
                            <i class="fa-solid fa-users"></i>
                        </div>
                        <div>
                            <p class="text-sm font-bold text-slate-500 uppercase">Total Agen Aktif</p>
                            <h4 class="text-3xl font-black text-slate-800" id="dash-total-agen">0</h4>
                        </div>
                    </div>
                    
                    <!-- Kas Denda (Belum Lunas) -->
                    <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
                        <div class="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center text-2xl">
                            <i class="fa-solid fa-sack-dollar"></i>
                        </div>
                        <div>
                            <p class="text-sm font-bold text-slate-500 uppercase">Denda Belum Bayar</p>
                            <h4 class="text-3xl font-black text-slate-800" id="dash-denda-tunggakan">Rp 0</h4>
                        </div>
                    </div>

                    <!-- Kas Denda (Lunas) -->
                    <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
                        <div class="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center text-2xl">
                            <i class="fa-solid fa-vault"></i>
                        </div>
                        <div>
                            <p class="text-sm font-bold text-slate-500 uppercase">Kas Denda Terkumpul</p>
                            <h4 class="text-3xl font-black text-slate-800" id="dash-denda-lunas">Rp 0</h4>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Leaderboard Terajin -->
                    <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <h3 class="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                            <i class="fa-solid fa-trophy text-amber-500"></i> Top 5 Agen Terajin (Termasuk Ekstra)
                        </h3>
                        <div class="space-y-3" id="dash-leaderboard-rajin">
                            <p class="text-slate-500 text-sm text-center py-4">Memuat data...</p>
                        </div>
                    </div>

                    <!-- Hall of Shame (Sering Bolos/Telat) -->
                    <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <h3 class="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                            <i class="fa-solid fa-triangle-exclamation text-red-500"></i> Sering Telat / Bolos
                        </h3>
                        <div class="space-y-3" id="dash-leaderboard-malas">
                            <p class="text-slate-500 text-sm text-center py-4">Memuat data...</p>
                        </div>
                    </div>
                </div>
            </section>
'''

html = html.replace('<!-- SECTION: ABSENSI HARIAN -->', dashboard_section + '\n            <!-- SECTION: ABSENSI HARIAN -->')
# Make Absensi section hidden by default
html = html.replace('<section id="sec-absensi" class="max-w-5xl mx-auto space-y-6">', '<section id="sec-absensi" class="max-w-5xl mx-auto space-y-6 hidden">')

with open(index_path, 'w', encoding='utf-8') as f:
    f.write(html)
print('Dashboard UI added to index.html')
