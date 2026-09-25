import re

with open('D:/APLIKASI ABSENSI POJOK STATISTIK/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

robust_check_login = """
    function checkLogin() {
        const u = document.getElementById('login-username').value;
        const p = document.getElementById('login-password').value;
        
        const success = (u === AUTH_USER && p === AUTH_PASS);
        
        if(success) {
            localStorage.setItem('pojok_logged_in', 'true');
            document.getElementById('login-screen').style.display = 'none';
        }
        
        if (typeof Swal !== 'undefined') {
            if(success) {
                Swal.fire({ icon: 'success', title: 'Berhasil Login', text: 'Selamat datang, Admin!', timer: 1500, showConfirmButton: false });
            } else {
                Swal.fire({ icon: 'error', title: 'Akses Ditolak', text: 'Username atau password salah!' });
            }
        } else {
            if(success) {
                alert('Berhasil Login! Selamat datang, Admin.');
            } else {
                alert('Akses Ditolak! Username atau password salah!');
            }
        }
    }
"""

html = re.sub(r'function checkLogin\(\)\s*\{[\s\S]*?\}\s*\}', robust_check_login.strip(), html)
html = html.replace('id="login-password"', 'id="login-password" onkeydown="if(event.key === \'Enter\') checkLogin()"')

with open('D:/APLIKASI ABSENSI POJOK STATISTIK/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('Robust login applied')
