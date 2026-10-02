import os
import re

js_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/js/app.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

old_durasi = '''// Hitung durasi dinamis dalam Menit
                    if (a.waktu_hadir !== '-') {
                        const namaHari = HARI_MAP[new Date(a.tanggal).getDay()];
                        const isJumat = (namaHari === 'Jumat');
                        const durasiStandar = isJumat ? 120 : 150; // Jumat 2 jam, hari lain 2.5 jam
                        
                        let jamMulaiStr = '10:00';
                        if (APP_SETTINGS && APP_SETTINGS.jadwal_harian && APP_SETTINGS.jadwal_harian[namaHari] && APP_SETTINGS.jadwal_harian[namaHari][a.sesi]) {
                            jamMulaiStr = APP_SETTINGS.jadwal_harian[namaHari][a.sesi].mulai;
                        }
                        
                        const menitAbsen = parseTimeStr(a.waktu_hadir);
                        const menitMulai = parseTimeStr(jamMulaiStr);
                        const menitSelesai = menitMulai + durasiStandar;
                        
                        let durasiAsli = menitSelesai - menitAbsen;
                        if (durasiAsli < 0) durasiAsli = 0; // Kalo absen setelah shift bubar
                        
                        stats[a.nama_agen].menitTotal += durasiAsli;
                    }'''

new_durasi = '''// Hitung durasi dinamis dalam Menit
                    if (a.waktu_hadir !== '-') {
                        const namaHari = HARI_MAP[new Date(a.tanggal).getDay()];
                        const isJumat = (namaHari === 'Jumat');
                        const durasiStandar = isJumat ? 120 : 150; // Jumat 2 jam, hari lain 2.5 jam
                        
                        let jamMulaiStr = '10:00';
                        let jamSelesaiStr = null;
                        
                        if (APP_SETTINGS && APP_SETTINGS.jadwal_harian && APP_SETTINGS.jadwal_harian[namaHari] && APP_SETTINGS.jadwal_harian[namaHari][a.sesi]) {
                            jamMulaiStr = APP_SETTINGS.jadwal_harian[namaHari][a.sesi].mulai;
                            jamSelesaiStr = APP_SETTINGS.jadwal_harian[namaHari][a.sesi].selesai;
                        }
                        
                        const menitAbsen = parseTimeStr(a.waktu_hadir);
                        const menitMulai = parseTimeStr(jamMulaiStr);
                        let menitSelesai = 0;
                        
                        if (jamSelesaiStr) {
                            menitSelesai = parseTimeStr(jamSelesaiStr);
                        } else {
                            menitSelesai = menitMulai + durasiStandar;
                        }
                        
                        let durasiAsli = menitSelesai - menitAbsen;
                        if (durasiAsli < 0) durasiAsli = 0; // Kalo absen setelah shift bubar
                        
                        stats[a.nama_agen].menitTotal += durasiAsli;
                    }'''

js = js.replace(old_durasi, new_durasi)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
print("Updated dashboard duration calculation")
