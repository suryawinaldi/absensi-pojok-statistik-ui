import os

html_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Let's cleanly rebuild the dashboard section closing
old_chunk = """                    <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <h3 class="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                            <i class="fa-solid fa-trophy text-amber-500"></i> Top 5 Agen Terajin (Termasuk Ekstra)
                        </h3>
                        <div class="space-y-3" id="dash-leaderboard-rajin">
                            <p class="text-slate-500 text-sm text-center py-4">Memuat data...</p>
                        </div>
                    </div>

                    </div>

            
            
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
                </div>"""

new_chunk = """                    <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <h3 class="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                            <i class="fa-solid fa-trophy text-amber-500"></i> Top 5 Agen Terajin (Termasuk Ekstra)
                        </h3>
                        <div class="space-y-3" id="dash-leaderboard-rajin">
                            <p class="text-slate-500 text-sm text-center py-4">Memuat data...</p>
                        </div>
                    </div>
                </div> <!-- End of max-w-3xl -->

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
            </section> <!-- End of sec-dashboard -->"""

html = html.replace(old_chunk, new_chunk)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)
print("Fixed section closing tags")
