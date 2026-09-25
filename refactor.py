import os
import re

base_dir = 'D:/APLIKASI ABSENSI POJOK STATISTIK'
js_dir = os.path.join(base_dir, 'js')
css_dir = os.path.join(base_dir, 'css')
os.makedirs(js_dir, exist_ok=True)
os.makedirs(css_dir, exist_ok=True)

with open(os.path.join(base_dir, 'index.html'), 'r', encoding='utf-8') as f:
    html = f.read()

script_match = re.search(r'<script>(.*?)</script>', html, re.DOTALL)
if script_match:
    script_content = script_match.group(1)
    # Fix the localStorage bug
    script_content = script_content.replace("localStorage.getItem('pojok_logged_in')", "(function(){try{return localStorage.getItem('pojok_logged_in');}catch(e){return null;}})()")
    script_content = script_content.replace("localStorage.setItem('pojok_logged_in', 'true');", "try{localStorage.setItem('pojok_logged_in', 'true');}catch(e){}")
    script_content = script_content.replace("localStorage.removeItem('pojok_logged_in');", "try{localStorage.removeItem('pojok_logged_in');}catch(e){}")
    
    # Split code into multiple logical files to give it a "real app" feel
    auth_logic = re.search(r'(// 0\. LOGIN LOGIC.*?checkAuth\(\);)', script_content, re.DOTALL)
    supabase_init = re.search(r'(// 1\. SUPABASE INITIALIZATION.*?createClient\(SUPABASE_URL, SUPABASE_KEY\);)', script_content, re.DOTALL)
    
    if auth_logic and supabase_init:
        with open(os.path.join(js_dir, 'auth.js'), 'w', encoding='utf-8') as f:
            f.write(auth_logic.group(1).strip())
            
        with open(os.path.join(js_dir, 'supabase.js'), 'w', encoding='utf-8') as f:
            f.write(supabase_init.group(1).strip())
            
        # The rest is UI and Business logic
        rest_of_code = script_content.replace(auth_logic.group(1), '').replace(supabase_init.group(1), '')
        with open(os.path.join(js_dir, 'app.js'), 'w', encoding='utf-8') as f:
            f.write(rest_of_code.strip())
            
        # Replace script tag with multiple imports
        imports = '''
    <script src="js/auth.js"></script>
    <script src="js/supabase.js"></script>
    <script src="js/app.js"></script>
'''
        html = html.replace(f'<script>{script_match.group(1)}</script>', imports.strip())
    else:
        with open(os.path.join(js_dir, 'app.js'), 'w', encoding='utf-8') as f:
            f.write(script_content.strip())
        html = html.replace(f'<script>{script_match.group(1)}</script>', '<script src="js/app.js"></script>')

style_match = re.search(r'<style>(.*?)</style>', html, re.DOTALL)
if style_match:
    style_content = style_match.group(1)
    with open(os.path.join(css_dir, 'style.css'), 'w', encoding='utf-8') as f:
        f.write(style_content.strip())
    html = html.replace(f'<style>{style_match.group(1)}</style>', '<link rel="stylesheet" href="css/style.css">')

with open(os.path.join(base_dir, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(html)

print('Project structure created successfully!')
