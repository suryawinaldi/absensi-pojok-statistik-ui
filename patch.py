import os

js_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/js/app.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Add try-catch and finally to hideLoader
new_js = js.replace(
    'async function loadAbsensiToday() {\n    showLoader();',
    'async function loadAbsensiToday() {\n    showLoader();\n    try {'
)

new_js = new_js.replace(
    '''        document.getElementById('absensi-table-body').innerHTML = html;
        hideLoader();
    }''',
    '''        document.getElementById('absensi-table-body').innerHTML = html;
    } catch(e) {
        console.error("Supabase Error:", e);
        document.getElementById('absensi-table-body').innerHTML = "<tr><td colspan='5' class='text-center py-8 text-red-500'>Gagal terhubung ke database. Ini normal jika dijalankan secara lokal (file://). Silakan hosting ke Vercel.</td></tr>";
    } finally {
        hideLoader();
    }
}'''
)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(new_js)
print('Patched app.js')
