// ==========================================
    
    // ==========================================
    


    

    
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

    let allAgents = [];
    let allJadwal = [];
    const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

    setInterval(() => {
        const now = new Date();
        document.getElementById('live-clock').innerText = now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' }) + " WIB";
    }, 1000);

    // ==========================================
    // 3. UI TAB NAVIGATION
    // ==========================================
    function switchTab(tabId) {
        ['dashboard', 'absensi', 'jadwal', 'denda'].forEach(id => {
            document.getElementById(`sec-${id}`).classList.add('hidden');
            let btn = document.getElementById(`tab-${id}`);
            btn.className = "w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-xl transition-all";
        });
        
        document.getElementById(`sec-${tabId}`).classList.remove('hidden');
        let activeBtn = document.getElementById(`tab-${tabId}`);
        activeBtn.className = "w-full flex items-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-xl transition-all shadow-md";
        
        const titles = { 'absensi': 'Absensi Harian', 'jadwal': 'Jadwal Master (Kanban)', 'denda': 'Rekap Denda Kasir' };
        document.getElementById('page-title').innerText = titles[tabId];

        if(tabId === 'absensi') loadAbsensiToday();
        if(tabId === 'jadwal') loadKanban();
        if(tabId === 'denda') loadDenda();
        if(tabId === 'dashboard') loadDashboard();
    }

    // ==========================================
    // 4. KANBAN (JADWAL MASTER) LOGIC
    // ==========================================
    async function loadKanban() {
        showLoader();
        
        // Fetch Agents
        const resAgen = await supabase.from('agen').select('*');
        allAgents = resAgen.data || [];
        
        // Fetch Jadwal
        const resJadwal = await supabase.from('jadwal_master').select('*');
        allJadwal = resJadwal.data || [];
        
        renderKanbanUI();
        hideLoader();
    }

    function renderKanbanUI() {
        const poolDiv = document.getElementById('pool-agen');
        const daysContainer = document.getElementById('kanban-days-container');
        
        poolDiv.innerHTML = '';
        daysContainer.innerHTML = '';

        // Find assigned agents
        let assignedNames = new Set(allJadwal.map(j => j.nama_agen));

        // Render unassigned to pool
        allAgents.forEach(a => {
            if(!assignedNames.has(a.nama)) {
                poolDiv.appendChild(createAgentCard(a.nama, a.divisi));
            }
        });

        // Render Columns for each day
        HARI_LIST.forEach(hari => {
            let colHTML = `
            <div class="w-80 bg-white rounded-2xl flex flex-col flex-shrink-0 h-[650px] border border-slate-200 shadow-sm">
                <div class="p-4 border-b border-slate-100 bg-slate-50 text-center rounded-t-2xl">
                    <h4 class="font-bold text-slate-800">${hari}</h4>
                </div>
                <div class="flex-1 overflow-y-auto p-3 space-y-4 bg-slate-50/50">
                    
                    <!-- SESI PAGI -->
                    <div class="bg-blue-50/50 rounded-xl border border-blue-100 p-3">
                        <div class="text-xs font-bold text-blue-600 mb-2 uppercase flex justify-between">
                            <span>Sesi Pagi</span> <span>10:00 - 12:30</span>
                        </div>
                        <div class="text-xs text-slate-500 mb-1">PJ Pagi (Maks 1):</div>
                        <div id="pj-pagi-${hari}" class="pj-zone rounded-lg p-2 mb-2 flex flex-col gap-2" data-hari="${hari}" data-sesi="Pagi" data-ispj="true"></div>
                        
                        <div class="text-xs text-slate-500 mb-1 mt-2">Agen Pagi:</div>
                        <div id="agen-pagi-${hari}" class="min-h-[50px] rounded-lg p-2 flex flex-col gap-2 bg-white/50 border border-dashed border-slate-300" data-hari="${hari}" data-sesi="Pagi" data-ispj="false"></div>
                    </div>

                    <!-- SESI SIANG -->
                    <div class="bg-green-50/50 rounded-xl border border-green-100 p-3">
                        <div class="text-xs font-bold text-green-600 mb-2 uppercase flex justify-between">
                            <span>Sesi Siang</span> <span>13:30 - 16:00</span>
                        </div>
                        <div class="text-xs text-slate-500 mb-1">PJ Siang (Maks 1):</div>
                        <div id="pj-siang-${hari}" class="pj-zone rounded-lg p-2 mb-2 flex flex-col gap-2" data-hari="${hari}" data-sesi="Siang" data-ispj="true"></div>
                        
                        <div class="text-xs text-slate-500 mb-1 mt-2">Agen Siang:</div>
                        <div id="agen-siang-${hari}" class="min-h-[50px] rounded-lg p-2 flex flex-col gap-2 bg-white/50 border border-dashed border-slate-300" data-hari="${hari}" data-sesi="Siang" data-ispj="false"></div>
                    </div>

                </div>
            </div>`;
            
            daysContainer.insertAdjacentHTML('beforeend', colHTML);

            // Populate existing data
            const dayJadwal = allJadwal.filter(j => j.hari === hari);
            dayJadwal.forEach(j => {
                let targetId = j.is_pj ? `pj-${j.sesi.toLowerCase()}-${hari}` : `agen-${j.sesi.toLowerCase()}-${hari}`;
                const agenData = allAgents.find(a => a.nama === j.nama_agen);
                const divisi = agenData ? agenData.divisi : '';
                document.getElementById(targetId).appendChild(createAgentCard(j.nama_agen, divisi, j.is_pj));
            });
        });

        initSortable();
    }

    function createAgentCard(nama, divisi, isPj = false) {
        let div = document.createElement('div');
        div.className = "bg-white p-3 rounded-lg border border-slate-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-400 transition-colors flex flex-col";
        div.setAttribute('data-nama', nama);
        div.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="font-medium text-slate-700 text-sm">${nama}</span>
                <i class="fa-solid fa-grip-vertical text-slate-300"></i>
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded-full mt-2 w-max ${divisi.includes('Inti') ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}">${divisi}</span>
        `;
        return div;
    }

    function initSortable() {
        Sortable.create(document.getElementById('pool-agen'), { group: 'shared', animation: 150, ghostClass: 'drag-ghost' });
        
        HARI_LIST.forEach(hari => {
            ['pagi', 'siang'].forEach(sesi => {
                // PJ Zone (Max 1)
                Sortable.create(document.getElementById(`pj-${sesi}-${hari}`), {
                    group: { name: 'shared', put: function (to) { return to.el.children.length < 1; } },
                    animation: 150, ghostClass: 'drag-ghost'
                });
                // Normal Zone
                Sortable.create(document.getElementById(`agen-${sesi}-${hari}`), {
                    group: 'shared', animation: 150, ghostClass: 'drag-ghost'
                });
            });
        });
    }

    async function saveJadwalToDB() {
        const btn = document.getElementById('btn-save-jadwal');
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...`;
        
        let newSchedules = [];
        HARI_LIST.forEach(hari => {
            ['pagi', 'siang'].forEach(sesi => {
                const s = sesi === 'pagi' ? 'Pagi' : 'Siang';
                
                // Get PJ
                const pjZone = document.getElementById(`pj-${sesi}-${hari}`);
                if(pjZone.children.length > 0) {
                    newSchedules.push({ hari: hari, sesi: s, nama_agen: pjZone.children[0].getAttribute('data-nama'), is_pj: true });
                }
                
                // Get Agents
                const agenZone = document.getElementById(`agen-${sesi}-${hari}`);
                Array.from(agenZone.children).forEach(card => {
                    newSchedules.push({ hari: hari, sesi: s, nama_agen: card.getAttribute('data-nama'), is_pj: false });
                });
            });
        });

        // 1. Delete all existing master schedules
        await supabase.from('jadwal_master').delete().neq('hari', 'INVALID');
        
        // 2. Insert new
        if(newSchedules.length > 0) {
            await supabase.from('jadwal_master').insert(newSchedules);
        }

        btn.innerHTML = `<i class="fa-solid fa-check"></i> Tersimpan!`;
        setTimeout(() => { btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Simpan Permanen`; }, 2000);
        Swal.fire({ icon: 'success', title: 'Tersimpan', text: 'Jadwal berhasil diperbarui di database.', timer: 2000, showConfirmButton: false });
    }


    
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

    // ==========================================
    // 5. ABSENSI HARIAN LOGIC
    // ==========================================
    const HARI_MAP = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    
    async function loadAbsensiToday() {
        showLoader();
        const now = new Date();
        const namaHari = HARI_MAP[now.getDay()];
        const tglStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        
        document.getElementById('today-date-display').innerText = `${namaHari}, ${now.toLocaleDateString('id-ID')}`;

        if(namaHari === 'Sabtu' || namaHari === 'Minggu') {
            document.getElementById('absensi-table-body').innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-500">Hari Libur. Tidak ada jadwal jaga.</td></tr>`;
            hideLoader(); return;
        }

        // 1. Get today's expected schedule from Jadwal Master
        const { data: schedule } = await supabase.from('jadwal_master').select('*').eq('hari', namaHari);
        
        // 2. Get actual check-ins for today
        const { data: attendance } = await supabase.from('absensi').select('*').eq('tanggal', tglStr);

        let html = '';
        
        if(!schedule || schedule.length === 0) {
            html = `<tr><td colspan="5" class="text-center py-8 text-slate-500">Belum ada jadwal yang diatur untuk hari ${namaHari}.</td></tr>`;
        } else {
            // Sort: Pagi first, then PJ first
            schedule.sort((a, b) => {
                if(a.sesi !== b.sesi) return a.sesi === 'Pagi' ? -1 : 1;
                return (a.is_pj === b.is_pj) ? 0 : a.is_pj ? -1 : 1;
            });

            schedule.forEach(jadwal => {
                const absRec = attendance?.find(a => a.nama_agen === jadwal.nama_agen && a.sesi === jadwal.sesi);
                
                let statusHtml = `<span class="text-slate-400 italic text-xs">Belum Hadir</span>`;
                let btnHtml = `
                    <div class="flex justify-center gap-2">
                        <button onclick="markAbsen('${jadwal.nama_agen}', '${jadwal.sesi}', 'Hadir', ${jadwal.is_pj})" class="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm transition-all text-xs font-semibold">
                            Klik Hadir
                        </button>
                        <button onclick="markAbsen('${jadwal.nama_agen}', '${jadwal.sesi}', 'Tidak Hadir', ${jadwal.is_pj})" class="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded shadow-sm transition-all text-xs font-semibold">
                            Bolos
                        </button>
                    </div>`;

                if(absRec) {
                    if(absRec.kehadiran === 'Hadir') {
                        statusHtml = `<span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold"><i class="fa-solid fa-check mr-1"></i> ${absRec.waktu_hadir}</span>`;
                        btnHtml = `<button disabled class="px-4 py-1.5 bg-slate-100 text-slate-400 rounded cursor-not-allowed text-xs font-semibold border border-slate-200">Sudah Absen</button>`;
                    } else if(absRec.kehadiran === 'Tidak Hadir') {
                        statusHtml = `<span class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">Tidak Hadir</span>`;
                        btnHtml = `<button disabled class="px-4 py-1.5 bg-slate-100 text-slate-400 rounded cursor-not-allowed text-xs font-semibold border border-slate-200">Sudah Absen</button>`;
                    }
                }

                let inisial = jadwal.nama_agen.charAt(0).toUpperCase();
                let subtitle = jadwal.is_pj ? `PJ ${jadwal.sesi}` : `Agen ${jadwal.sesi}`;
                let sesiBadge = jadwal.sesi === 'Pagi' 
                    ? `<span class="px-2 py-1 bg-sky-100 text-sky-700 rounded text-xs font-semibold">Pagi</span>`
                    : `<span class="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-semibold">Siang</span>`;
                
                let avatarColor = jadwal.is_pj ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700';

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
        document.getElementById('absensi-table-body').innerHTML = "<tr><td colspan='5' class='text-center py-8 text-red-500'>Gagal terhubung ke database. Ini normal jika dijalankan secara lokal (file://). Silakan hosting ke Vercel.</td></tr>";
    } finally {
        hideLoader();
    }
}

    async function markAbsen(nama, sesi, status, isPj) {
        showLoader();
        const now = new Date();
        const tglStr = now.toISOString().split('T')[0];
        const waktuStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

        // Insert ke Absensi
        await supabase.from('absensi').insert({
            tanggal: tglStr,
            nama_agen: nama,
            sesi: sesi,
            kehadiran: status,
            waktu_hadir: status === 'Hadir' ? waktuStr : '-',
            is_pj: isPj
        });

        // Hitung Denda Otomatis!
        if(!isPj) { // BPH/PJ tidak kena denda sesuai rule Excel
            let kenaDenda = false;
            let nominal = 0;
            
            if(status === 'Tidak Hadir') {
                kenaDenda = true;
                nominal = APP_SETTINGS.nominal_denda_bolos;
            } else if (status === 'Hadir') {
                // Cek Telat Dinamis dari APP_SETTINGS
                const jam = now.getHours();
                const menit = now.getMinutes();
                const totalMenit = jam * 60 + menit;
                
                const parseTime = (timeStr) => {
                    const parts = timeStr.split(':');
                    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
                };
                
                const batasPagi = parseTime(APP_SETTINGS.jam_mulai_pagi) + APP_SETTINGS.toleransi_telat_menit;
                const batasSiang = parseTime(APP_SETTINGS.jam_mulai_siang) + APP_SETTINGS.toleransi_telat_menit;

                if(sesi === 'Pagi' && totalMenit > batasPagi) { kenaDenda = true; nominal = APP_SETTINGS.nominal_denda_telat; }
                if(sesi === 'Siang' && totalMenit > batasSiang) { kenaDenda = true; nominal = APP_SETTINGS.nominal_denda_telat; }
            }

            if(kenaDenda) {
                await supabase.from('denda').insert({
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

    // ==========================================
    // 6. REKAP DENDA LOGIC
    // ==========================================
    async function loadDenda() {
        showLoader();
        const { data: dendaRecords } = await supabase.from('denda').select('*').order('tanggal', { ascending: false });
        
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
                    ? '' 
                    : `<button onclick="lunasiDenda('${d.id}')" class="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded text-xs font-medium">Tandai Lunas</button>`;

                html += `
                <tr class="border-b border-slate-100/50 hover:bg-slate-50">
                    <td class="py-3 px-6">${d.tanggal}</td>
                    <td class="py-3 px-6 font-medium">${d.nama_agen}</td>
                    <td class="py-3 px-6 font-mono text-red-600">Rp ${d.nominal_denda.toLocaleString('id-ID')}</td>
                    <td class="py-3 px-6">${statusBadge}</td>
                    <td class="py-3 px-6 text-right">${btn}</td>
                </tr>`;
            });
        }
        document.getElementById('denda-table-body').innerHTML = html;
        hideLoader();
    }

    async function lunasiDenda(id) {
        showLoader();
        await supabase.from('denda').update({ status_lunas: true }).eq('id', id);
        loadDenda();
    }

    // ==========================================
    // UTILS
    // ==========================================
    function showLoader() { document.getElementById('global-loader').classList.remove('hidden'); }
    function hideLoader() { document.getElementById('global-loader').classList.add('hidden'); }

    // Init first load
    document.addEventListener('DOMContentLoaded', () => {
        switchTab('dashboard');
    });