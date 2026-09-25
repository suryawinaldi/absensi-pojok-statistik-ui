import re

# 1. Update index.html
index_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/index.html'
with open(index_path, 'r', encoding='utf-8') as f:
    html = f.read()

tab_btn = '''
            <button onclick="switchTab('agen')" id="tab-agen" class="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-xl transition-all">
                <i class="fa-solid fa-users w-5"></i> Daftar Agen
            </button>
'''
html = html.replace('<!-- SECTION: DAFTAR AGEN (Optional) -->', '') # cleanup if any
html = html.replace('</nav>', tab_btn + '\n        </nav>')

agen_sec = '''
            <!-- SECTION: DAFTAR AGEN -->
            <section id="sec-agen" class="max-w-4xl mx-auto hidden space-y-6">
                <div class="glass-panel p-6 rounded-2xl shadow-sm flex justify-between items-center">
                    <div>
                        <h3 class="text-2xl font-bold text-slate-800">Daftar Agen Pojok Statistik</h3>
                        <p class="text-slate-500 mt-1">Total agen aktif yang terdaftar di sistem.</p>
                    </div>
                </div>
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-sm whitespace-nowrap">
                            <thead class="bg-slate-50 text-slate-600 border-b border-slate-200">
                                <tr>
                                    <th class="py-4 px-6 font-semibold">Nama Agen</th>
                                    <th class="py-4 px-6 font-semibold text-center">Divisi</th>
                                    <th class="py-4 px-6 font-semibold text-center">Status BPH</th>
                                </tr>
                            </thead>
                            <tbody id="agen-table-body" class="divide-y divide-slate-100">
                                <!-- Loaded via JS -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
'''
html = html.replace('<!-- SECTION: REKAP DENDA -->', agen_sec + '\n\n            <!-- SECTION: REKAP DENDA -->')

with open(index_path, 'w', encoding='utf-8') as f:
    f.write(html)


# 2. Update app.js
js_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/js/app.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

js = js.replace("['dashboard', 'absensi', 'jadwal', 'denda']", "['dashboard', 'absensi', 'jadwal', 'denda', 'agen']")
js = js.replace("if(tabId === 'denda') loadDenda();", "if(tabId === 'denda') loadDenda();\n    if(tabId === 'agen') loadAgen();")
js = js.replace("'denda': 'Rekap Denda Kasir' }", "'denda': 'Rekap Denda Kasir', 'agen': 'Daftar Agen Pojok Statistik' }")

agen_func = """
// ==========================================
// 7. DAFTAR AGEN LOGIC
// ==========================================
async function loadAgen() {
    showLoader();
    try {
        const { data } = await supabase.from('agen').select('*').order('divisi').order('nama');
        let html = '';
        if(data) {
            data.forEach(a => {
                let badge = a.is_bph ? '<span class="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold"><i class="fa-solid fa-crown mr-1"></i>BPH</span>' : '<span class="bg-slate-100 text-slate-500 px-2 py-1 rounded text-xs font-semibold">Anggota</span>';
                html += `
                <tr class="hover:bg-slate-50 border-b border-slate-100 transition-colors">
                    <td class="px-6 py-4 font-medium text-slate-700">${a.nama}</td>
                    <td class="px-6 py-4 text-center"><span class="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs border border-indigo-100 font-semibold">${a.divisi}</span></td>
                    <td class="px-6 py-4 text-center">${badge}</td>
                </tr>
                `;
            });
        }
        document.getElementById('agen-table-body').innerHTML = html;
    } catch(e) { console.error(e); } finally { hideLoader(); }
}
"""
js = js + '\n' + agen_func

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
print('Daftar Agen menu added successfully')
