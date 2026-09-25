import os
import re

js_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/js/app.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# We need to replace the logic inside loadDashboard
pattern_dashboard = r'(async function loadDashboard\(\) \{.*?)(?=\n// ==========================================)'
match = re.search(pattern_dashboard, js, re.DOTALL)

if match:
    old_dashboard = match.group(1)
    
    # Let's replace the whole loadDashboard to be clean and safe
    new_dashboard = '''async function loadDashboard() {
    showLoader();
    try {
        const { count: totalAgen } = await supabaseClient.from('agen').select('*', { count: 'exact', head: true });
        document.getElementById('dash-total-agen').innerText = totalAgen || 0;

        const { data: dendaRecords } = await supabaseClient.from('denda').select('*');
        let tunggakan = 0; let lunas = 0;
        if (dendaRecords) {
            dendaRecords.forEach(d => {
                if (d.status_lunas) lunas += d.nominal_denda;
                else tunggakan += d.nominal_denda;
            });
        }
        document.getElementById('dash-denda-tunggakan').innerText = 'Rp ' + tunggakan.toLocaleString('id-ID');
        document.getElementById('dash-denda-lunas').innerText = 'Rp ' + lunas.toLocaleString('id-ID');

        const { data: absensiRecords } = await supabaseClient.from('absensi').select('*');
        let stats = {};
        
        const parseTimeStr = (timeStr) => {
            if(!timeStr || timeStr === '-') return 0;
            const parts = timeStr.split(/[:.]/);
            if(parts.length < 2) return 0;
            return parseInt(parts[0]) * 60 + parseInt(parts[1]);
        };

        if (absensiRecords) {
            absensiRecords.forEach(a => {
                if (!stats[a.nama_agen]) {
                    stats[a.nama_agen] = { hadir: 0, denda: 0, menitTotal: 0 };
                }
                if (a.kehadiran === 'Hadir') {
                    stats[a.nama_agen].hadir += 1;
                    
                    // Hitung durasi dinamis dalam Menit
                    if (a.waktu_hadir !== '-') {
                        const namaHari = HARI_MAP[new Date(a.tanggal).getDay()];
                        const isJumat = (namaHari === 'Jumat');
                        const durasiStandar = isJumat ? 120 : 150; // Jumat 2 jam, hari lain 2.5 jam
                        
                        let jamMulaiStr = '10:00';
                        if (APP_SETTINGS && APP_SETTINGS.jadwal_harian && APP_SETTINGS.jadwal_harian[namaHari] && APP_SETTINGS.jadwal_harian[namaHari][a.sesi]) {
                            jamMulaiStr = APP_SETTINGS.jadwal_harian[namaHari][a.sesi].mulai;
                        }
                        
                        const menitAbsen = parseTimeStr(a.waktu_hadir);
                        const menitMulai = parseTimeStr(jamMulaiStr);
                        const menitSelesai = menitMulai + durasiStandar;
                        
                        let durasiAsli = menitSelesai - menitAbsen;
                        if (durasiAsli < 0) durasiAsli = 0; // Kalo absen setelah shift bubar
                        
                        stats[a.nama_agen].menitTotal += durasiAsli;
                    }

                    const dendaRecord = dendaRecords?.find(d => d.tanggal === a.tanggal && d.nama_agen === a.nama_agen);
                    if (dendaRecord) {
                        stats[a.nama_agen].denda += dendaRecord.nominal_denda;
                    }
                }
            });
        }

        const arr = Object.keys(stats).map(nama => {
            return { nama, hadir: stats[nama].hadir, denda: stats[nama].denda, menit: stats[nama].menitTotal };
        });

        // Urutkan Leaderboard Rajin
        arr.sort((a, b) => {
            if (b.hadir !== a.hadir) return b.hadir - a.hadir;
            return a.denda - b.denda;
        });

        let lbHtml = '';
        if (arr.length === 0) {
            lbHtml = '<p class="text-slate-500 text-sm text-center py-4">Belum ada data absensi.</p>';
        } else {
            for (let i = 0; i < Math.min(5, arr.length); i++) {
                const ag = arr[i];
                const isTop1 = i === 0;
                lbHtml += `
                <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 ${isTop1 ? 'border-amber-200 bg-amber-50' : ''}">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full ${isTop1 ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'} font-bold flex items-center justify-center text-sm">
                            ${i + 1}
                        </div>
                        <span class="font-bold text-slate-700">${ag.nama}</span>
                    </div>
                    <div class="flex items-center gap-4">
                        <span class="text-xs font-bold text-slate-500"><i class="fa-solid fa-check text-green-500"></i> ${ag.hadir} Sesi</span>
                    </div>
                </div>
                `;
            }
        }
        document.getElementById('dash-leaderboard-rajin').innerHTML = lbHtml;

        // --- CHART JS LOGIC ---
        // Sesi Chart
        const top10Sesi = [...arr].sort((a, b) => b.hadir - a.hadir).slice(0, 10);
        
        // Durasi Chart (Menit)
        const top10Durasi = [...arr].sort((a, b) => b.menit - a.menit).slice(0, 10);

        if(window.chartSesiInstance) window.chartSesiInstance.destroy();
        if(window.chartDurasiInstance) window.chartDurasiInstance.destroy();

        const ctxSesi = document.getElementById('chartSesi');
        if(ctxSesi) {
            window.chartSesiInstance = new Chart(ctxSesi, {
                type: 'bar',
                data: {
                    labels: top10Sesi.map(x => x.nama.split(' ')[0]), // Ambil nama depan biar muat
                    datasets: [{
                        label: 'Total Sesi Jaga',
                        data: top10Sesi.map(x => x.hadir),
                        backgroundColor: 'rgba(59, 130, 246, 0.7)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 1,
                        borderRadius: 4
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

        const ctxDurasi = document.getElementById('chartDurasi');
        if(ctxDurasi) {
            window.chartDurasiInstance = new Chart(ctxDurasi, {
                type: 'bar',
                data: {
                    labels: top10Durasi.map(x => x.nama.split(' ')[0]), // Ambil nama depan biar muat
                    datasets: [{
                        label: 'Total Durasi Jaga (Menit)',
                        data: top10Durasi.map(x => x.menit),
                        backgroundColor: 'rgba(16, 185, 129, 0.7)',
                        borderColor: 'rgba(16, 185, 129, 1)',
                        borderWidth: 1,
                        borderRadius: 4
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    } catch (e) {
        console.error(e);
    } finally {
        hideLoader();
    }
}'''
    
    js = js.replace(old_dashboard, new_dashboard)
    
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write(js)
    print("Dashboard dynamic minutes replaced")
else:
    print("Failed to replace dashboard logic")
