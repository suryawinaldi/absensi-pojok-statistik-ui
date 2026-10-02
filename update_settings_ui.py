import os
import re

js_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/js/app.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Replace loadSettingsUI
pattern_load = r'function loadSettingsUI\(\) \{[\s\S]*?document\.getElementById\(\'settings-days-container\'\)\.innerHTML = html;\s*\}'
new_load = '''function loadSettingsUI() {
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
        
        // Fallback default selesai
        const pSelesai = p.selesai ? p.selesai.substring(0,5) : (hari === 'Jumat' ? '12:00' : '12:30');
        const sSelesai = s.selesai ? s.selesai.substring(0,5) : (hari === 'Jumat' ? '15:30' : '16:00');

        html += `
        <div class="bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-start xl:flex-row xl:items-center gap-4">
            <div class="w-full xl:w-24 font-black text-slate-800 text-lg border-b xl:border-b-0 pb-2 xl:pb-0">${hari}</div>
            
            <div class="w-full flex-1 bg-blue-50/50 p-2 rounded-lg border border-blue-100 flex flex-wrap items-center gap-2">
                <input type="checkbox" id="cb-pagi-${hari}" ${p.aktif ? 'checked' : ''} class="w-4 h-4 cursor-pointer">
                <label class="text-sm font-black text-blue-700 w-12">PAGI</label>
                <div class="flex items-center gap-1 flex-1">
                    <input type="time" id="mulai-pagi-${hari}" value="${p.mulai.substring(0,5)}" class="p-1 text-xs md:text-sm border border-slate-300 rounded w-full focus:ring-1 focus:ring-blue-500">
                    <span class="text-xs text-slate-400 font-bold px-1">-</span>
                    <input type="time" id="selesai-pagi-${hari}" value="${pSelesai}" class="p-1 text-xs md:text-sm border border-slate-300 rounded w-full focus:ring-1 focus:ring-blue-500">
                </div>
            </div>
            
            <div class="w-full flex-1 bg-orange-50/50 p-2 rounded-lg border border-orange-100 flex flex-wrap items-center gap-2">
                <input type="checkbox" id="cb-siang-${hari}" ${s.aktif ? 'checked' : ''} class="w-4 h-4 cursor-pointer">
                <label class="text-sm font-black text-orange-700 w-12">SIANG</label>
                <div class="flex items-center gap-1 flex-1">
                    <input type="time" id="mulai-siang-${hari}" value="${s.mulai.substring(0,5)}" class="p-1 text-xs md:text-sm border border-slate-300 rounded w-full focus:ring-1 focus:ring-orange-500">
                    <span class="text-xs text-slate-400 font-bold px-1">-</span>
                    <input type="time" id="selesai-siang-${hari}" value="${sSelesai}" class="p-1 text-xs md:text-sm border border-slate-300 rounded w-full focus:ring-1 focus:ring-orange-500">
                </div>
            </div>
        </div>
        `;
    });
    
    document.getElementById('settings-days-container').innerHTML = html;
}'''

js = re.sub(pattern_load, new_load, js)


# Replace simpanPengaturan
pattern_simpan = r'async function simpanPengaturan\(\) \{[\s\S]*?\} catch\(e\) \{\s*console\.error\(e\);\s*Swal\.fire\(\'Error\', \'Gagal menyimpan pengaturan\', \'error\'\);\s*\} finally \{\s*hideLoader\(\);\s*\}\s*\}'

new_simpan = '''async function simpanPengaturan() {
    showLoader();
    
    let newJadwal = {};
    HARI_LIST.forEach(hari => {
        const mp = document.getElementById(`mulai-pagi-${hari}`).value;
        const sp = document.getElementById(`selesai-pagi-${hari}`).value;
        const ms = document.getElementById(`mulai-siang-${hari}`).value;
        const ss = document.getElementById(`selesai-siang-${hari}`).value;
        
        newJadwal[hari] = {
            Pagi: {
                aktif: document.getElementById(`cb-pagi-${hari}`).checked,
                mulai: mp + (mp.length === 5 ? ':00' : ''),
                selesai: sp + (sp.length === 5 ? ':00' : '')
            },
            Siang: {
                aktif: document.getElementById(`cb-siang-${hari}`).checked,
                mulai: ms + (ms.length === 5 ? ':00' : ''),
                selesai: ss + (ss.length === 5 ? ':00' : '')
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
        Swal.fire({
            title: 'Berhasil!',
            text: 'Pengaturan sistem & jadwal operasional disimpan.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
        });
    } catch(e) {
        console.error(e);
        Swal.fire('Error', 'Gagal menyimpan pengaturan', 'error');
    } finally {
        hideLoader();
    }
}'''

js = re.sub(pattern_simpan, new_simpan, js)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
print("Updated Settings UI and Save function for Start and End times")
