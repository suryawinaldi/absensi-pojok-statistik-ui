import os
import re

html_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/index.html'
js_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/js/app.js'

# 1. Update index.html for search bar and Daftar Agen container
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Fix search input
old_search = '<input type="text" placeholder="Cari nama agen..." class="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 text-sm">'
new_search = '<input type="text" id="global-search" onkeyup="handleSearch()" placeholder="Cari nama agen..." class="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 text-sm">'
html = html.replace(old_search, new_search)

# Fix Daftar Agen container
old_agen_sec = '''<div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-sm whitespace-nowrap">
                            <thead class="bg-slate-50 text-slate-600 border-b border-slate-200">
                                <tr>
                                    <th class="py-4 px-6 font-semibold">Nama Agen</th>
                                    <th class="py-4 px-6 font-semibold text-center">Divisi</th>
                                    <th class="py-4 px-6 font-semibold text-center">Status BPH</th>
                                </tr>
                            </thead>
                            <tbody id="agen-table-body" class="divide-y divide-slate-100">
                                <!-- Loaded via JS -->
                            </tbody>
                        </table>
                    </div>
                </div>'''

new_agen_sec = '''<div id="agen-container" class="space-y-8">
                    <!-- Loaded via JS -->
                </div>'''
html = html.replace(old_agen_sec, new_agen_sec)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)


# 2. Update app.js
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Replace loadAgen logic to group by divisi
old_load_agen = '''// ==========================================
// 7. DAFTAR AGEN LOGIC
// ==========================================
async function loadAgen() {
    showLoader();
    try {
        const { data } = await supabase.from('agen').select('*').order('divisi').order('nama');
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

new_load_agen = '''// ==========================================
// 7. DAFTAR AGEN LOGIC
// ==========================================
async function loadAgen() {
    showLoader();
    try {
        const { data } = await supabase.from('agen').select('*').order('divisi').order('nama');
        let html = '';
        if(data && data.length > 0) {
            // Group by divisi
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
        document.getElementById('agen-container').innerHTML = html;
    } catch(e) { console.error(e); } finally { hideLoader(); }
}'''

js = js.replace(old_load_agen, new_load_agen)

# 3. Add search logic
search_func = '''
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
'''
js = js + '\n' + search_func

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
    
print("Updated search and grouped table")
