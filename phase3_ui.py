import re

index_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/index.html'
with open(index_path, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Remove Hall of Shame from HTML
html = re.sub(r'<!-- Hall of Shame.*?</div>\s*</div>\s*</section>', '</div>\n            </section>', html, flags=re.DOTALL)
# Fix grid for Top 5
html = html.replace('<div class="grid grid-cols-1 md:grid-cols-2 gap-6">', '<div class="max-w-3xl mx-auto">')

# 2. Add "Agen Ekstra" Button to Absensi Harian
agen_ekstra_btn = '''
                    <button onclick="bukaModalEkstra()" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-2">
                        <i class="fa-solid fa-user-plus"></i> Agen Ekstra
                    </button>
                    <button onclick="loadAbsensiToday()" class="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-2">
'''
html = html.replace('<button onclick="loadAbsensiToday()" class="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-2">', agen_ekstra_btn)

# 3. Jadwal Master Revamp HTML (Replace Kanban with List & Tag)
new_jadwal_ui = '''
            <!-- SECTION: MASTER JADWAL (SEARCH & TAG) -->
            <section id="sec-jadwal" class="hidden h-full flex flex-col max-w-6xl mx-auto w-full">
                <div class="flex justify-between items-center mb-6 flex-shrink-0">
                    <div>
                        <h3 class="text-2xl font-bold text-slate-800">Atur Jadwal (Multi-Shift)</h3>
                        <p class="text-slate-500 mt-1">Tambahkan agen ke hari dan sesi yang diinginkan. Satu agen bisa jaga di banyak hari.</p>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto pb-8 space-y-6" id="jadwal-days-container">
                    <!-- Loaded via JS -->
                </div>
            </section>
'''
html = re.sub(r'<!-- SECTION: MASTER JADWAL \(KANBAN\).*?<!-- SECTION: REKAP DENDA -->', new_jadwal_ui + '\n\n            <!-- SECTION: REKAP DENDA -->', html, flags=re.DOTALL)

with open(index_path, 'w', encoding='utf-8') as f:
    f.write(html)
print('UI Updated for Phase 3 and Hall of Shame Removed')
