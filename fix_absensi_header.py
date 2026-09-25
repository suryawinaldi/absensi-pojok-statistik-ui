import os
import re

html_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# I will find the whole div container for the header of sec-absensi
pattern = r'(<section id="sec-absensi" class="max-w-5xl mx-auto space-y-6 hidden">\s*<div class="glass-panel p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">.*?)(?=\s*<div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">)'

match = re.search(pattern, html, re.DOTALL)
if match:
    old_header = match.group(1)
    new_header = '''<section id="sec-absensi" class="max-w-5xl mx-auto space-y-6 hidden">
                <div class="glass-panel p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-center border border-slate-100">
                    <div class="flex items-center gap-4">
                        <div class="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-3xl shadow-sm">
                            <i class="fa-solid fa-calendar-check"></i>
                        </div>
                        <div>
                            <div class="flex items-center gap-3">
                                <h2 class="text-3xl font-black text-slate-800" id="today-date-display">Jumat, 25/9/2026</h2>
                                <input type="date" id="date-picker" onchange="changeDate()" class="border border-slate-300 rounded px-2 py-1 text-sm text-slate-600 focus:outline-blue-500 bg-slate-50 cursor-pointer shadow-sm">
                            </div>
                            <p class="text-slate-500 mt-1">Sistem membaca jadwal secara otomatis dari Master Jadwal.</p>
                        </div>
                    </div>
                    <div class="flex gap-3 mt-4 md:mt-0">
                        <button onclick="exportToCSV('absensi')" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-2">
                            <i class="fa-solid fa-file-excel"></i> Export CSV
                        </button>
                        <button onclick="bukaModalEkstra()" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-2">
                            <i class="fa-solid fa-user-plus"></i> Agen Ekstra
                        </button>
                        <button onclick="loadAbsensiToday()" class="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-2">
                            <i class="fa-solid fa-rotate-right"></i> Refresh
                        </button>
                    </div>
                </div>'''
    html = html.replace(old_header, new_header)
    
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print("Fixed Absensi Header (Date Picker, Icon, Export Button)")
else:
    print("Pattern not found!")
