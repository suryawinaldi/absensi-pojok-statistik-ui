import os

js_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/js/app.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

old_hapus = '''async function hapusJadwal(id) {
    if(!id) {
        Swal.fire('Error', 'ID Jadwal tidak ditemukan. Tabel di database mungkin tidak memiliki kolom id.', 'error');
        return;
    }'''

new_hapus = '''async function hapusJadwal(id) {
    alert("Tombol tertekan! ID: " + id);
    if(!id || id === 'undefined') {
        Swal.fire('Error', 'ID Jadwal tidak ditemukan atau belum diset up di database Supabase Anda. Pastikan ada kolom "id" di tabel jadwal_master.', 'error');
        return;
    }'''

if old_hapus in js:
    js = js.replace(old_hapus, new_hapus)
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write(js)
    print("Added alert to hapusJadwal")
else:
    print("Pattern not found")
