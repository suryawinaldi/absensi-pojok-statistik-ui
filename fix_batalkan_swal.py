import os
import re

js_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/js/app.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

pattern = r'async function batalkanAbsen\(idAbsensi,\s*nama_agen,\s*tanggal\)\s*\{[\s\S]*?loadAbsensiToday\(\);\s*\}\s*\}'

new_batalkan = '''async function batalkanAbsen(idAbsensi, nama_agen, tanggal) {
    const result = await Swal.fire({
        title: 'Batalkan Absen?',
        text: `Yakin ingin membatalkan absen untuk ${nama_agen}? Denda (jika ada) juga akan otomatis dihapus.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: 'Ya, Batalkan'
    });
    
    if(result.isConfirmed) {
        showLoader();
        try {
            await supabaseClient.from('denda').delete().eq('nama_agen', nama_agen).eq('tanggal', tanggal);
            await supabaseClient.from('absensi').delete().eq('id', idAbsensi);
            
            loadAbsensiToday();
        } catch(e) {
            console.error(e);
            Swal.fire('Error', 'Gagal membatalkan absen.', 'error');
        } finally {
            hideLoader();
        }
    }
}'''

js = re.sub(pattern, new_batalkan, js)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
print("Regex replaced batalkanAbsen")
