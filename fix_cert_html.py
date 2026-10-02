import os
import re

html_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/index.html'

with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

pattern = r'<div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">\s*<h3 class="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">\s*<i class="fa-solid fa-trophy text-amber-500"></i> Top 5 Agen Terajin \(Termasuk Ekstra\)\s*</h3>\s*<div class="space-y-3" id="dash-leaderboard-rajin">\s*<p class="text-slate-500 text-sm text-center py-4">Memuat data...</p>\s*</div>\s*</div>'

new_leaderboard_and_cert = '''<div class="space-y-6">
                        <!-- Digital Certificate (Agent of the Month) -->
                        <div class="bg-gradient-to-br from-amber-400 to-amber-600 p-[2px] rounded-3xl shadow-lg relative overflow-hidden">
                            <div class="absolute -right-6 -top-6 text-white/20">
                                <i class="fa-solid fa-award text-9xl"></i>
                            </div>
                            <div class="bg-white/95 backdrop-blur rounded-[22px] p-5 relative">
                                <div class="flex items-center gap-4 mb-2">
                                    <div class="w-12 h-12 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white text-xl shadow-md border-2 border-white">
                                        <i class="fa-solid fa-crown"></i>
                                    </div>
                                    <div>
                                        <p class="text-xs font-bold text-amber-600 uppercase tracking-wider">🌟 Star Agent of the Month</p>
                                        <h4 class="text-xl font-black text-slate-800 leading-tight" id="cert-nama">...</h4>
                                    </div>
                                </div>
                                <p class="text-sm text-slate-600 font-medium">Telah menunjukkan dedikasi tertinggi dengan <b id="cert-sesi" class="text-amber-600">0</b> sesi jaga dan <b id="cert-durasi" class="text-amber-600">0</b> menit total.</p>
                            </div>
                        </div>

                        <!-- Leaderboard -->
                        <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                            <h3 class="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                                <i class="fa-solid fa-trophy text-amber-500"></i> Top 5 Agen Terajin (Termasuk Ekstra)
                            </h3>
                            <div class="space-y-3" id="dash-leaderboard-rajin">
                                <p class="text-slate-500 text-sm text-center py-4">Memuat data...</p>
                            </div>
                        </div>
                    </div>'''

if re.search(pattern, html):
    html = re.sub(pattern, new_leaderboard_and_cert, html)
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print("Fixed Certificate HTML")
else:
    print("Pattern still not found! Look at the exact HTML.")
