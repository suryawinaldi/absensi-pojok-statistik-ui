import re

with open('D:/APLIKASI ABSENSI POJOK STATISTIK/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Inject Login UI after body tag
login_ui = """
    <!-- LOGIN SCREEN -->
    <div id="login-screen" class="fixed inset-0 bg-slate-50 z-50 flex items-center justify-center">
        <div class="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 max-w-sm w-full mx-4 text-center">
            <div class="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner">
                <i class="fa-solid fa-lock"></i>
            </div>
            <h2 class="text-2xl font-bold text-slate-800 mb-2">Login Admin</h2>
            <p class="text-sm text-slate-500 mb-6">Silakan masukkan akses untuk masuk.</p>
            
            <div class="space-y-4 text-left">
                <div>
                    <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Username</label>
                    <input type="text" id="login-username" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Masukkan username">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Password</label>
                    <input type="password" id="login-password" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Masukkan password">
                </div>
                <button onclick="checkLogin()" class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all mt-2">
                    Masuk Sekarang
                </button>
            </div>
        </div>
    </div>
"""
if 'id="login-screen"' not in html:
    html = html.replace('<body class="bg-slate-50 text-slate-800 font-sans flex h-screen overflow-hidden">', '<body class="bg-slate-50 text-slate-800 font-sans flex h-screen overflow-hidden">\n' + login_ui)

# 2. Inject Logout Button
logout_btn = """
        <div class="p-4 border-t border-white/10 mt-auto">
            <button onclick="logout()" class="w-full py-2 text-sm font-semibold text-red-400 hover:bg-red-400/10 border border-red-400/30 rounded-lg transition-colors flex items-center justify-center gap-2">
                <i class="fa-solid fa-arrow-right-from-bracket"></i> Keluar (Logout)
            </button>
        </div>
"""
if 'onclick="logout()"' not in html:
    html = html.replace('</nav>', '</nav>\n' + logout_btn)

# 3. Inject JS Logic
login_script = """
    // ==========================================
    // 0. LOGIN LOGIC
    // ==========================================
    const AUTH_USER = 'admin';
    const AUTH_PASS = 'pojok2026';

    function checkAuth() {
        if(localStorage.getItem('pojok_logged_in') === 'true') {
            document.getElementById('login-screen').style.display = 'none';
        }
    }

    function checkLogin() {
        const u = document.getElementById('login-username').value;
        const p = document.getElementById('login-password').value;
        
        if(u === AUTH_USER && p === AUTH_PASS) {
            localStorage.setItem('pojok_logged_in', 'true');
            document.getElementById('login-screen').style.display = 'none';
            Swal.fire({ icon: 'success', title: 'Berhasil Login', text: 'Selamat datang, Admin!', timer: 1500, showConfirmButton: false });
        } else {
            Swal.fire({ icon: 'error', title: 'Akses Ditolak', text: 'Username atau password salah!' });
        }
    }

    function logout() {
        localStorage.removeItem('pojok_logged_in');
        window.location.reload();
    }
    
    // Call checkAuth on load
    checkAuth();
"""
if 'const AUTH_USER' not in html:
    html = html.replace('// 1. SUPABASE INITIALIZATION', login_script + '\n\n    // 1. SUPABASE INITIALIZATION')


with open('D:/APLIKASI ABSENSI POJOK STATISTIK/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('Login feature injected!')
