import re

js_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/js/app.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Remove Hall of Shame logic
js = re.sub(r'// Malas.*?document\.getElementById\(\'dash-leaderboard-malas\'\)\.innerHTML = htmlMalas;', '', js, flags=re.DOTALL)

# 2. Replace KANBAN Logic with SEARCH & TAG
new_jadwal_logic = """
    // ==========================================
    // 4. JADWAL MASTER (SEARCH & TAG) LOGIC
    // ==========================================
    async function loadKanban() {
        showLoader();
        const resAgen = await supabase.from('agen').select('*').order('nama');
        allAgents = resAgen.data || [];
        
        await fetchJadwalData();
        hideLoader();
    }

    async function fetchJadwalData() {
        const resJadwal = await supabase.from('jadwal_master').select('*');
        allJadwal = resJadwal.data || [];
        renderJadwalUI();
    }

    function renderJadwalUI() {
        const container = document.getElementById('jadwal-days-container');
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
            
            await supabase.from('jadwal_master').insert({ hari, sesi, nama_agen: nama, is_pj: isPj });
            await fetchJadwalData();
            hideLoader();
        }
    }

    async function hapusJadwal(id) {
        if(confirm('Hapus agen ini dari jadwal?')) {
            showLoader();
            await supabase.from('jadwal_master').delete().eq('id', id);
            await fetchJadwalData();
            hideLoader();
        }
    }
"""
js = re.sub(r'// ==========================================\s*// 4\. KANBAN \(JADWAL MASTER\) LOGIC.*?// ==========================================\s*// 5\. ABSENSI HARIAN LOGIC', new_jadwal_logic + '\n    // ==========================================\n    // 5. ABSENSI HARIAN LOGIC', js, flags=re.DOTALL)


# 3. Add bukaModalEkstra() logic to ABSENSI LOGIC
ekstra_logic = """
    async function bukaModalEkstra() {
        if(allAgents.length === 0) {
            const { data } = await supabase.from('agen').select('*').order('nama');
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
"""
js = js.replace('async function loadAbsensiToday() {', ekstra_logic + '\n    async function loadAbsensiToday() {')


with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
print('Phase 3 logic implemented')
