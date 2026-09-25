import re
with open('D:/APLIKASI ABSENSI POJOK STATISTIK/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Completely clean up the CSS
html = re.sub(r'body::after\s*\{[\s\S]*?z-index: -1;\s*\}', '', html)

with open('D:/APLIKASI ABSENSI POJOK STATISTIK/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('Reverted thoroughly!')
