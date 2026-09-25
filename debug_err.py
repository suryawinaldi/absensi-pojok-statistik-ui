import os

js_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/js/app.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Make the error message output the exact error details to the screen
js = js.replace("Gagal terhubung ke database. Cek koneksi internet atau pengaturan Supabase.", 
                "Gagal terhubung ke database. Error: ' + (e.message || JSON.stringify(e)) + '<br><br>⚠️ PASTIKAN Anda membuka link dari Vercel, BUKAN klik 2x file index.html di laptop Anda. Fitur keamanan browser memblokir koneksi database jika dibuka secara lokal.")

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
print('Detailed error message added')
