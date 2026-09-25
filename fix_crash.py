import os

js_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/js/app.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Fix function signature
js = js.replace("batalkanAbsen(''idAbsensi", "batalkanAbsen(idAbsensi")

# Fix button clicks
js = js.replace("batalkanAbsen(''${absRec.id}", "batalkanAbsen('${absRec.id}")

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
print("Fixed SyntaxError")
