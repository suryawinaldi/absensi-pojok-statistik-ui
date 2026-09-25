import os

html_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/index.html'
js_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/js/app.js'

# ==========================================
# 1. UPDATE HTML
# ==========================================
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Add Settings Tab
tab_agen = '''<button onclick="switchTab('agen')" id="tab-agen" class="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-xl transition-all">
                <i class="fa-solid fa-users w-5"></i> Daftar Agen
            </button>'''
tab_settings = '''<button onclick="switchTab('pengaturan')" id="tab-pengaturan" class="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-xl transition-all">
                <i class="fa-solid fa-gear w-5"></i> Pengaturan
            </button>'''
html = html.replace(tab_agen, tab_agen + '\n' + tab_settings)

# Update Absensi Header (Date Picker & Export)
old_abs_header = '''<div class="glass-panel p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-center mb-6 border border-slate-100">
                    <div>
                        <h2 class="text-3xl font-black text-slate-800" id="today-date-display">Jumat, 25/9/2026</h2>
                        <p class="text-slate-500 mt-1">Sistem membaca jadwal secara otomatis dari Master Jadwal.</p>
                    </div>
                    <div class="flex gap-3 mt-4 md:mt-0">
                        <button onclick="bukaModalEkstra()" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-2">
                            <i class="fa-solid fa-user-plus"></i> Agen Ekstra
                        </button>
                        <button onclick="loadAbsensiToday()" class="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-2">
                            <i class="fa-solid fa-rotate-right"></i> Refresh
                        </button>
                    </div>
                </div>'''

new_abs_header = '''<div class="glass-panel p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-center mb-6 border border-slate-100">
                    <div>
                        <div class="flex items-center gap-3">
                            <h2 class="text-3xl font-black text-slate-800" id="today-date-display">Jumat, 25/9/2026</h2>
                            <input type="date" id="date-picker" onchange="changeDate()" class="border border-slate-300 rounded px-2 py-1 text-sm text-slate-600 focus:outline-blue-500">
                        </div>
                        <p class="text-slate-500 mt-1">Sistem membaca jadwal secara otomatis dari Master Jadwal.</p>
                    </div>
                    <div class="flex gap-3 mt-4 md:mt-0">
                        <button onclick="exportToCSV('absensi')" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-2">
                            <i class="fa-solid fa-download"></i> Export CSV
                        </button>
                        <button onclick="bukaModalEkstra()" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-2">
                            <i class="fa-solid fa-user-plus"></i> Agen Ekstra
                        </button>
                        <button onclick="loadAbsensiToday()" class="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-2">
                            <i class="fa-solid fa-rotate-right"></i> Refresh
                        </button>
                    </div>
                </div>'''
html = html.replace(old_abs_header, new_abs_header)

# Update Denda Header (Export)
old_denda_header = '''<h3 class="text-2xl font-bold text-slate-800">Kasir Denda Agen</h3>
                        <p class="text-slate-500 mt-1">Kelola pembayaran denda keterlambatan dan ketidakhadiran.</p>'''
new_denda_header = '''<h3 class="text-2xl font-bold text-slate-800">Kasir Denda Agen</h3>
                        <p class="text-slate-500 mt-1">Kelola pembayaran denda keterlambatan dan ketidakhadiran.</p>
                    </div>
                    <div>
                        <button onclick="exportToCSV('denda')" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-2">
                            <i class="fa-solid fa-download"></i> Export CSV
                        </button>'''
html = html.replace(old_denda_header, new_denda_header)

# Add Settings Section
settings_sec = '''
            <!-- SECTION: PENGATURAN -->
            <section id="sec-pengaturan" class="max-w-4xl mx-auto hidden space-y-6">
                <div class="glass-panel p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 class="text-2xl font-bold text-slate-800 mb-2">Pengaturan Sistem</h3>
                    <p class="text-slate-500 mb-6">Ubah jam operasional dan nominal denda. (Otomatis tersimpan ke database)</p>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    </div>
                    
                    <div class="mt-8 flex justify-end">
                        <button onclick="simpanPengaturan()" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all">
                            <i class="fa-solid fa-save mr-2"></i> Simpan Pengaturan
                        </button>
                    </div>
                </div>
            </section>
'''
html = html.replace('<!-- SECTION: REKAP DENDA -->', settings_sec + '\n            <!-- SECTION: REKAP DENDA -->')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)


# ==========================================
# 2. UPDATE JS
# ==========================================
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Update tabs
js = js.replace("['dashboard', 'absensi', 'jadwal', 'denda', 'agen']", "['dashboard', 'absensi', 'jadwal', 'denda', 'agen', 'pengaturan']")
js = js.replace("if(tabId === 'agen') loadAgen();", "if(tabId === 'agen') loadAgen();\n    if(tabId === 'pengaturan') loadSettingsUI();")
js = js.replace("'agen': 'Daftar Agen Pojok Statistik' }", "'agen': 'Daftar Agen Pojok Statistik', 'pengaturan': 'Pengaturan Sistem' }")

# Update Date logic in loadAbsensiToday
js = js.replace('async function loadAbsensiToday() {', 'let currentSelectedDate = null;\n\nfunction changeDate() {\n    currentSelectedDate = document.getElementById("date-picker").value;\n    loadAbsensiToday();\n}\n\nasync function loadAbsensiToday() {')
js = js.replace('const now = new Date();\n        const namaHari = HARI_MAP[now.getDay()];', 'const now = currentSelectedDate ? new Date(currentSelectedDate) : new Date();\n        const namaHari = HARI_MAP[now.getDay()];')

# Add "Izin" button and styling
old_btn_html = '''<button onclick="markAbsen('${jadwal.nama_agen}', '${jadwal.sesi}', 'Tidak Hadir', ${jadwal.is_pj})" class="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded shadow-sm transition-all text-xs font-semibold">
                            Bolos
                        </button>'''
new_btn_html = '''<button onclick="markAbsen('${jadwal.nama_agen}', '${jadwal.sesi}', 'Tidak Hadir', ${jadwal.is_pj})" class="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded shadow-sm transition-all text-xs font-semibold">
                            Bolos
                        </button>
                        <button onclick="markAbsen('${jadwal.nama_agen}', '${jadwal.sesi}', 'Izin', ${jadwal.is_pj})" class="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded shadow-sm transition-all text-xs font-semibold">
                            Izin
                        </button>'''
js = js.replace(old_btn_html, new_btn_html)

old_status_html = '''} else if(absRec.kehadiran === 'Tidak Hadir') {
                        statusHtml = `<span class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">Tidak Hadir</span>`;
                        btnHtml = `<button onclick="batalkanAbsen(${absRec.id}, '${jadwal.nama_agen}', '${absRec.tanggal}')" class="px-4 py-1.5 bg-slate-200 hover:bg-red-100 hover:text-red-600 text-slate-500 rounded text-xs font-semibold border border-slate-300 transition-colors">Batalkan Absen</button>`;
                    }'''
new_status_html = '''} else if(absRec.kehadiran === 'Tidak Hadir') {
                        statusHtml = `<span class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">Tidak Hadir (Bolos)</span>`;
                        btnHtml = `<button onclick="batalkanAbsen(${absRec.id}, '${jadwal.nama_agen}', '${absRec.tanggal}')" class="px-4 py-1.5 bg-slate-200 hover:bg-red-100 hover:text-red-600 text-slate-500 rounded text-xs font-semibold border border-slate-300 transition-colors">Batalkan Absen</button>`;
                    } else if(absRec.kehadiran === 'Izin') {
                        statusHtml = `<span class="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-semibold">Izin / Sakit</span>`;
                        btnHtml = `<button onclick="batalkanAbsen(${absRec.id}, '${jadwal.nama_agen}', '${absRec.tanggal}')" class="px-4 py-1.5 bg-slate-200 hover:bg-red-100 hover:text-red-600 text-slate-500 rounded text-xs font-semibold border border-slate-300 transition-colors">Batalkan Absen</button>`;
                    }'''
js = js.replace(old_status_html, new_status_html)

# Add Export & Settings Logic
extra_logic = '''
// ==========================================
// 9. PENGATURAN LOGIC
// ==========================================
function loadSettingsUI() {
    document.getElementById('set-jam-pagi').value = APP_SETTINGS.jam_mulai_pagi;
    document.getElementById('set-jam-siang').value = APP_SETTINGS.jam_mulai_siang;
    document.getElementById('set-toleransi').value = APP_SETTINGS.toleransi_telat_menit;
    document.getElementById('set-denda-telat').value = APP_SETTINGS.nominal_denda_telat;
    document.getElementById('set-denda-bolos').value = APP_SETTINGS.nominal_denda_bolos;
}

async function simpanPengaturan() {
    showLoader();
    const newData = {
        jam_mulai_pagi: document.getElementById('set-jam-pagi').value + (document.getElementById('set-jam-pagi').value.length === 5 ? ':00' : ''),
        jam_mulai_siang: document.getElementById('set-jam-siang').value + (document.getElementById('set-jam-siang').value.length === 5 ? ':00' : ''),
        toleransi_telat_menit: parseInt(document.getElementById('set-toleransi').value),
        nominal_denda_telat: parseInt(document.getElementById('set-denda-telat').value),
        nominal_denda_bolos: parseInt(document.getElementById('set-denda-bolos').value)
    };
    
    try {
        await supabaseClient.from('pengaturan_sistem').update(newData).eq('id', 1);
        APP_SETTINGS = newData;
        Swal.fire({ icon: 'success', title: 'Tersimpan!', text: 'Pengaturan berhasil diperbarui.', timer: 2000, showConfirmButton: false });
    } catch(e) {
        alert('Gagal menyimpan pengaturan.');
    } finally {
        hideLoader();
    }
}

// ==========================================
// 10. EXPORT CSV LOGIC
// ==========================================
async function exportToCSV(table) {
    showLoader();
    try {
        const { data } = await supabaseClient.from(table).select('*');
        if(!data || data.length === 0) {
            Swal.fire('Data Kosong', `Tidak ada data di tabel ${table} untuk di-export.`, 'info');
            return;
        }

        const headers = Object.keys(data[0]);
        const csvRows = [];
        
        // Add Headers
        csvRows.push(headers.join(','));
        
        // Add Data
        for(const row of data) {
            const values = headers.map(header => {
                const val = row[header] !== null ? row[header].toString() : '';
                return `"${val.replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(','));
        }
        
        const csvString = csvRows.join('\\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `Export_${table}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
    } catch(e) {
        console.error(e);
        alert('Gagal mengekspor data.');
    } finally {
        hideLoader();
    }
}
'''
js = js + '\n' + extra_logic

# In loadAbsensiToday, update markAbsen to pass the chosen date
old_mark = '''const now = new Date();
    const tglStr = now.toISOString().split('T')[0];'''
new_mark = '''const now = new Date();
    const tglStr = currentSelectedDate ? currentSelectedDate : now.toISOString().split('T')[0];'''
js = js.replace(old_mark, new_mark)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
print("Finished adding all 4 requested features")
