import os

html_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/index.html'
js_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/js/app.js'

# ==========================================
# 1. UPDATE HTML FOR SETTINGS (5 DAYS)
# ==========================================
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Replace the entire Settings section inside index.html
old_settings_section_start = html.find('<!-- SECTION: PENGATURAN -->')
old_settings_section_end = html.find('<!-- SECTION: REKAP DENDA -->')

new_settings_html = '''<!-- SECTION: PENGATURAN -->
            <section id="sec-pengaturan" class="max-w-5xl mx-auto hidden space-y-6">
                <div class="glass-panel p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 class="text-2xl font-bold text-slate-800 mb-2">Pengaturan Sistem & Jadwal Dinamis</h3>
                    <p class="text-slate-500 mb-6">Atur jam operasional spesifik untuk setiap hari. Matikan (Uncheck) jika sesi ditiadakan.</p>
                    
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <!-- Kolom Jadwal Hari -->
                        <div class="lg:col-span-2 space-y-4" id="settings-days-container">
                            <!-- Injected by JS -->
                        </div>

                        <!-- Kolom Aturan Denda -->
                        <div class="space-y-4">
                            <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <label class="block text-sm font-bold text-slate-700 mb-3 uppercase flex items-center gap-2">
                                    <i class="fa-solid fa-scale-balanced text-slate-500"></i> Aturan Denda & Telat
                                </label>
                                <div class="space-y-4">
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-600 mb-1">Toleransi Telat (Menit)</label>
                                        <input type="number" id="set-toleransi" class="w-full p-2 border border-slate-300 rounded focus:ring-blue-500 bg-white">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-600 mb-1">Nominal Denda Telat (Rp)</label>
                                        <input type="number" id="set-denda-telat" class="w-full p-2 border border-slate-300 rounded focus:ring-blue-500 bg-white">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-slate-600 mb-1">Nominal Denda Bolos (Rp)</label>
                                        <input type="number" id="set-denda-bolos" class="w-full p-2 border border-slate-300 rounded focus:ring-blue-500 bg-white">
                                    </div>
                                </div>
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

if old_settings_section_start != -1 and old_settings_section_end != -1:
    html = html[:old_settings_section_start] + new_settings_html + html[old_settings_section_end:]
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html)
        print("Updated HTML for flexible settings.")


# ==========================================
# 2. UPDATE APP.JS FOR ANTI-CHEAT & SETTINGS
# ==========================================
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Anti-cheat logic
anti_cheat_func = '''
// ==========================================
// ANTI-CHEAT WAKTU SERVER
// ==========================================
async function getWaktuServer() {
    try {
        const res = await fetch('http://worldtimeapi.org/api/timezone/Asia/Jakarta');
        const data = await res.json();
        return new Date(data.datetime);
    } catch(e) {
        console.warn('Gagal fetch worldtimeapi, menggunakan jam lokal sebagai fallback');
        return new Date(); // Fallback ke lokal jika API down
    }
}
'''
if 'getWaktuServer' not in js:
    js = anti_cheat_func + '\n' + js


# Update markAbsen to use getWaktuServer and Dynamic Jadwal
import re
mark_absen_pattern = r'(async function markAbsen.*?loadAbsensiToday\(\);\s*})'
match_mark = re.search(mark_absen_pattern, js, re.DOTALL)
if match_mark:
    old_mark_absen = match_mark.group(1)
    
    new_mark_absen = '''async function markAbsen(nama, sesi, status, isPj) {
    showLoader();
    const now = await getWaktuServer();
    const tglStr = currentSelectedDate ? currentSelectedDate : now.toISOString().split('T')[0];
    const waktuStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

    // Insert ke Absensi
    await supabaseClient.from('absensi').insert({
        tanggal: tglStr,
        nama_agen: nama,
        sesi: sesi,
        kehadiran: status,
        waktu_hadir: status === 'Hadir' ? waktuStr : '-',
        is_pj: isPj
    });

    // Hitung Denda Otomatis (Anti-Cheat & Dynamic Schedule)
    if(!isPj && status !== 'Izin') { 
        let kenaDenda = false;
        let nominal = 0;
        
        if(status === 'Tidak Hadir') {
            kenaDenda = true;
            nominal = APP_SETTINGS.nominal_denda_bolos;
        } else if (status === 'Hadir') {
            const jam = now.getHours();
            const menit = now.getMinutes();
            const totalMenit = jam * 60 + menit;
            
            const parseTime = (timeStr) => {
                const parts = timeStr.split(':');
                return parseInt(parts[0]) * 60 + parseInt(parts[1]);
            };
            
            const namaHari = HARI_MAP[new Date(tglStr).getDay()];
            
            // Dapatkan aturan hari ini dari JSON jadwal_harian
            if(APP_SETTINGS.jadwal_harian && APP_SETTINGS.jadwal_harian[namaHari]) {
                const aturanHariIni = APP_SETTINGS.jadwal_harian[namaHari][sesi];
                if(aturanHariIni && aturanHariIni.aktif) {
                    const batasTelat = parseTime(aturanHariIni.mulai) + APP_SETTINGS.toleransi_telat_menit;
                    if(totalMenit > batasTelat) {
                        kenaDenda = true;
                        nominal = APP_SETTINGS.nominal_denda_telat;
                    }
                }
            }
        }

        if(kenaDenda) {
            await supabaseClient.from('denda').insert({
                tanggal: tglStr,
                nama_agen: nama,
                nominal_denda: nominal,
                status_lunas: false
            });
            Swal.fire({ icon: 'warning', title: 'Kena Denda!', text: `Terdata denda Rp ${nominal.toLocaleString('id-ID')}`});
        }
    }

    loadAbsensiToday();
}'''
    js = js.replace(old_mark_absen, new_mark_absen)


# Update Pengaturan Logic
settings_pattern = r'(// 9\. PENGATURAN LOGIC.*?)(?=\n// ==========================================\n// 10\. EXPORT CSV LOGIC)'
match_settings = re.search(settings_pattern, js, re.DOTALL)
if match_settings:
    old_settings = match_settings.group(1)
    
    new_settings = '''// 9. PENGATURAN LOGIC
// ==========================================
function loadSettingsUI() {
    // Basic Settings
    document.getElementById('set-toleransi').value = APP_SETTINGS.toleransi_telat_menit;
    document.getElementById('set-denda-telat').value = APP_SETTINGS.nominal_denda_telat;
    document.getElementById('set-denda-bolos').value = APP_SETTINGS.nominal_denda_bolos;
    
    // Dynamic Schedule
    let html = '';
    const harian = APP_SETTINGS.jadwal_harian || {};
    
    HARI_LIST.forEach(hari => {
        const p = harian[hari]?.Pagi || { aktif: true, mulai: '10:00' };
        const s = harian[hari]?.Siang || { aktif: true, mulai: '13:30' };
        
        html += `
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
            <div class="w-24 font-bold text-slate-700 text-lg">${hari}</div>
            
            <div class="flex-1 bg-blue-50/50 p-2 rounded border border-blue-100 flex items-center gap-2">
                <input type="checkbox" id="cb-pagi-${hari}" ${p.aktif ? 'checked' : ''} class="w-4 h-4">
                <label class="text-sm font-semibold text-blue-700 w-12">PAGI</label>
                <input type="time" id="jam-pagi-${hari}" value="${p.mulai.substring(0,5)}" class="p-1 text-sm border rounded w-full">
            </div>
            
            <div class="flex-1 bg-orange-50/50 p-2 rounded border border-orange-100 flex items-center gap-2">
                <input type="checkbox" id="cb-siang-${hari}" ${s.aktif ? 'checked' : ''} class="w-4 h-4">
                <label class="text-sm font-semibold text-orange-700 w-12">SIANG</label>
                <input type="time" id="jam-siang-${hari}" value="${s.mulai.substring(0,5)}" class="p-1 text-sm border rounded w-full">
            </div>
        </div>
        `;
    });
    
    document.getElementById('settings-days-container').innerHTML = html;
}

async function simpanPengaturan() {
    showLoader();
    
    let newJadwal = {};
    HARI_LIST.forEach(hari => {
        newJadwal[hari] = {
            Pagi: {
                aktif: document.getElementById(`cb-pagi-${hari}`).checked,
                mulai: document.getElementById(`jam-pagi-${hari}`).value + (document.getElementById(`jam-pagi-${hari}`).value.length === 5 ? ':00' : '')
            },
            Siang: {
                aktif: document.getElementById(`cb-siang-${hari}`).checked,
                mulai: document.getElementById(`jam-siang-${hari}`).value + (document.getElementById(`jam-siang-${hari}`).value.length === 5 ? ':00' : '')
            }
        };
    });

    const newData = {
        toleransi_telat_menit: parseInt(document.getElementById('set-toleransi').value),
        nominal_denda_telat: parseInt(document.getElementById('set-denda-telat').value),
        nominal_denda_bolos: parseInt(document.getElementById('set-denda-bolos').value),
        jadwal_harian: newJadwal
    };
    
    try {
        await supabaseClient.from('pengaturan_sistem').update(newData).eq('id', 1);
        APP_SETTINGS = newData;
        Swal.fire({ icon: 'success', title: 'Tersimpan!', text: 'Pengaturan jadwal dinamis berhasil diperbarui.', timer: 2000, showConfirmButton: false });
    } catch(e) {
        alert('Gagal menyimpan pengaturan.');
    } finally {
        hideLoader();
    }
}
'''
    js = js.replace(old_settings, new_settings)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
print("Updated app.js for phase 6")
