import os

js_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/js/app.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

settings_logic = """
    // ==========================================
    // 2. STATE & CLOCK & SETTINGS
    // ==========================================
    let APP_SETTINGS = {
        jam_mulai_pagi: '10:00:00',
        jam_mulai_siang: '13:30:00',
        toleransi_telat_menit: 30,
        nominal_denda_telat: 5000,
        nominal_denda_bolos: 10000
    };
    
    async function fetchSettings() {
        try {
            const { data } = await supabase.from('pengaturan_sistem').select('*').eq('id', 1).single();
            if(data) {
                APP_SETTINGS = data;
            }
        } catch(e) { console.error('Gagal memuat pengaturan', e); }
    }
    
    fetchSettings();
"""
js = js.replace('// ==========================================\n    // 2. STATE & CLOCK\n    // ==========================================', settings_logic)

js = js.replace("['absensi', 'jadwal', 'denda']", "['dashboard', 'absensi', 'jadwal', 'denda']")
js = js.replace("if(tabId === 'denda') loadDenda();", "if(tabId === 'denda') loadDenda();\n        if(tabId === 'dashboard') loadDashboard();")

dashboard_func = """
    // ==========================================
    // DASHBOARD LOGIC
    // ==========================================
    async function loadDashboard() {
        showLoader();
        try {
            const { count: totalAgen } = await supabase.from('agen').select('*', { count: 'exact', head: true });
            document.getElementById('dash-total-agen').innerText = totalAgen || 0;

            const { data: dendaRecords } = await supabase.from('denda').select('*');
            let tunggakan = 0; let lunas = 0;
            if (dendaRecords) {
                dendaRecords.forEach(d => {
                    if (d.status_lunas) lunas += d.nominal_denda;
                    else tunggakan += d.nominal_denda;
                });
            }
            document.getElementById('dash-denda-tunggakan').innerText = 'Rp ' + tunggakan.toLocaleString('id-ID');
            document.getElementById('dash-denda-lunas').innerText = 'Rp ' + lunas.toLocaleString('id-ID');

            const { data: absensiRecords } = await supabase.from('absensi').select('*');
            let stats = {};
            if (absensiRecords) {
                absensiRecords.forEach(a => {
                    if (!stats[a.nama_agen]) stats[a.nama_agen] = { hadir: 0, bolos: 0, telat: 0 };
                    
                    if (a.kehadiran === 'Hadir') {
                        stats[a.nama_agen].hadir += 1;
                        const dendaRecord = dendaRecords?.find(d => d.tanggal === a.tanggal && d.nama_agen === a.nama_agen);
                        if(dendaRecord && dendaRecord.nominal_denda === APP_SETTINGS.nominal_denda_telat) {
                            stats[a.nama_agen].telat += 1;
                        }
                    } else if (a.kehadiran === 'Tidak Hadir') {
                        stats[a.nama_agen].bolos += 1;
                    }
                });
            }

            let arr = Object.keys(stats).map(nama => ({
                nama, hadir: stats[nama].hadir, bolos: stats[nama].bolos, telat: stats[nama].telat, totalBuruk: stats[nama].bolos + stats[nama].telat
            }));

            // Rajin
            arr.sort((a, b) => b.hadir - a.hadir);
            let htmlRajin = '';
            arr.slice(0, 5).forEach((item, index) => {
                let badge = index === 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600';
                let icon = index === 0 ? '<i class="fa-solid fa-crown"></i>' : `#${index+1}`;
                htmlRajin += `
                <div class="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full ${badge} flex items-center justify-center text-xs font-bold">${icon}</div>
                        <span class="font-semibold text-slate-700">${item.nama}</span>
                    </div>
                    <span class="text-sm font-bold text-blue-600">${item.hadir} Hadir</span>
                </div>`;
            });
            if(arr.length === 0) htmlRajin = '<p class="text-slate-500 text-sm text-center py-4">Belum ada data absensi.</p>';
            document.getElementById('dash-leaderboard-rajin').innerHTML = htmlRajin;

            // Malas
            arr.sort((a, b) => b.totalBuruk - a.totalBuruk);
            let htmlMalas = '';
            const malasArr = arr.filter(item => item.totalBuruk > 0).slice(0, 5);
            malasArr.forEach((item, index) => {
                htmlMalas += `
                <div class="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border-l-2 border-red-400">
                    <span class="font-semibold text-slate-700">${item.nama}</span>
                    <div class="flex gap-2">
                        ${item.bolos > 0 ? `<span class="text-xs px-2 py-1 bg-red-100 text-red-600 rounded font-semibold">${item.bolos} Bolos</span>` : ''}
                        ${item.telat > 0 ? `<span class="text-xs px-2 py-1 bg-orange-100 text-orange-600 rounded font-semibold">${item.telat} Telat</span>` : ''}
                    </div>
                </div>`;
            });
            if(malasArr.length === 0) htmlMalas = '<p class="text-slate-500 text-sm text-center py-4">Semua agen disiplin! Tidak ada pelanggaran.</p>';
            document.getElementById('dash-leaderboard-malas').innerHTML = htmlMalas;

        } catch (e) { console.error(e); } finally { hideLoader(); }
    }
"""

js = js.replace('// ==========================================\n    // 5. ABSENSI HARIAN LOGIC', dashboard_func + '\n    // ==========================================\n    // 5. ABSENSI HARIAN LOGIC')

js = js.replace("switchTab('absensi');", "switchTab('dashboard');")

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
print('Dashboard logic added')
