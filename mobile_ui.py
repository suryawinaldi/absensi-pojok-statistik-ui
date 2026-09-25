import os
import re

html_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/index.html'
js_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/js/app.js'

with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update <aside> classes for mobile responsiveness
old_aside = '<aside class="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-20 hidden md:flex transition-all duration-300">'
new_aside = '''
<!-- Mobile Overlay Backdrop -->
<div id="mobile-overlay" onclick="toggleSidebar()" class="fixed inset-0 bg-slate-900/50 z-40 hidden md:hidden transition-opacity opacity-0"></div>

<!-- Sidebar -->
<aside id="main-sidebar" class="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-50 fixed inset-y-0 left-0 transform -translate-x-full md:relative md:translate-x-0 transition-transform duration-300 ease-in-out">
'''

# We also need to add an X button on mobile to close the sidebar easily
old_logo_area = '''<!-- Logo Area -->
        <div class="h-20 flex items-center px-6 border-b border-slate-800">'''
new_logo_area = '''<!-- Logo Area -->
        <div class="h-20 flex items-center px-6 border-b border-slate-800 justify-between">
            <div class="flex items-center">'''

old_logo_end = '''<p class="text-xs text-slate-400">Absensi & Penjadwalan</p>
            </div>
        </div>'''
new_logo_end = '''<p class="text-xs text-slate-400">Absensi & Penjadwalan</p>
            </div>
            </div>
            <button onclick="toggleSidebar()" class="md:hidden text-slate-400 hover:text-white p-2">
                <i class="fa-solid fa-xmark text-xl"></i>
            </button>
        </div>'''

# 2. Update Header to include Hamburger button
old_header = '''<header class="bg-white border-b border-slate-200 h-20 flex items-center justify-between px-8 flex-shrink-0 z-10">
            <div>
                <h2 id="page-title" class="text-2xl font-bold text-slate-800">Absensi Harian</h2>
                <p class="text-sm text-slate-500">Catat kehadiran agen yang bertugas hari ini.</p>
            </div>'''
            
new_header = '''<header class="bg-white border-b border-slate-200 h-20 flex items-center justify-between px-4 md:px-8 flex-shrink-0 z-10">
            <div class="flex items-center gap-4">
                <button onclick="toggleSidebar()" class="md:hidden p-2 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg">
                    <i class="fa-solid fa-bars text-xl"></i>
                </button>
                <div>
                    <h2 id="page-title" class="text-xl md:text-2xl font-bold text-slate-800">Absensi Harian</h2>
                    <p class="text-xs md:text-sm text-slate-500 hidden sm:block">Catat kehadiran agen yang bertugas hari ini.</p>
                </div>
            </div>'''

if old_aside in html:
    html = html.replace(old_aside, new_aside)
    html = html.replace(old_logo_area, new_logo_area)
    html = html.replace(old_logo_end, new_logo_end)
    html = html.replace(old_header, new_header)
    
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print("HTML updated for mobile sidebar")
else:
    print("old_aside not found")

# 3. Add JS function for toggleSidebar and modify switchTab to auto-close on mobile
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

toggle_js = '''
// ==========================================
// MOBILE SIDEBAR LOGIC
// ==========================================
function toggleSidebar() {
    const sidebar = document.getElementById('main-sidebar');
    const overlay = document.getElementById('mobile-overlay');
    
    if(sidebar.classList.contains('-translate-x-full')) {
        // Open
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.remove('opacity-0'), 10);
    } else {
        // Close
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }
}
'''
if "MOBILE SIDEBAR LOGIC" not in js:
    js = js.replace('// Init first load', toggle_js + '\n// Init first load')

# Auto close sidebar when a tab is clicked
old_switch = "if(tabId === 'pengaturan') loadSettingsUI();"
new_switch = "if(tabId === 'pengaturan') loadSettingsUI();\n    \n    // Auto close sidebar on mobile after clicking a tab\n    if(window.innerWidth < 768) {\n        const sidebar = document.getElementById('main-sidebar');\n        if(sidebar && !sidebar.classList.contains('-translate-x-full')) toggleSidebar();\n    }"

if "Auto close sidebar" not in js:
    js = js.replace(old_switch, new_switch)
    
with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
print("JS updated for mobile sidebar toggle")
