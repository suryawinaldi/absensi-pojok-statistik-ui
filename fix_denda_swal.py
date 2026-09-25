import os
import re

js_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/js/app.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

pattern = r'async function hapusDenda\(id\)\s*\{\s*if\(confirm\(\'Hapus record denda ini\?\'\)\)\s*\{\s*showLoader\(\);\s*await supabaseClient\.from\(\'denda\'\)\.delete\(\)\.eq\(\'id\',\s*id\);\s*loadDenda\(\);\s*\}\s*\}'

new_hapus = '''async function hapusDenda(id) {
    const result = await Swal.fire({
        title: 'Hapus Rekor Denda?',
        text: 'Data denda ini akan dihapus secara permanen.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: 'Ya, Hapus'
    });
    
    if(result.isConfirmed) {
        showLoader();
        try {
            await supabaseClient.from('denda').delete().eq('id', id);
            loadDenda();
        } catch(e) {
            console.error(e);
            Swal.fire('Error', 'Gagal menghapus denda', 'error');
        } finally {
            hideLoader();
        }
    }
}'''

js = re.sub(pattern, new_hapus, js)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
print("Updated hapusDenda to SweetAlert")
