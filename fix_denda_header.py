import os

html_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

old_denda_header = '''<h3 class="text-2xl font-bold text-slate-800">Riwayat Denda</h3>
                        <p class="text-slate-500 mt-1">Denda terdata secara real-time dari sistem absensi.</p>
                    </div>
                </div>'''

new_denda_header = '''<h3 class="text-2xl font-bold text-slate-800">Riwayat Denda</h3>
                        <p class="text-slate-500 mt-1">Denda terdata secara real-time dari sistem absensi.</p>
                    </div>
                    <div>
                        <button onclick="exportToCSV('denda')" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-2">
                            <i class="fa-solid fa-file-excel"></i> Export CSV
                        </button>
                    </div>
                </div>'''

if old_denda_header in html:
    html = html.replace(old_denda_header, new_denda_header)
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print("Added Export CSV to Denda")
else:
    print("Could not find Denda header")
