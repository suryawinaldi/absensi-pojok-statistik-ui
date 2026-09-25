import os

js_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/js/app.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

old_btn = '''<button onclick="hapusJadwal(${j.id})" class="text-red-400 hover:text-red-600 p-1">'''
new_btn = '''<button onclick="hapusJadwal('${j.id}')" class="text-red-400 hover:text-red-600 p-1">'''

if old_btn in js:
    js = js.replace(old_btn, new_btn)
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write(js)
    print("Fixed UUID quotation in onclick")
else:
    print("Could not find old_btn")
