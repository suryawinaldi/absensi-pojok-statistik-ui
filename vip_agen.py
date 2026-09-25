import os
import re

js_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/js/app.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Replace the loadAgen logic
old_load_agen_pattern = r'(async function loadAgen\(\) \{.*?document\.getElementById\(\'agen-container\'\);\s*if\(container\) container\.innerHTML = html;\s*\} catch\(e\) \{ console\.error\(e\); \} finally \{ hideLoader\(\); \}\s*\})'
match = re.search(old_load_agen_pattern, js, re.DOTALL)

if match:
    old_load_agen = match.group(1)
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

            // Jabatan Mapping for Pengurus Inti
            const titleMap = {
                'Taslim': 'Ketua Agen',
                'Evans': 'Wakil Ketua',
                'Azka Tsabbita': 'Sekretaris & Bendahara',
                'Azmy': 'Koord. Media Kreatif',
                'Aslif': 'Koord. Analisis & Pelayanan'
            };

            const piDivisiName = Object.keys(grouped).find(k => k.toLowerCase().includes('pengurus inti') || k.toLowerCase() === 'pi');
            
            const renderGroup = (divisi, isPI) => {
                let cardsHtml = `
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden searchable-group">
                    <div class="${isPI ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'} px-6 py-4 border-b flex items-center gap-3">
                        <div class="w-10 h-10 ${isPI ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'} rounded-xl flex items-center justify-center font-bold shadow-sm">
                            <i class="fa-solid ${isPI ? 'fa-crown' : 'fa-layer-group'}"></i>
                        </div>
                        <h4 class="text-lg font-black ${isPI ? 'text-amber-800' : 'text-slate-800'}">${isPI ? 'Pengurus Inti (PI)' : 'Divisi ' + divisi}</h4>
                        <span class="ml-auto bg-white border border-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-bold shadow-sm">${grouped[divisi].length} Agen</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-sm whitespace-nowrap">
                            <thead class="${isPI ? 'text-amber-700 bg-amber-50/30' : 'text-slate-500 bg-white'} border-b border-slate-100 text-xs">
                                <tr>
                                    <th class="py-3 px-6 font-semibold">NAMA AGEN</th>
                                    <th class="py-3 px-6 font-semibold text-center w-64">${isPI ? 'JABATAN KHUSUS' : 'STATUS DIVISI'}</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                `;
                
                let agents = grouped[divisi];
                if(isPI) {
                    const rank = {'Taslim': 1, 'Evans': 2, 'Azka Tsabbita': 3, 'Azmy': 4, 'Aslif': 5};
                    agents.sort((a,b) => {
                        let rA = 99; let rB = 99;
                        for(const name in rank) { if(a.nama.includes(name)) rA = rank[name]; if(b.nama.includes(name)) rB = rank[name]; }
                        return rA - rB;
                    });
                }

                agents.forEach(a => {
                    let badge = '';
                    if(isPI) {
                        let jabatan = 'Pengurus Inti';
                        for(const name in titleMap) {
                            if(a.nama.includes(name)) jabatan = titleMap[name];
                        }
                        badge = `<span class="bg-amber-100 text-amber-800 border border-amber-200 px-4 py-1.5 rounded-full text-xs font-black shadow-sm">${jabatan}</span>`;
                    } else {
                        badge = a.is_bph ? '<span class="bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs font-bold"><i class="fa-solid fa-star mr-1"></i> BPH</span>' : '<span class="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-medium">Anggota</span>';
                    }

                    cardsHtml += `
                                <tr class="hover:bg-slate-50 transition-colors searchable-row">
                                    <td class="px-6 py-4 font-bold text-slate-700 searchable-name text-base">${a.nama}</td>
                                    <td class="px-6 py-4 text-center">${badge}</td>
                                </tr>
                    `;
                });
                
                cardsHtml += `
                            </tbody>
                        </table>
                    </div>
                </div>
                `;
                return cardsHtml;
            };

            // Render PI first
            if (piDivisiName) {
                html += renderGroup(piDivisiName, true);
            }

            // Render rest
            for (const divisi in grouped) {
                if (divisi !== piDivisiName) {
                    html += renderGroup(divisi, false);
                }
            }
        } else {
            html = '<p class="text-slate-500 text-center py-8 font-semibold">Belum ada agen terdaftar di sistem.</p>';
        }
        
        const container = document.getElementById('agen-container');
        if(container) container.innerHTML = html;
        
    } catch(e) { console.error(e); } finally { hideLoader(); }
}'''
    js = js.replace(old_load_agen, new_load_agen)
    
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write(js)
    print("Daftar agen updated with Pengurus Inti VIP treatment")
else:
    print("Could not find loadAgen function")
