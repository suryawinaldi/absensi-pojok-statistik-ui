import os
import re

js_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/js/app.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Fix the bukaModalEkstra call to markAbsen
old_call = "await markAbsen(nama, sesi, 'Hadir', false); // Extra always normal agent"
new_call = "await markAbsen(nama, sesi, 'Hadir', false, true); // Ekstra kebal denda telat"

if old_call in js:
    js = js.replace(old_call, new_call)
    
    # Wait, also we need to mark them as extra in the DB or at least during the UI render.
    # Actually, in markAbsen we only insert to `absensi`.
    # Wait, `is_pj: isPj` is saved, but we don't save `is_extra` in `absensi` table because the table might not have it.
    # But in the UI we show "Agen Ekstra (Back-up)". How does the UI know they are extra?
    # Because they are in `absensi` but NOT in `jadwal_master`. 
    # The UI already infers this properly. We just need to stop the Denda penalty!
    
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write(js)
    print("Fixed markAbsen argument for Ekstra")
else:
    print("Pattern not found!")
