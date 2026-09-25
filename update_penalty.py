import os
import re

js_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/js/app.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Replace the hardcoded denda logic with dynamic ones based on APP_SETTINGS
old_denda_logic = """
                // Cek Telat
                const jam = now.getHours();
                const menit = now.getMinutes();
                const totalMenit = jam * 60 + menit;
                
                const batasPagi = 10 * 60 + 15; // 10:15 Telat Pagi
                const batasSiang = 13 * 60 + 45; // 13:45 Telat Siang

                if(sesi === 'Pagi' && totalMenit > batasPagi) { kenaDenda = true; nominal = 5000; }
                if(sesi === 'Siang' && totalMenit > batasSiang) { kenaDenda = true; nominal = 5000; }
"""

new_denda_logic = """
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
"""

js = js.replace(old_denda_logic.strip(), new_denda_logic.strip())
js = js.replace("nominal = 10000;", "nominal = APP_SETTINGS.nominal_denda_bolos;")

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
print('Dynamic Penalty logic added')
