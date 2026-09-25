// 0. LOGIN LOGIC
    // ==========================================
    const AUTH_USER = 'admin';
    const AUTH_PASS = 'pojok2026';

    function checkAuth() {
        if((function(){try{return localStorage.getItem('pojok_logged_in');}catch(e){return null;}})() === 'true') {
            const screen = document.getElementById('login-screen');
            if(screen) screen.style.display = 'none';
        }
    }

    function checkLogin() {
        const u = document.getElementById('login-username').value;
        const p = document.getElementById('login-password').value;
        const success = (u === AUTH_USER && p === AUTH_PASS);
        
        if(success) {
            try{localStorage.setItem('pojok_logged_in', 'true');}catch(e){}
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

    function logout() {
        try{localStorage.removeItem('pojok_logged_in');}catch(e){}
        window.location.reload();
    }
    
    // Call checkAuth on load
    checkAuth();