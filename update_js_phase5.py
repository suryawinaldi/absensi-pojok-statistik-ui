import os

js_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/js/app.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Update APP_SETTINGS defaults
if 'jam_mulai_pagi_jumat' not in js:
    js = js.replace("jam_mulai_siang: '13:30:00',", "jam_mulai_siang: '13:30:00',\n    jam_mulai_pagi_jumat: '09:00:00',\n    jam_mulai_siang_jumat: '13:30:00',")

# 2. Update markAbsen logic for Friday
old_batas = '''const batasPagi = parseTime(APP_SETTINGS.jam_mulai_pagi) + APP_SETTINGS.toleransi_telat_menit;
            const batasSiang = parseTime(APP_SETTINGS.jam_mulai_siang) + APP_SETTINGS.toleransi_telat_menit;'''

new_batas = '''const namaHari = HARI_MAP[new Date(tglStr).getDay()];
            const isJumat = (namaHari === 'Jumat');
            const batasPagi = parseTime(isJumat ? (APP_SETTINGS.jam_mulai_pagi_jumat || APP_SETTINGS.jam_mulai_pagi) : APP_SETTINGS.jam_mulai_pagi) + APP_SETTINGS.toleransi_telat_menit;
            const batasSiang = parseTime(isJumat ? (APP_SETTINGS.jam_mulai_siang_jumat || APP_SETTINGS.jam_mulai_siang) : APP_SETTINGS.jam_mulai_siang) + APP_SETTINGS.toleransi_telat_menit;'''
if 'const isJumat' not in js:
    js = js.replace(old_batas, new_batas)

# 3. Update Settings logic
old_load_settings = '''document.getElementById('set-jam-pagi').value = APP_SETTINGS.jam_mulai_pagi;
    document.getElementById('set-jam-siang').value = APP_SETTINGS.jam_mulai_siang;
    document.getElementById('set-toleransi').value = APP_SETTINGS.toleransi_telat_menit;
    document.getElementById('set-denda-telat').value = APP_SETTINGS.nominal_denda_telat;
    document.getElementById('set-denda-bolos').value = APP_SETTINGS.nominal_denda_bolos;'''

new_load_settings = '''document.getElementById('set-jam-pagi').value = APP_SETTINGS.jam_mulai_pagi;
    document.getElementById('set-jam-siang').value = APP_SETTINGS.jam_mulai_siang;
    
    document.getElementById('set-jam-pagi-jumat').value = APP_SETTINGS.jam_mulai_pagi_jumat || APP_SETTINGS.jam_mulai_pagi;
    document.getElementById('set-jam-siang-jumat').value = APP_SETTINGS.jam_mulai_siang_jumat || APP_SETTINGS.jam_mulai_siang;
    
    document.getElementById('set-toleransi').value = APP_SETTINGS.toleransi_telat_menit;
    document.getElementById('set-denda-telat').value = APP_SETTINGS.nominal_denda_telat;
    document.getElementById('set-denda-bolos').value = APP_SETTINGS.nominal_denda_bolos;'''
if 'set-jam-pagi-jumat' not in js:
    js = js.replace(old_load_settings, new_load_settings)

old_save_settings = '''jam_mulai_pagi: document.getElementById('set-jam-pagi').value + (document.getElementById('set-jam-pagi').value.length === 5 ? ':00' : ''),
        jam_mulai_siang: document.getElementById('set-jam-siang').value + (document.getElementById('set-jam-siang').value.length === 5 ? ':00' : ''),'''

new_save_settings = '''jam_mulai_pagi: document.getElementById('set-jam-pagi').value + (document.getElementById('set-jam-pagi').value.length === 5 ? ':00' : ''),
        jam_mulai_siang: document.getElementById('set-jam-siang').value + (document.getElementById('set-jam-siang').value.length === 5 ? ':00' : ''),
        jam_mulai_pagi_jumat: document.getElementById('set-jam-pagi-jumat').value + (document.getElementById('set-jam-pagi-jumat').value.length === 5 ? ':00' : ''),
        jam_mulai_siang_jumat: document.getElementById('set-jam-siang-jumat').value + (document.getElementById('set-jam-siang-jumat').value.length === 5 ? ':00' : ''),'''
if 'jam_mulai_pagi_jumat:' not in js:
    js = js.replace(old_save_settings, new_save_settings)

# 4. Update loadDashboard to include charts
# Find loadDashboard()
import re
load_dashboard_pattern = r'(async function loadDashboard\(\) \{.*?)(?=\n// ==========================================)'
match = re.search(load_dashboard_pattern, js, re.DOTALL)
if match:
    old_dashboard = match.group(1)
    
    # We will append the chart generation logic inside the try block, right before the catch
    chart_logic = '''
        // --- CHART JS LOGIC ---
        // Sesi Chart
        arr.sort((a, b) => b.hadir - a.hadir);
        const top10Sesi = arr.slice(0, 10);
        
        // Durasi Chart (Asumsi 1 Sesi = 2.5 Jam, kecuali Jumat mungkin beda, tapi kita pakai standar rata-rata 2.5)
        // Kita hitung durasi aktual per sesi
        const durasiData = Object.keys(stats).map(nama => {
            return {
                nama: nama,
                jam: stats[nama].jamTotal || (stats[nama].hadir * 2.5)
            };
        });
        durasiData.sort((a, b) => b.jam - a.jam);
        const top10Durasi = durasiData.slice(0, 10);

        if(window.chartSesiInstance) window.chartSesiInstance.destroy();
        if(window.chartDurasiInstance) window.chartDurasiInstance.destroy();

        const ctxSesi = document.getElementById('chartSesi');
        if(ctxSesi) {
            window.chartSesiInstance = new Chart(ctxSesi, {
                type: 'bar',
                data: {
                    labels: top10Sesi.map(x => x.nama),
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
                    labels: top10Durasi.map(x => x.nama),
                    datasets: [{
                        label: 'Estimasi Durasi Jaga (Jam)',
                        data: top10Durasi.map(x => x.jam),
                        backgroundColor: 'rgba(16, 185, 129, 0.7)',
                        borderColor: 'rgba(16, 185, 129, 1)',
                        borderWidth: 1,
                        borderRadius: 4
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    } catch (e) {'''
    
    new_dashboard = old_dashboard.replace('} catch (e) {', chart_logic)
    
    # We also need to calculate `jamTotal` in the `absensiRecords.forEach` loop
    old_loop = '''stats[a.nama_agen].hadir += 1;
                    const dendaRecord = dendaRecords?.find(d => d.tanggal === a.tanggal && d.nama_agen === a.nama_agen);'''
                    
    new_loop = '''stats[a.nama_agen].hadir += 1;
                    
                    // Estimasi Jam (Jumat = 2 jam, Lainnya = 2.5 jam)
                    const isJumat = new Date(a.tanggal).getDay() === 5;
                    stats[a.nama_agen].jamTotal = (stats[a.nama_agen].jamTotal || 0) + (isJumat ? 2 : 2.5);
                    
                    const dendaRecord = dendaRecords?.find(d => d.tanggal === a.tanggal && d.nama_agen === a.nama_agen);'''
                    
    new_dashboard = new_dashboard.replace(old_loop, new_loop)
    
    js = js.replace(old_dashboard, new_dashboard)


# 5. Fix loadAgen (The previous one failed because of supabaseClient rename)
old_load_agen = '''async function loadAgen() {
    showLoader();
    try {
        const { data } = await supabaseClient.from('agen').select('*').order('divisi').order('nama');
        let html = '';
        if(data) {
            data.forEach(a => {
                let badge = a.is_bph ? '<span class="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold"><i class="fa-solid fa-crown mr-1"></i>BPH</span>' : '<span class="bg-slate-100 text-slate-500 px-2 py-1 rounded text-xs font-semibold">Anggota</span>';
                html += `
                <tr class="hover:bg-slate-50 border-b border-slate-100 transition-colors">
                    <td class="px-6 py-4 font-medium text-slate-700">${a.nama}</td>
                    <td class="px-6 py-4 text-center"><span class="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs border border-indigo-100 font-semibold">${a.divisi}</span></td>
                    <td class="px-6 py-4 text-center">${badge}</td>
                </tr>
                `;
            });
        }
        document.getElementById('agen-table-body').innerHTML = html;
    } catch(e) { console.error(e); } finally { hideLoader(); }
}'''

new_load_agen = '''async function loadAgen() {
    showLoader();
    try {
        const { data } = await supabaseClient.from('agen').select('*').order('divisi').order('nama');
        let html = '';
        if(data && data.length > 0) {
            const grouped = {};
            data.forEach(a => {
                if(!grouped[a.divisi]) grouped[a.divisi] = [];
                grouped[a.divisi].push(a);
            });

            for (const divisi in grouped) {
                html += `
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden searchable-group">
                    <div class="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-3">
                        <div class="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
                            <i class="fa-solid fa-layer-group"></i>
                        </div>
                        <h4 class="text-lg font-bold text-slate-800">Divisi ${divisi}</h4>
                        <span class="ml-auto bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">${grouped[divisi].length} Agen</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-sm whitespace-nowrap">
                            <thead class="text-slate-500 border-b border-slate-100 text-xs">
                                <tr>
                                    <th class="py-3 px-6 font-semibold">NAMA AGEN</th>
                                    <th class="py-3 px-6 font-semibold text-center w-32">STATUS</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                `;
                
                grouped[divisi].forEach(a => {
                    let badge = a.is_bph ? '<span class="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold"><i class="fa-solid fa-crown mr-1"></i> BPH</span>' : '<span class="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-medium">Anggota</span>';
                    html += `
                                <tr class="hover:bg-slate-50 transition-colors searchable-row">
                                    <td class="px-6 py-4 font-semibold text-slate-700 searchable-name">${a.nama}</td>
                                    <td class="px-6 py-4 text-center">${badge}</td>
                                </tr>
                    `;
                });
                
                html += `
                            </tbody>
                        </table>
                    </div>
                </div>
                `;
            }
        } else {
            html = '<p class="text-slate-500 text-center py-8">Belum ada agen terdaftar.</p>';
        }
        
        const container = document.getElementById('agen-container');
        if(container) container.innerHTML = html;
        
    } catch(e) { console.error(e); } finally { hideLoader(); }
}'''
if old_load_agen in js:
    js = js.replace(old_load_agen, new_load_agen)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
print("Updated app.js for Friday, Charts, and Agen Grouping")
