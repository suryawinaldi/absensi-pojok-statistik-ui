import os
import re

js_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/js/app.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

pattern = r'async function simpanPengaturan\(\) \{[\s\S]*?finally \{\s*hideLoader\(\);\s*\}\s*\}'

new_simpan = '''async function simpanPengaturan() {
    showLoader();
    
    let newJadwal = {};
    try {
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

if re.search(pattern, js):
    js = re.sub(pattern, new_simpan, js)
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write(js)
    print("Fixed simpanPengaturan crash")
else:
    print("Pattern not found!")
