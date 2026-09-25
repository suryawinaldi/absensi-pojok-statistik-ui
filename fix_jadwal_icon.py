import os

html_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/index.html'
js_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/js/app.js'

with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Replace fa-clipboard-user with fa-clipboard-list
html = html.replace('fa-clipboard-user', 'fa-clipboard-list')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Replace hapusJadwal to use SweetAlert
old_hapus = '''async function hapusJadwal(id) {
    if(confirm('Hapus agen ini dari jadwal?')) {
        showLoader();
        await supabaseClient.from('jadwal_master').delete().eq('id', id);
        await fetchJadwalData();
        hideLoader();
    }
}'''

new_hapus = '''async function hapusJadwal(id) {
    if(!id) {
        Swal.fire('Error', 'ID Jadwal tidak ditemukan. Tabel di database mungkin tidak memiliki kolom id.', 'error');
        return;
    }
    const result = await Swal.fire({
        title: 'Hapus Jadwal?',
        text: 'Agen ini akan dihapus dari sesi ini.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: 'Ya, Hapus!'
    });
    
    if (result.isConfirmed) {
        showLoader();
        try {
            await supabaseClient.from('jadwal_master').delete().eq('id', id);
            await fetchJadwalData();
        } catch(e) {
            console.error(e);
            Swal.fire('Error', 'Gagal menghapus', 'error');
        } finally {
            hideLoader();
        }
    }
}'''

if old_hapus in js:
    js = js.replace(old_hapus, new_hapus)
else:
    # Try regex if exact string doesn't match
    import re
    js = re.sub(r'async function hapusJadwal\(id\) \{[\s\S]*?hideLoader\(\);\s*\}\s*\}', new_hapus, js)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
print("Updated hapusJadwal with SweetAlert and fixed missing sidebar icon.")
