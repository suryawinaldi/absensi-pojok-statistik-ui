import os

js_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/js/app.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Remove alert from hapusJadwal
js = js.replace('alert("Tombol tertekan! ID: " + id);', '')

# 2. Fix the missing single quote in batalkanAbsen onclick
js = js.replace("batalkanAbsen('${absRec.id},", "batalkanAbsen('${absRec.id}',")

# 3. Change batalkanAbsen to use SweetAlert instead of native confirm
old_batalkan = '''async function batalkanAbsen(idAbsensi, nama_agen, tanggal) {
    if(confirm(`Yakin ingin membatalkan absen untuk ${nama_agen}? Denda (jika ada) juga akan dihapus.`)) {
        showLoader();
        // Hapus denda terkait (jika ada)
        await supabaseClient.from('denda').delete().eq('tanggal', tanggal).eq('nama_agen', nama_agen);
        // Hapus absen
        await supabaseClient.from('absensi').delete().eq('id', idAbsensi);
        
        loadAbsensiToday();
    }
}'''

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
            // Hapus denda terkait (jika ada)
            await supabaseClient.from('denda').delete().eq('tanggal', tanggal).eq('nama_agen', nama_agen);
            // Hapus absen
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

js = js.replace(old_batalkan, new_batalkan)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
print("Fixed batalkanAbsen quote and migrated to SweetAlert")
