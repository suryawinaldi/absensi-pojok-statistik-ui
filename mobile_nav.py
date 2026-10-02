import os
import re

html_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/index.html'
js_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/js/app.js'

with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Add Bottom Navigation Bar
bottom_nav = '''
    <!-- Mobile Bottom Navigation Bar -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 flex justify-around items-center px-1 py-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <button onclick="switchTab('dashboard')" class="flex flex-col items-center p-2 text-slate-500 hover:text-blue-600 transition-colors">
            <i class="fa-solid fa-chart-pie text-xl mb-1"></i>
            <span class="text-[10px] font-bold">Dasbor</span>
        </button>
        <button onclick="switchTab('absensi')" class="flex flex-col items-center p-2 text-slate-500 hover:text-blue-600 transition-colors">
            <i class="fa-solid fa-clipboard-list text-xl mb-1"></i>
            <span class="text-[10px] font-bold">Absen</span>
        </button>
        <button onclick="switchTab('jadwal')" class="flex flex-col items-center p-2 text-slate-500 hover:text-blue-600 transition-colors">
            <i class="fa-solid fa-calendar-week text-xl mb-1"></i>
            <span class="text-[10px] font-bold">Jadwal</span>
        </button>
        <button onclick="switchTab('denda')" class="flex flex-col items-center p-2 text-slate-500 hover:text-blue-600 transition-colors">
            <i class="fa-solid fa-file-invoice-dollar text-xl mb-1"></i>
            <span class="text-[10px] font-bold">Denda</span>
        </button>
        <button onclick="toggleSidebar()" class="flex flex-col items-center p-2 text-slate-500 hover:text-blue-600 transition-colors">
            <i class="fa-solid fa-ellipsis text-xl mb-1"></i>
            <span class="text-[10px] font-bold">Lainnya</span>
        </button>
    </nav>
'''
if "<!-- Mobile Bottom Navigation Bar -->" not in html:
    html = html.replace('</body>', bottom_nav + '\n</body>')

# 2. Add padding-bottom to the main content container
old_container = '<div class="flex-1 overflow-auto p-6">'
new_container = '<div class="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6">'
if old_container in html:
    html = html.replace(old_container, new_container)

# 3. Add "Hadirkan Semua" button in Absensi Harian header
old_absensi_header_buttons = '''<button onclick="exportToCSV('absensi')" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-2">
                            <i class="fa-solid fa-file-excel"></i> Export CSV
                        </button>'''
new_absensi_header_buttons = '''<button onclick="hadirkanSemua()" class="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-2">
                            <i class="fa-solid fa-check-double"></i> Hadirkan Semua
                        </button>
                        <button onclick="exportToCSV('absensi')" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-2 hidden md:flex">
                            <i class="fa-solid fa-file-excel"></i> Export CSV
                        </button>'''
html = html.replace(old_absensi_header_buttons, new_absensi_header_buttons)

# 4. Add Digital Certificate UI inside Dashboard
# Let's inject a new div before the leaderboard in Dashboard
old_leaderboard = '''<div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <h3 class="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                            <i class="fa-solid fa-medal text-amber-500"></i> Agen Terajin (Top 5)
                        </h3>
                        <div class="space-y-3" id="dash-leaderboard-rajin">
                            <!-- Loaded via JS -->
                        </div>
                    </div>'''

new_leaderboard_and_cert = '''<div class="space-y-6">
                        <!-- Digital Certificate (Agent of the Month) -->
                        <div class="bg-gradient-to-br from-amber-400 to-amber-600 p-[2px] rounded-3xl shadow-lg relative overflow-hidden">
                            <div class="absolute -right-6 -top-6 text-white/20">
                                <i class="fa-solid fa-award text-9xl"></i>
                            </div>
                            <div class="bg-white/95 backdrop-blur rounded-[22px] p-5 relative">
                                <div class="flex items-center gap-4 mb-2">
                                    <div class="w-12 h-12 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white text-xl shadow-md border-2 border-white">
                                        <i class="fa-solid fa-crown"></i>
                                    </div>
                                    <div>
                                        <p class="text-xs font-bold text-amber-600 uppercase tracking-wider">🌟 Star Agent of the Month</p>
                                        <h4 class="text-xl font-black text-slate-800 leading-tight" id="cert-nama">...</h4>
                                    </div>
                                </div>
                                <p class="text-sm text-slate-600 font-medium">Telah menunjukkan dedikasi tertinggi dengan <b id="cert-sesi" class="text-amber-600">0</b> sesi jaga dan <b id="cert-durasi" class="text-amber-600">0</b> menit total.</p>
                            </div>
                        </div>

                        <!-- Leaderboard -->
                        <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                            <h3 class="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                                <i class="fa-solid fa-medal text-amber-500"></i> Agen Terajin (Top 5)
                            </h3>
                            <div class="space-y-3" id="dash-leaderboard-rajin">
                                <!-- Loaded via JS -->
                            </div>
                        </div>
                    </div>'''

if old_leaderboard in html:
    html = html.replace(old_leaderboard, new_leaderboard_and_cert)
    
with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)
print("HTML updated with mobile nav, bulk action, and cert UI")


# Now update app.js to populate the cert and add hadirkanSemua function
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Add logic to populate Certificate
old_cert_logic = '''document.getElementById('dash-leaderboard-rajin').innerHTML = lbHtml;'''
new_cert_logic = '''document.getElementById('dash-leaderboard-rajin').innerHTML = lbHtml;
        
        // Populate Digital Certificate
        if (arr.length > 0) {
            const top1 = arr[0];
            document.getElementById('cert-nama').innerText = top1.nama;
            document.getElementById('cert-sesi').innerText = top1.hadir;
            document.getElementById('cert-durasi').innerText = top1.menit;
        } else {
            document.getElementById('cert-nama').innerText = "Belum Ada";
        }'''
js = js.replace(old_cert_logic, new_cert_logic)

# Add hadirkanSemua() function
bulk_func = '''
// ==========================================
// BULK ACTION
// ==========================================
async function hadirkanSemua() {
    const tableBody = document.getElementById('absensi-table-body');
    // Find all 'Hadir' buttons in the current table that are not hidden
    const btnHadirList = tableBody.querySelectorAll('button.bg-blue-600, button.bg-blue-500'); // Assuming the Hadir button has blue bg
    
    if(btnHadirList.length === 0) {
        Swal.fire('Info', 'Tidak ada agen yang bisa ditandai hadir di layar saat ini.', 'info');
        return;
    }
    
    const { isConfirmed } = await Swal.fire({
        title: 'Hadirkan Semua?',
        text: `Terdapat ${btnHadirList.length} agen yang belum absen. Tandai hadir semua secara bersamaan?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Hadirkan Semua',
        cancelButtonText: 'Batal'
    });
    
    if(isConfirmed) {
        showLoader();
        try {
            // We'll simulate clicking them or call markAbsen sequentially
            // Better to call markAbsen sequentially to reuse the logic (anti-cheat, fines, etc)
            for (let i = 0; i < btnHadirList.length; i++) {
                // The onclick attribute is something like "markAbsen('Dastin', 'Pagi', 'Hadir', true)"
                // Let's just click the button programmatically
                btnHadirList[i].click();
                // Wait a bit to not overwhelm the DB and allow state to settle
                await new Promise(r => setTimeout(r, 400));
            }
        } catch(e) {
            console.error(e);
        }
        // hideLoader will be handled by the individual clicks or we can do it
        setTimeout(() => hideLoader(), 1000);
    }
}
'''
if "hadirkanSemua()" not in js:
    js = js.replace('// Init first load', bulk_func + '\n// Init first load')

# Highlight active tab in bottom nav
active_nav_js = '''
    // Update mobile bottom nav active state
    document.querySelectorAll('nav.md\\\\:hidden button').forEach(btn => {
        btn.classList.remove('text-blue-600');
        btn.classList.add('text-slate-500');
    });
    const activeBottomBtn = document.querySelector(`nav.md\\\\:hidden button[onclick="switchTab('${tabId}')"]`);
    if(activeBottomBtn) {
        activeBottomBtn.classList.remove('text-slate-500');
        activeBottomBtn.classList.add('text-blue-600');
    }
'''
if "activeBottomBtn" not in js:
    old_switchTab = "document.getElementById('page-title').innerText = titles[tabId];"
    js = js.replace(old_switchTab, old_switchTab + '\n' + active_nav_js)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
print("JS updated with bulk action and cert logic")
