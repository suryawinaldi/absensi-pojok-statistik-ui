import os
import re

html_path = 'D:/APLIKASI ABSENSI POJOK STATISTIK/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Extract the charts HTML
chart_pattern = r'(\s*<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">\s*<div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">.*?<canvas id="chartDurasi" height="250"></canvas>\s*</div>\s*</div>\s*)'
match = re.search(chart_pattern, html, re.DOTALL)
if match:
    charts_html = match.group(1)
    # Remove from current position
    html = html.replace(charts_html, '\n')
    
    # Inject it inside sec-dashboard, right before </section> of sec-dashboard
    # Let's find sec-dashboard end
    sec_dashboard_start = html.find('<section id="sec-dashboard"')
    sec_dashboard_end = html.find('</section>', sec_dashboard_start) + len('</section>')
    
    # Actually, we can just find id="dash-leaderboard-rajin" and append after its parent grid
    grid_leaderboard = r'(<div class="max-w-3xl mx-auto">.*?</div>\s*</div>\s*</div>)'
    lb_match = re.search(grid_leaderboard, html, re.DOTALL)
    if lb_match:
        html = html.replace(lb_match.group(1), lb_match.group(1) + charts_html)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)
print("Charts moved inside dashboard section")
