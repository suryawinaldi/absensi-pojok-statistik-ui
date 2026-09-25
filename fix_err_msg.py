import os

js_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/js/app.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Fix the string concatenation
old_str = "Gagal terhubung ke database. Error: ' + (e.message || JSON.stringify(e)) + '<br><br>⚠️ PASTIKAN Anda membuka link dari Vercel, BUKAN klik 2x file index.html di laptop Anda. Fitur keamanan browser memblokir koneksi database jika dibuka secara lokal."

new_str = "Gagal terhubung ke database. Error: \" + (e.message || e.toString() || JSON.stringify(e)) + \"<br><br>⚠️ PASTIKAN Anda membuka link dari Vercel, BUKAN klik 2x file index.html di laptop Anda. Fitur keamanan browser memblokir koneksi database jika dibuka secara lokal."

js = js.replace(old_str, new_str)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
print('Fixed error message concatenation')
