
// ==========================================
// ANTI-CHEAT WAKTU SERVER
// ==========================================
async function getWaktuServer() {
    try {
        const res = await fetch('http://worldtimeapi.org/api/timezone/Asia/Jakarta');
        const data = await res.json();
        return new Date(data.datetime);
    } catch(e) {
        console.warn('Gagal fetch worldtimeapi, menggunakan jam lokal sebagai fallback');
        return new Date(); // Fallback ke lokal jika API down
    }
}

// ==========================================
// 2. STATE & CLOCK & SETTINGS
// ==========================================
let APP_SETTINGS = {
    jam_mulai_pagi: '10:00:00',
    jam_mulai_siang: '13:30:00',
    jam_mulai_pagi_jumat: '09:00:00',
    jam_mulai_siang_jumat: '13:30:00',
    toleransi_telat_menit: 30,
    nominal_denda_telat: 5000,
    nominal_denda_bolos: 10000
};

let allAgents = [];
let allJadwal = [];
const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
const HARI_MAP = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

async function fetchSettings() {
    try {
        const { data } = await supabaseClient.from('pengaturan_sistem').select('*').eq('id', 1).single();
        if(data) {
            APP_SETTINGS = data;
        }
    } catch(e) { console.error('Gagal memuat pengaturan', e); }
}

fetchSettings();

setInterval(() => {
    const now = new Date();
    const el = document.getElementById('live-clock');
    if(el) el.innerText = now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' }) + " WIB";
}, 1000);

// ==========================================
// 3. UI TAB NAVIGATION
// ==========================================
function switchTab(tabId) {
    ['dashboard', 'absensi', 'jadwal', 'denda', 'agen', 'pengaturan'].forEach(id => {
        const sec = document.getElementById(`sec-${id}`);
        if(sec) sec.classList.add('hidden');
        
        let btn = document.getElementById(`tab-${id}`);
        if(btn) btn.className = "w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-xl transition-all";
    });
    
    const secActive = document.getElementById(`sec-${tabId}`);
    if(secActive) secActive.classList.remove('hidden');
    
    let activeBtn = document.getElementById(`tab-${tabId}`);
    if(activeBtn) activeBtn.className = "w-full flex items-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-xl transition-all shadow-md";
    
    const titles = { 'dashboard': 'Dashboard Analytics', 'absensi': 'Absensi Harian', 'jadwal': 'Jadwal Master (Multi-Shift)', 'denda': 'Rekap Denda Kasir', 'agen': 'Daftar Agen Pojok Statistik', 'pengaturan': 'Pengaturan Sistem' };
    document.getElementById('page-title').innerText = titles[tabId];

    if(tabId === 'dashboard') loadDashboard();
    if(tabId === 'absensi') loadAbsensiToday();
    if(tabId === 'jadwal') loadJadwal();
    if(tabId === 'denda') loadDenda();
    if(tabId === 'agen') loadAgen();
    if(tabId === 'pengaturan') loadSettingsUI();
}


// ==========================================
// DASHBOARD LOGIC
// ==========================================
async function loadDashboard() {
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
        if (absensiRecords) {
            absensiRecords.forEach(a => {
                if (!stats[a.nama_agen]) stats[a.nama_agen] = { hadir: 0, bolos: 0, telat: 0 };
                
                if (a.kehadiran === 'Hadir') {
                    stats[a.nama_agen].hadir += 1;
                    
                    // Estimasi Jam (Jumat = 2 jam, Lainnya = 2.5 jam)
                    const isJumat = new Date(a.tanggal).getDay() === 5;
                    stats[a.nama_agen].jamTotal = (stats[a.nama_agen].jamTotal || 0) + (isJumat ? 2 : 2.5);
                    
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
            <div class="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border border-slate-100 mb-2 shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full ${badge} flex items-center justify-center text-xs font-bold">${icon}</div>
                    <span class="font-semibold text-slate-700">${item.nama}</span>
                </div>
                <span class="text-sm font-bold text-blue-600">${item.hadir} Kehadiran</span>
            </div>`;
        });
        if(arr.length === 0) htmlRajin = '<p class="text-slate-500 text-sm text-center py-4">Belum ada data absensi.</p>';
        document.getElementById('dash-leaderboard-rajin').innerHTML = htmlRajin;

    
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
    } catch (e) { console.error(e); } finally { hideLoader(); }
}

// ==========================================
// 4. JADWAL MASTER (SEARCH & TAG) LOGIC
// ==========================================
async function loadJadwal() {
    showLoader();
    try {
        const resAgen = await supabaseClient.from('agen').select('*').order('nama');
        allAgents = resAgen.data || [];
        
        await fetchJadwalData();
    } catch(e) { console.error(e); } finally {
        hideLoader();
    }
}

async function fetchJadwalData() {
    const resJadwal = await supabaseClient.from('jadwal_master').select('*');
    allJadwal = resJadwal.data || [];
    renderJadwalUI();
}

function renderJadwalUI() {
    const container = document.getElementById('jadwal-days-container');
    if(!container) return;
    
    let html = '';

    HARI_LIST.forEach(hari => {
        let pagiCards = '';
        let siangCards = '';

        allJadwal.filter(j => j.hari === hari).forEach(j => {
            const isPj = j.is_pj ? '<i class="fa-solid fa-crown text-amber-500 mr-1"></i> PJ' : 'Agen';
            const card = `
                <div class="flex justify-between items-center bg-white border border-slate-200 p-2 rounded-lg shadow-sm">
                    <div class="flex flex-col">
                        <span class="text-sm font-semibold text-slate-700">${j.nama_agen}</span>
                        <span class="text-[10px] text-slate-500">${isPj}</span>
                    </div>
                    <button onclick="hapusJadwal(${j.id})" class="text-red-400 hover:text-red-600 p-1">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            `;
            if(j.sesi === 'Pagi') pagiCards += card;
            else siangCards += card;
        });

        html += `
        <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6">
            <div class="w-full md:w-1/4">
                <h4 class="text-xl font-bold text-slate-800">${hari}</h4>
                <p class="text-xs text-slate-500">Atur jadwal jaga untuk hari ini.</p>
            </div>
            
            <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- PAGI -->
                <div class="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <div class="flex justify-between items-center mb-3">
                        <span class="font-bold text-blue-700 text-sm">SESI PAGI</span>
                        <button onclick="tambahJadwalModal('${hari}', 'Pagi')" class="text-xs bg-blue-600 text-white px-2 py-1 rounded shadow-sm hover:bg-blue-700">+ Tambah</button>
                    </div>
                    <div class="space-y-2 min-h-[50px]">${pagiCards || '<p class="text-xs text-slate-400 italic">Belum ada agen</p>'}</div>
                </div>

                <!-- SIANG -->
                <div class="bg-green-50/50 p-4 rounded-xl border border-green-100">
                    <div class="flex justify-between items-center mb-3">
                        <span class="font-bold text-green-700 text-sm">SESI SIANG</span>
                        <button onclick="tambahJadwalModal('${hari}', 'Siang')" class="text-xs bg-green-600 text-white px-2 py-1 rounded shadow-sm hover:bg-green-700">+ Tambah</button>
                    </div>
                    <div class="space-y-2 min-h-[50px]">${siangCards || '<p class="text-xs text-slate-400 italic">Belum ada agen</p>'}</div>
                </div>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

async function tambahJadwalModal(hari, sesi) {
    if(allAgents.length === 0) {
        const { data } = await supabaseClient.from('agen').select('*').order('nama');
        allAgents = data || [];
    }

    let optionsHtml = '<select id="swal-agen" class="w-full p-2 border rounded-lg mb-3">';
    allAgents.forEach(a => {
        optionsHtml += `<option value="${a.nama}">${a.nama} (${a.divisi})</option>`;
    });
    optionsHtml += '</select>';
    optionsHtml += `
        <div class="flex items-center gap-2 mt-2">
            <input type="checkbox" id="swal-ispj" class="w-4 h-4">
            <label for="swal-ispj" class="text-sm font-semibold">Tandai sebagai Penanggung Jawab (PJ)</label>
        </div>
    `;

    const { isConfirmed } = await Swal.fire({
        title: `Tambah Agen (${hari} ${sesi})`,
        html: optionsHtml,
        showCancelButton: true,
        confirmButtonText: 'Simpan',
        cancelButtonText: 'Batal'
    });

    if(isConfirmed) {
        showLoader();
        const nama = document.getElementById('swal-agen').value;
        const isPj = document.getElementById('swal-ispj').checked;
        
        await supabaseClient.from('jadwal_master').insert({ hari, sesi, nama_agen: nama, is_pj: isPj });
        await fetchJadwalData();
        hideLoader();
    }
}

async function hapusJadwal(id) {
    if(confirm('Hapus agen ini dari jadwal?')) {
        showLoader();
        await supabaseClient.from('jadwal_master').delete().eq('id', id);
        await fetchJadwalData();
        hideLoader();
    }
}

// ==========================================
// 5. ABSENSI HARIAN LOGIC
// ==========================================
async function bukaModalEkstra() {
    if(allAgents.length === 0) {
        const { data } = await supabaseClient.from('agen').select('*').order('nama');
        allAgents = data || [];
    }

    let optionsHtml = '<select id="swal-ekstra-agen" class="w-full p-2 border rounded-lg mb-3">';
    allAgents.forEach(a => {
        optionsHtml += `<option value="${a.nama}">${a.nama}</option>`;
    });
    optionsHtml += '</select>';
    
    let sesiHtml = `
        <select id="swal-ekstra-sesi" class="w-full p-2 border rounded-lg">
            <option value="Pagi">Sesi Pagi</option>
            <option value="Siang">Sesi Siang</option>
        </select>
    `;

    const { isConfirmed } = await Swal.fire({
        title: 'Hadirkan Agen Ekstra',
        html: optionsHtml + sesiHtml,
        showCancelButton: true,
        confirmButtonText: 'Tandai Hadir',
        cancelButtonText: 'Batal'
    });

    if(isConfirmed) {
        const nama = document.getElementById('swal-ekstra-agen').value;
        const sesi = document.getElementById('swal-ekstra-sesi').value;
        await markAbsen(nama, sesi, 'Hadir', false); // Extra always normal agent
    }
}

let currentSelectedDate = null;

function changeDate() {
    currentSelectedDate = document.getElementById("date-picker").value;
    loadAbsensiToday();
}

async function loadAbsensiToday() {
    showLoader();
    try {
        const now = currentSelectedDate ? new Date(currentSelectedDate) : new Date();
        const namaHari = HARI_MAP[now.getDay()];
        const tglStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        
        document.getElementById('today-date-display').innerText = `${namaHari}, ${now.toLocaleDateString('id-ID')}`;

        if(namaHari === 'Sabtu' || namaHari === 'Minggu') {
            document.getElementById('absensi-table-body').innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-500">Hari Libur. Tidak ada jadwal jaga.</td></tr>`;
            return;
        }

        // 1. Get today's expected schedule
        const { data: schedule } = await supabaseClient.from('jadwal_master').select('*').eq('hari', namaHari);
        
        // 2. Get actual check-ins for today
        const { data: attendance } = await supabaseClient.from('absensi').select('*').eq('tanggal', tglStr);

        let html = '';
        
        if(!schedule || schedule.length === 0) {
            html = `<tr><td colspan="5" class="text-center py-8 text-slate-500">Belum ada jadwal yang diatur untuk hari ${namaHari}. Tambahkan agen di menu Jadwal Master.</td></tr>`;
        } else {
            // Sort: Pagi first, then PJ first
            schedule.sort((a, b) => {
                if(a.sesi !== b.sesi) return a.sesi === 'Pagi' ? -1 : 1;
                return (a.is_pj === b.is_pj) ? 0 : a.is_pj ? -1 : 1;
            });

            // We also need to add "Extra" agents to the list if they are in attendance but not in schedule
            let extraAgents = attendance ? attendance.filter(a => !schedule.find(s => s.nama_agen === a.nama_agen && s.sesi === a.sesi)) : [];
            
            let combinedList = [...schedule, ...extraAgents.map(a => ({ nama_agen: a.nama_agen, sesi: a.sesi, is_pj: a.is_pj, is_extra: true }))];

            combinedList.forEach(jadwal => {
                const absRec = attendance?.find(a => a.nama_agen === jadwal.nama_agen && a.sesi === jadwal.sesi);
                
                let statusHtml = `<span class="text-slate-400 italic text-xs">Belum Hadir</span>`;
                let btnHtml = `
                    <div class="flex justify-center gap-2">
                        <button onclick="markAbsen('${jadwal.nama_agen}', '${jadwal.sesi}', 'Hadir', ${jadwal.is_pj})" class="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm transition-all text-xs font-semibold">
                            Hadir
                        </button>
                        <button onclick="markAbsen('${jadwal.nama_agen}', '${jadwal.sesi}', 'Tidak Hadir', ${jadwal.is_pj})" class="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded shadow-sm transition-all text-xs font-semibold">
                            Bolos
                        </button>
                        <button onclick="markAbsen('${jadwal.nama_agen}', '${jadwal.sesi}', 'Izin', ${jadwal.is_pj})" class="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded shadow-sm transition-all text-xs font-semibold">
                            Izin
                        </button>
                    </div>`;

                if(absRec) {
                    if(absRec.kehadiran === 'Hadir') {
                        statusHtml = `<span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold"><i class="fa-solid fa-check mr-1"></i> ${absRec.waktu_hadir}</span>`;
                        btnHtml = `<button onclick="batalkanAbsen(${absRec.id}, '${jadwal.nama_agen}', '${absRec.tanggal}')" class="px-4 py-1.5 bg-slate-200 hover:bg-red-100 hover:text-red-600 text-slate-500 rounded text-xs font-semibold border border-slate-300 transition-colors">Batalkan Absen</button>`;
                    } else if(absRec.kehadiran === 'Tidak Hadir') {
                        statusHtml = `<span class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">Tidak Hadir (Bolos)</span>`;
                        btnHtml = `<button onclick="batalkanAbsen(${absRec.id}, '${jadwal.nama_agen}', '${absRec.tanggal}')" class="px-4 py-1.5 bg-slate-200 hover:bg-red-100 hover:text-red-600 text-slate-500 rounded text-xs font-semibold border border-slate-300 transition-colors">Batalkan Absen</button>`;
                    } else if(absRec.kehadiran === 'Izin') {
                        statusHtml = `<span class="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-semibold">Izin / Sakit</span>`;
                        btnHtml = `<button onclick="batalkanAbsen(${absRec.id}, '${jadwal.nama_agen}', '${absRec.tanggal}')" class="px-4 py-1.5 bg-slate-200 hover:bg-red-100 hover:text-red-600 text-slate-500 rounded text-xs font-semibold border border-slate-300 transition-colors">Batalkan Absen</button>`;
                    }
                }

                let inisial = jadwal.nama_agen.charAt(0).toUpperCase();
                let subtitle = jadwal.is_extra ? `Agen Ekstra (Back-up)` : (jadwal.is_pj ? `PJ ${jadwal.sesi}` : `Agen ${jadwal.sesi}`);
                let sesiBadge = jadwal.sesi === 'Pagi' 
                    ? `<span class="px-2 py-1 bg-sky-100 text-sky-700 rounded text-xs font-semibold">Pagi</span>`
                    : `<span class="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-semibold">Siang</span>`;
                
                let avatarColor = jadwal.is_extra ? 'bg-emerald-100 text-emerald-700' : (jadwal.is_pj ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700');

                html += `
                <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
                    <td class="px-6 py-4">
                        <div class="flex items-center">
                            <div class="w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center font-bold mr-3 shadow-sm">${inisial}</div>
                            <div>
                                <p class="font-semibold text-slate-800">${jadwal.nama_agen}</p>
                                <p class="text-xs text-slate-500 flex items-center gap-1">${jadwal.is_pj ? '<i class="fa-solid fa-crown text-amber-500 text-[10px]"></i>' : ''} ${subtitle}</p>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 text-slate-600 text-sm">${namaHari}, ${now.toLocaleDateString('id-ID')}</td>
                    <td class="px-6 py-4 text-center">${sesiBadge}</td>
                    <td class="px-6 py-4 text-center">${statusHtml}</td>
                    <td class="px-6 py-4 text-center">${btnHtml}</td>
                </tr>`;
            });
        }
        
        document.getElementById('absensi-table-body').innerHTML = html;
    } catch(e) {
        console.error("Supabase Error:", e);
        document.getElementById('absensi-table-body').innerHTML = "<tr><td colspan='5' class='text-center py-8 text-red-500'>Gagal terhubung ke database. Error: " + (e.message || e.toString() || JSON.stringify(e)) + "<br><br>⚠️ PASTIKAN Anda membuka link dari Vercel, BUKAN klik 2x file index.html di laptop Anda. Fitur keamanan browser memblokir koneksi database jika dibuka secara lokal.</td></tr>";
    } finally {
        hideLoader();
    }
}

async function markAbsen(nama, sesi, status, isPj) {
    showLoader();
    const now = await getWaktuServer();
    const tglStr = currentSelectedDate ? currentSelectedDate : now.toISOString().split('T')[0];
    const waktuStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

    // Insert ke Absensi
    await supabaseClient.from('absensi').insert({
        tanggal: tglStr,
        nama_agen: nama,
        sesi: sesi,
        kehadiran: status,
        waktu_hadir: status === 'Hadir' ? waktuStr : '-',
        is_pj: isPj
    });

    // Hitung Denda Otomatis (Anti-Cheat & Dynamic Schedule)
    if(!isPj && status !== 'Izin') { 
        let kenaDenda = false;
        let nominal = 0;
        
        if(status === 'Tidak Hadir') {
            kenaDenda = true;
            nominal = APP_SETTINGS.nominal_denda_bolos;
        } else if (status === 'Hadir') {
            const jam = now.getHours();
            const menit = now.getMinutes();
            const totalMenit = jam * 60 + menit;
            
            const parseTime = (timeStr) => {
                const parts = timeStr.split(':');
                return parseInt(parts[0]) * 60 + parseInt(parts[1]);
            };
            
            const namaHari = HARI_MAP[new Date(tglStr).getDay()];
            
            // Dapatkan aturan hari ini dari JSON jadwal_harian
            if(APP_SETTINGS.jadwal_harian && APP_SETTINGS.jadwal_harian[namaHari]) {
                const aturanHariIni = APP_SETTINGS.jadwal_harian[namaHari][sesi];
                if(aturanHariIni && aturanHariIni.aktif) {
                    const batasTelat = parseTime(aturanHariIni.mulai) + APP_SETTINGS.toleransi_telat_menit;
                    if(totalMenit > batasTelat) {
                        kenaDenda = true;
                        nominal = APP_SETTINGS.nominal_denda_telat;
                    }
                }
            }
        }

        if(kenaDenda) {
            await supabaseClient.from('denda').insert({
                tanggal: tglStr,
                nama_agen: nama,
                nominal_denda: nominal,
                status_lunas: false
            });
            Swal.fire({ icon: 'warning', title: 'Kena Denda!', text: `Terdata denda Rp ${nominal.toLocaleString('id-ID')}`});
        }
    }

    loadAbsensiToday();
}

async function batalkanAbsen(idAbsensi, nama_agen, tanggal) {
    if(confirm(`Yakin ingin membatalkan absen untuk ${nama_agen}? Denda (jika ada) juga akan dihapus.`)) {
        showLoader();
        // Hapus denda terkait (jika ada)
        await supabaseClient.from('denda').delete().eq('nama_agen', nama_agen).eq('tanggal', tanggal);
        // Hapus absensi
        await supabaseClient.from('absensi').delete().eq('id', idAbsensi);
        loadAbsensiToday();
    }
}

// ==========================================
// 6. REKAP DENDA LOGIC
// ==========================================
async function loadDenda() {
    showLoader();
    try {
        const { data: dendaRecords } = await supabaseClient.from('denda').select('*').order('tanggal', { ascending: false });
        
        let html = '';
        if(!dendaRecords || dendaRecords.length === 0) {
            html = `<tr><td colspan="5" class="text-center py-8 text-slate-500">Belum ada catatan denda. Bagus!</td></tr>`;
        } else {
            dendaRecords.forEach(d => {
                const isLunas = d.status_lunas;
                const statusBadge = isLunas 
                    ? `<span class="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Lunas</span>`
                    : `<span class="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Belum Bayar</span>`;
                
                const btn = isLunas 
                    ? `<button onclick="hapusDenda('${d.id}')" class="text-red-400 hover:text-red-600 px-2 py-1"><i class="fa-solid fa-trash"></i></button>` 
                    : `<button onclick="lunasiDenda('${d.id}')" class="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded text-xs font-medium">Tandai Lunas</button>
                       <button onclick="hapusDenda('${d.id}')" class="text-red-400 hover:text-red-600 px-2 py-1 ml-2"><i class="fa-solid fa-trash"></i></button>`;

                html += `
                <tr class="border-b border-slate-100/50 hover:bg-slate-50 transition-colors">
                    <td class="py-3 px-6">${d.tanggal}</td>
                    <td class="py-3 px-6 font-medium">${d.nama_agen}</td>
                    <td class="py-3 px-6 font-mono text-red-600 font-bold">Rp ${d.nominal_denda.toLocaleString('id-ID')}</td>
                    <td class="py-3 px-6">${statusBadge}</td>
                    <td class="py-3 px-6 text-right">${btn}</td>
                </tr>`;
            });
        }
        document.getElementById('denda-table-body').innerHTML = html;
    } catch(e) {
        console.error(e);
    } finally {
        hideLoader();
    }
}

async function lunasiDenda(id) {
    showLoader();
    await supabaseClient.from('denda').update({ status_lunas: true }).eq('id', id);
    loadDenda();
}

async function hapusDenda(id) {
    if(confirm('Hapus record denda ini?')) {
        showLoader();
        await supabaseClient.from('denda').delete().eq('id', id);
        loadDenda();
    }
}

// ==========================================
// UTILS
// ==========================================
function showLoader() { 
    const el = document.getElementById('global-loader');
    if(el) el.classList.remove('hidden'); 
}
function hideLoader() { 
    const el = document.getElementById('global-loader');
    if(el) el.classList.add('hidden'); 
}

// Init first load
document.addEventListener('DOMContentLoaded', () => {
    switchTab('dashboard');
});

// ==========================================
// 7. DAFTAR AGEN LOGIC
// ==========================================
async function loadAgen() {
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
}


// ==========================================
// 8. GLOBAL SEARCH LOGIC
// ==========================================
function handleSearch() {
    const input = document.getElementById('global-search');
    if(!input) return;
    
    const filter = input.value.toLowerCase();
    
    // 1. Search in Absensi Table
    const absensiRows = document.querySelectorAll('#absensi-table-body tr');
    absensiRows.forEach(row => {
        const nameCell = row.querySelector('.font-semibold.text-slate-800');
        if(nameCell) {
            const name = nameCell.textContent.toLowerCase();
            row.style.display = name.includes(filter) ? '' : 'none';
        }
    });

    // 2. Search in Daftar Agen Table
    const agenGroups = document.querySelectorAll('#agen-container .searchable-group');
    agenGroups.forEach(group => {
        const rows = group.querySelectorAll('.searchable-row');
        let hasVisibleRow = false;
        rows.forEach(row => {
            const nameCell = row.querySelector('.searchable-name');
            if(nameCell) {
                const name = nameCell.textContent.toLowerCase();
                const match = name.includes(filter);
                row.style.display = match ? '' : 'none';
                if(match) hasVisibleRow = true;
            }
        });
        // Hide the whole group (division card) if no one matches inside it
        group.style.display = hasVisibleRow ? '' : 'none';
    });

    // 3. Search in Denda Table
    const dendaRows = document.querySelectorAll('#denda-table-body tr');
    dendaRows.forEach(row => {
        const nameCell = row.querySelectorAll('td')[1]; // 2nd column is Nama Agen
        if(nameCell) {
            const name = nameCell.textContent.toLowerCase();
            row.style.display = name.includes(filter) ? '' : 'none';
        }
    });
}


// ==========================================
// 9. PENGATURAN LOGIC
// ==========================================
function loadSettingsUI() {
    // Basic Settings
    document.getElementById('set-toleransi').value = APP_SETTINGS.toleransi_telat_menit;
    document.getElementById('set-denda-telat').value = APP_SETTINGS.nominal_denda_telat;
    document.getElementById('set-denda-bolos').value = APP_SETTINGS.nominal_denda_bolos;
    
    // Dynamic Schedule
    let html = '';
    const harian = APP_SETTINGS.jadwal_harian || {};
    
    HARI_LIST.forEach(hari => {
        const p = harian[hari]?.Pagi || { aktif: true, mulai: '10:00' };
        const s = harian[hari]?.Siang || { aktif: true, mulai: '13:30' };
        
        html += `
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
            <div class="w-24 font-bold text-slate-700 text-lg">${hari}</div>
            
            <div class="flex-1 bg-blue-50/50 p-2 rounded border border-blue-100 flex items-center gap-2">
                <input type="checkbox" id="cb-pagi-${hari}" ${p.aktif ? 'checked' : ''} class="w-4 h-4">
                <label class="text-sm font-semibold text-blue-700 w-12">PAGI</label>
                <input type="time" id="jam-pagi-${hari}" value="${p.mulai.substring(0,5)}" class="p-1 text-sm border rounded w-full">
            </div>
            
            <div class="flex-1 bg-orange-50/50 p-2 rounded border border-orange-100 flex items-center gap-2">
                <input type="checkbox" id="cb-siang-${hari}" ${s.aktif ? 'checked' : ''} class="w-4 h-4">
                <label class="text-sm font-semibold text-orange-700 w-12">SIANG</label>
                <input type="time" id="jam-siang-${hari}" value="${s.mulai.substring(0,5)}" class="p-1 text-sm border rounded w-full">
            </div>
        </div>
        `;
    });
    
    document.getElementById('settings-days-container').innerHTML = html;
}

async function simpanPengaturan() {
    showLoader();
    
    let newJadwal = {};
    HARI_LIST.forEach(hari => {
        newJadwal[hari] = {
            Pagi: {
                aktif: document.getElementById(`cb-pagi-${hari}`).checked,
                mulai: document.getElementById(`jam-pagi-${hari}`).value + (document.getElementById(`jam-pagi-${hari}`).value.length === 5 ? ':00' : '')
            },
            Siang: {
                aktif: document.getElementById(`cb-siang-${hari}`).checked,
                mulai: document.getElementById(`jam-siang-${hari}`).value + (document.getElementById(`jam-siang-${hari}`).value.length === 5 ? ':00' : '')
            }
        };
    });

    const newData = {
        toleransi_telat_menit: parseInt(document.getElementById('set-toleransi').value),
        nominal_denda_telat: parseInt(document.getElementById('set-denda-telat').value),
        nominal_denda_bolos: parseInt(document.getElementById('set-denda-bolos').value),
        jadwal_harian: newJadwal
    };
    
    try {
        await supabaseClient.from('pengaturan_sistem').update(newData).eq('id', 1);
        APP_SETTINGS = newData;
        Swal.fire({ icon: 'success', title: 'Tersimpan!', text: 'Pengaturan jadwal dinamis berhasil diperbarui.', timer: 2000, showConfirmButton: false });
    } catch(e) {
        alert('Gagal menyimpan pengaturan.');
    } finally {
        hideLoader();
    }
}

// ==========================================
// 10. EXPORT CSV LOGIC
// ==========================================
async function exportToCSV(table) {
    showLoader();
    try {
        const { data } = await supabaseClient.from(table).select('*');
        if(!data || data.length === 0) {
            Swal.fire('Data Kosong', `Tidak ada data di tabel ${table} untuk di-export.`, 'info');
            return;
        }

        const headers = Object.keys(data[0]);
        const csvRows = [];
        
        // Add Headers
        csvRows.push(headers.join(','));
        
        // Add Data
        for(const row of data) {
            const values = headers.map(header => {
                const val = row[header] !== null ? row[header].toString() : '';
                return `"${val.replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(','));
        }
        
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `Export_${table}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
    } catch(e) {
        console.error(e);
        alert('Gagal mengekspor data.');
    } finally {
        hideLoader();
    }
}
