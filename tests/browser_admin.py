"""Browser integration tests with explicitly mocked Supabase HTTP responses.
Run after npm run build and a static server on port 8001. No live data is accessed.
"""
import argparse
import base64
import copy
import json
from pathlib import Path
import re
import time
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
ADMIN = '11111111-1111-4111-8111-111111111111'
AGENT = '33333333-3333-4333-8333-333333333333'
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9N8AAAAASUVORK5CYII=')
URL = re.search(r"SUPABASE_URL\s*=\s*'([^']+)'", (ROOT/'js/supabase.js').read_text())[1]

class Backend:
    def __init__(self):
        self.allowed = True
        self.fail_write = False
        self.conflict = False
        self.uploads = []
        self.imported_ids = set()
        self.writes = []
        self.user = {'id': ADMIN, 'aud': 'authenticated', 'role': 'authenticated', 'email': 'admin@example.test', 'created_at':'2026-01-01T00:00:00Z','app_metadata':{},'user_metadata':{}}
        self.rows = {
            'ps_agents': [{'id':AGENT,'name':'Agen Integrasi','division':'Pelayanan dan Konsultasi','position':'Anggota','active':True,'period':'2026 / 2027','photo_path':None,'version':1}],
            'ps_shifts': [], 'ps_posts': [], 'ps_weekly_schedule': [], 'ps_settings': []}
    def token(self):
        enc = lambda v: base64.urlsafe_b64encode(json.dumps(v).encode()).decode().rstrip('=')
        jwt = enc({'alg':'HS256'})+'.'+enc({'sub':ADMIN,'exp':int(time.time())+3600,'aud':'authenticated','role':'authenticated'})+'.'+base64.urlsafe_b64encode(b'fixture-signature').decode().rstrip('=')
        return {'access_token':jwt,'refresh_token':'fixture-refresh','token_type':'bearer','expires_in':3600,'expires_at':int(time.time())+3600,'user':self.user}
    def login_handle(self,route):
        payload=route.request.post_data_json
        assert 'email' not in payload
        if payload.get('username')!='adminpojokui' or payload.get('password')=='incorrect':
            route.fulfill(status=401,content_type='application/json',body=json.dumps({'error':'Username atau password tidak sesuai.'}))
        elif not self.allowed:
            route.fulfill(status=403,content_type='application/json',body=json.dumps({'error':'Akun ini belum terdaftar sebagai admin workspace.'}))
        else:
            token=self.token()
            route.fulfill(status=200,content_type='application/json',body=json.dumps({'access_token':token['access_token'],'refresh_token':token['refresh_token']}))
    def handle(self,route):
        req=route.request
        u=urlparse(req.url)
        path=u.path
        method=req.method
        def respond(data,status=200):
            route.fulfill(status=status,content_type='application/json',body=json.dumps(data))
        if method=='OPTIONS':
            route.fulfill(status=204,headers={'access-control-allow-origin':'*','access-control-allow-headers':'*'})
        elif path.endswith('/auth/v1/token'):
            data=req.post_data_json
            if data.get('password')=='incorrect':respond({'message':'Invalid login credentials'},400)
            else:respond(self.token())
        elif path.endswith('/auth/v1/user'):respond(self.user)
        elif path.endswith('/auth/v1/logout'):route.fulfill(status=204)
        elif '/storage/v1/object/sign/' in path and method=='POST':
            respond([{'path':p,'signedURL':'/object/sign/pojok-media/'+p+'?token=fixture'} for p in req.post_data_json['paths']])
        elif '/storage/v1/object/sign/' in path and method=='GET':route.fulfill(status=200,content_type='image/png',body=PNG)
        elif '/storage/v1/object/pojok-media/' in path and method=='POST':
            self.uploads.append(path);respond({'Key':path.split('/object/')[1]})
        elif '/storage/v1/object/pojok-media' in path and method=='DELETE':respond([])
        elif path.endswith('/rest/v1/rpc/ps_import_agents'):
            count=0
            for entry in req.post_data_json['records']:
                if entry['legacy_id'] not in self.imported_ids:
                    self.imported_ids.add(entry['legacy_id']);count+=1
                    self.rows['ps_agents'].append({'id':'44444444-4444-4444-8444-444444444444','name':entry['name'],'division':entry['division'],'position':entry['position'],'active':True,'period':'2026 / 2027','photo_path':None,'version':1})
            respond({'imported':count,'skipped':len(req.post_data_json['records'])-count})
        elif '/rest/v1/' in path:
            table=path.split('/')[-1]
            if table=='ps_admin':respond([{'user_id':ADMIN}] if self.allowed else []);return
            if table=='agen':respond([{'id':'legacy-1','nama':'Agen Lama','divisi':'Media Kreatif','is_bph':True}]);return
            assert table in self.rows,table
            query=parse_qs(u.query)
            if method=='GET':respond(copy.deepcopy(self.rows[table]));return
            self.writes.append((table,method))
            if self.fail_write:respond({'code':'42501','message':'denied'},403);return
            if self.conflict:respond(None);return
            if method=='POST':
                row=req.post_data_json;row['version']=1
                self.rows[table].append(row)
            else:
                record_id=query['id'][0].removeprefix('eq.')
                row=next(r for r in self.rows[table] if r['id']==record_id)
                if method=='PATCH':row.update(req.post_data_json);row['version']+=1
                elif method=='DELETE':self.rows[table].remove(row)
            respond(copy.deepcopy(row))
        else:raise AssertionError('Unexpected request: '+method+' '+path)

def choose_agent(page,label,name):
    field=page.get_by_role('combobox',name=label,exact=True)
    field.fill(name)
    page.locator('.agent-picker-options').get_by_role('option').filter(has_text=name).click()

def login(page,password='fixture-password'):
    page.get_by_label('Username admin').fill('adminpojokui')
    page.get_by_label('Password',exact=True).fill(password)
    page.get_by_role('button',name='Masuk ke workspace').click()

parser=argparse.ArgumentParser()
parser.add_argument('--base-url',default='http://127.0.0.1:8001')
parser.add_argument('--screenshots',default='/tmp/pojok-admin-review')
args=parser.parse_args()
out=Path(args.screenshots);out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':1000})
    page.set_default_timeout(8000)
    backend=Backend();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.route(URL+'/**',backend.handle)
    page.route(args.base_url+'/api/admin-login',backend.login_handle)
    page.goto(args.base_url+'/',wait_until='networkidle')
    expect(page.locator('#workspace-shell')).to_be_hidden()
    expect(page.get_by_role('heading',name='Selamat datang kembali.')).to_be_visible()
    assert page.get_by_role('link',name='Buka aplikasi absensi lama').get_attribute('href')=='/legacy/'
    assert page.request.get(args.base_url+'/legacy/').text()==(ROOT/'index.html').read_text()
    assert page.request.get(args.base_url+'/legacy/js/app.js').text()==(ROOT/'js/app.js').read_text()
    page.screenshot(path=str(out/'admin-login.png'),full_page=True)
    PNG=(out/'admin-login.png').read_bytes()
    login(page,'incorrect')
    expect(page.locator('#auth-error')).to_contain_text('Username atau password tidak sesuai')
    login(page)
    expect(page.get_by_role('heading',name='Selamat datang, Admin.')).to_be_visible()
    assert 'Nadia' not in page.locator('#main').inner_text(), 'Demo records leaked into production UI'
    page.get_by_role('link',name='Direktori Agen').click()
    page.get_by_role('button',name='Tambah agen',exact=True).click()
    page.get_by_label('Nama lengkap').fill('Agen Tersimpan')
    expect(page.get_by_label('Divisi',exact=True)).to_contain_text('Pelayanan dan Konsultasi')
    expect(page.get_by_label('Divisi',exact=True)).to_contain_text('Analisis Data')
    page.get_by_label('Divisi',exact=True).select_option('Analisis Data')
    page.get_by_label('Jabatan',exact=True).fill('Koordinator')
    backend.fail_write=True
    page.get_by_role('button',name='Simpan profil').click()
    expect(page.locator('#toast')).to_contain_text('Akses ditolak')
    expect(page.locator('#agent-form')).to_be_visible()
    assert len(backend.rows['ps_agents'])==1
    backend.fail_write=False
    page.get_by_role('button',name='Simpan profil').click()
    expect(page.locator('dialog').get_by_role('heading',name='Agen Tersimpan',exact=True)).to_be_visible()
    assert len(backend.rows['ps_agents'])==2
    assert backend.rows['ps_agents'][-1]['division']=='Analisis Data'
    page.get_by_label('Foto profil').set_input_files({'name':'photo.png','mimeType':'image/png','buffer':PNG})
    expect(page.locator('.profile-hero img')).to_be_visible()
    assert len(backend.uploads)==1
    assert backend.rows['ps_agents'][-1]['photo_path'].startswith('agents/')
    page.get_by_role('button',name='Tutup panel').click()
    page.reload(wait_until='networkidle')
    expect(page.locator('.agent-card img')).to_be_visible()
    page.get_by_role('link',name='Jadwal & Kehadiran',exact=True).click()
    page.get_by_role('button',name='Agen ekstra',exact=True).click()
    choose_agent(page,'Pilih agen sukarelawan','Agen Integrasi')
    page.get_by_label('Jam hadir (WIB)',exact=True).fill('11:15')
    page.get_by_role('button',name='Catat hadir ekstra').click()
    expect(page.locator('dialog')).to_be_hidden()
    assert backend.rows['ps_shifts'][0]['is_extra'] is True
    # A helper must not be counted as a regular session, even after a reload.
    page.get_by_role('link',name='Beranda',exact=True).click()
    expect(page.get_by_role('heading',name='Top 10 frekuensi jaga reguler')).to_be_visible()
    page.get_by_role('link',name='Jadwal & Kehadiran',exact=True).click()
    page.get_by_role('button',name='Tambah penugasan').click()
    choose_agent(page,'Agen','Agen Tersimpan')
    page.get_by_role('button',name='Simpan penugasan').click()
    expect(page.locator('tr').filter(has_text='Agen Tersimpan').get_by_role('button',name='Catat',exact=True)).to_be_visible()
    page.locator('tr').filter(has_text='Agen Tersimpan').get_by_role('button',name='Catat',exact=True).click()
    page.get_by_label('Status kehadiran').select_option('Hadir')
    page.get_by_label('Jam hadir (WIB)',exact=True).fill('10:07')
    page.get_by_role('button',name='Simpan kehadiran').click()
    expect(page.locator('tbody')).to_contain_text('10:07')
    assert backend.rows['ps_shifts'][1]['arrival_time']=='10:07'
    page.get_by_role('button',name='Agen ekstra',exact=True).click()
    choose_agent(page,'Pilih agen sukarelawan','Agen Tersimpan')
    page.get_by_role('button',name='Catat hadir ekstra').click()
    expect(page.locator('#toast')).to_contain_text('bertugas reguler')
    assert len(backend.rows['ps_shifts'])==2
    assert backend.rows['ps_shifts'][1]['is_extra'] is False
    page.get_by_role('button',name='Tutup panel').click()
    page.get_by_role('link',name='Konten & Publikasi').click()
    page.get_by_role('button',name='Buat konten',exact=True).click()
    page.get_by_label('Judul konten').fill('Konten Integrasi')
    choose_agent(page,'Penanggung jawab','Agen Integrasi')
    page.get_by_label('Caption',exact=True).fill('Caption dari admin.')
    page.get_by_label('Gambar / slide carousel').set_input_files({'name':'slide.png','mimeType':'image/png','buffer':PNG})
    expect(page.locator('#draft-images img')).to_be_visible()
    page.get_by_role('button',name='Simpan konten',exact=True).click()
    expect(page.locator('dialog')).not_to_be_visible()
    assert len(backend.rows['ps_posts'])==1
    assert backend.rows['ps_posts'][0]['image_paths'][0].startswith('posts/')
    page.get_by_role('button',name=re.compile('Konten Integrasi,')).click()
    page.get_by_role('button',name='Edit konten').click()
    page.get_by_label('Judul konten').fill('Edit stale')
    backend.conflict=True
    page.get_by_role('button',name='Simpan konten',exact=True).click()
    expect(page.locator('#toast')).to_contain_text('perangkat lain')
    expect(page.locator('#post-form')).to_be_visible()
    assert backend.rows['ps_posts'][0]['title']=='Konten Integrasi'
    backend.conflict=False
    page.get_by_role('button',name='Tutup panel').click()
    page.get_by_role('link',name='Direktori Agen').click()
    for expected in ['1 agen diimpor', '0 agen diimpor']:
        page.get_by_role('button',name='Impor agen lama',exact=True).click()
        expect(page.locator('dialog')).to_contain_text('Agen Lama')
        page.get_by_role('button',name='Impor 1 agen',exact=True).click()
        expect(page.locator('#toast')).to_contain_text(expected)
        expect(page.locator('dialog')).to_be_hidden()
        expect(page.get_by_role('heading',name='Agen Lama',exact=True)).to_be_visible()
    assert len(backend.rows['ps_agents'])==3
    # PI presets remain editable. Other divisions offer BPH and Anggota.
    for name,division,position in [('Surya Utama','Pengurus Inti','Ketua Agen Pojok Statistik'),('Nadia Suci','Media Kreatif','BPH'),('Agus Sutanto','Analisis Data','Anggota')]:
        page.get_by_role('button',name='Tambah agen',exact=True).click()
        page.get_by_label('Nama lengkap').fill(name)
        page.get_by_label('Divisi',exact=True).select_option(division)
        page.get_by_role('button',name=position,exact=True).click()
        expect(page.get_by_label('Jabatan',exact=True)).to_have_value(position)
        page.get_by_role('button',name='Simpan profil').click()
        expect(page.locator('dialog').get_by_role('heading',name=name,exact=True)).to_be_visible()
        page.get_by_role('button',name='Tutup panel').click()
    page.get_by_label('Cari agen',exact=True).fill('SU')
    expect(page.locator('.agent-card')).to_have_count(3)
    page.get_by_label('Filter divisi',exact=True).select_option('Media Kreatif')
    page.get_by_label('Filter jabatan',exact=True).select_option('bph')
    expect(page.locator('.agent-card h2')).to_have_text(['Nadia Suci'])
    page.get_by_label('Filter divisi',exact=True).select_option('')
    page.get_by_label('Filter jabatan',exact=True).select_option('')
    page.get_by_label('Urutkan agen').select_option('name-asc')
    expect(page.locator('.agent-card h2')).to_have_text(['Agus Sutanto','Nadia Suci','Surya Utama'])
    page.get_by_label('Urutkan agen').select_option('name-desc')
    expect(page.locator('.agent-card h2')).to_have_text(['Surya Utama','Nadia Suci','Agus Sutanto'])
    page.get_by_label('Cari agen',exact=True).fill('zzzz-no-match')
    expect(page.locator('#agent-grid')).to_contain_text('Tidak ada agen yang sesuai')
    page.get_by_label('Cari agen',exact=True).fill('')
    page.get_by_label('Urutkan agen').select_option('division')
    page.screenshot(path=str(out/'directory-desktop.png'),full_page=True)
    # Edit all identity fields while keeping the ID used by past records.
    page.get_by_role('button',name='Edit profil Agen Integrasi',exact=True).click()
    page.get_by_label('Nama lengkap').fill('Surya Integrasi')
    page.get_by_label('Divisi',exact=True).select_option('Pengurus Inti')
    page.get_by_label('Jabatan',exact=True).fill('Koordinator Program dan Kemitraan')
    page.get_by_role('button',name='Simpan profil').click()
    expect(page.locator('.profile-hero')).to_contain_text('Koordinator Program dan Kemitraan')
    assert backend.rows['ps_agents'][0]['id']==AGENT
    assert backend.rows['ps_agents'][0]['division']=='Pengurus Inti'
    assert backend.rows['ps_posts'][0]['agent_id']==AGENT
    assert backend.rows['ps_shifts'][0]['agent_id']==AGENT
    page.get_by_role('button',name='Tutup panel').click()
    page.reload(wait_until='networkidle')
    page.get_by_label('Cari agen',exact=True).fill('INTEGRA')
    expect(page.locator('.agent-card h2')).to_have_text(['Surya Integrasi'])
    page.get_by_role('link',name='Jadwal & Kehadiran',exact=True).click()
    page.get_by_role('button',name='Tambah penugasan').click()
    field=page.get_by_role('combobox',name='Agen',exact=True)
    field.fill('zzzz-no-match')
    expect(page.locator('.picker-empty')).to_contain_text('Tidak ada agen yang cocok')
    assert page.locator('#shift-form [name="agent"]').input_value()==''
    before=len(backend.rows['ps_shifts'])
    page.get_by_role('button',name='Simpan penugasan').click()
    expect(page.locator('#shift-form')).to_be_visible()
    assert len(backend.rows['ps_shifts'])==before
    field.fill('su')
    expect(page.locator('.agent-picker-options [role="option"]')).to_have_count(4)
    page.screenshot(path=str(out/'agent-picker-desktop.png'),full_page=True)
    field.press('Escape')
    expect(page.locator('dialog')).to_be_visible()
    expect(field).to_have_attribute('aria-expanded','false')
    field.fill('Suci')
    field.press('ArrowDown')
    field.press('Enter')
    expect(field).to_have_value('Nadia Suci')
    page.get_by_role('button',name='Simpan penugasan').click()
    expect(page.locator('dialog')).to_be_hidden()
    expected_id=next(a['id'] for a in backend.rows['ps_agents'] if a['name']=='Nadia Suci')
    assert backend.rows['ps_shifts'][-1]['agent_id']==expected_id
    page.get_by_role('button',name='Jadwal Master (Mingguan)',exact=True).click()
    page.get_by_role('button',name='Tambah ke jadwal master',exact=True).click()
    choose_agent(page,'Agen','Agus Sutanto')
    page.get_by_role('button',name='Simpan jadwal master',exact=True).click()
    expect(page.locator('dialog')).to_be_hidden()
    weekly_id=backend.rows['ps_weekly_schedule'][0]['id']
    page.get_by_role('button',name='Pindah',exact=True).click()
    expect(page.get_by_role('combobox',name='Agen',exact=True)).to_be_disabled()
    expect(page.get_by_role('combobox',name='Agen',exact=True)).to_have_value('Agus Sutanto')
    page.get_by_label('Hari jaga',exact=True).select_option('Selasa')
    page.get_by_role('button',name='Simpan jadwal master',exact=True).click()
    expect(page.locator('dialog')).to_be_hidden()
    assert backend.rows['ps_weekly_schedule'][0]['id']==weekly_id
    assert backend.rows['ps_weekly_schedule'][0]['day_name']=='Selasa'
    page.get_by_role('button',name='Keluar',exact=True).click()
    expect(page.locator('#workspace-shell')).to_be_hidden()
    assert page.locator('#main').inner_text()==''
    assert page.locator('#dialog-content').inner_text()==''
    assert page.evaluate("localStorage.getItem('pojok-workspace-prototype-v1')") is None
    backend.allowed=False
    login(page)
    expect(page.locator('#workspace-shell')).to_be_hidden()
    expect(page.locator('#auth-error')).not_to_be_empty()
    # Verify a restored session cannot bypass the admin membership check.
    page.reload(wait_until='networkidle')
    expect(page.locator('#workspace-shell')).to_be_hidden()
    mobile=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    mobile_backend=Backend()
    mobile.route(URL+'/**',mobile_backend.handle)
    mobile.route(args.base_url+'/api/admin-login',mobile_backend.login_handle)
    mobile.goto(args.base_url+'/admin/',wait_until='networkidle')
    assert mobile.evaluate('document.documentElement.scrollWidth <= innerWidth')
    mobile.screenshot(path=str(out/'admin-login-mobile.png'),full_page=True)
    login(mobile)
    expect(mobile.get_by_role('heading',name='Selamat datang, Admin.')).to_be_visible()
    for route in ['agen','kehadiran','konten']:
        mobile.goto(args.base_url+'/admin/#'+route,wait_until='networkidle')
        assert mobile.evaluate('document.documentElement.scrollWidth <= innerWidth'),route
    mobile.get_by_role('link',name='Direktori Agen',exact=True).click()
    mobile.screenshot(path=str(out/'directory-mobile.png'),full_page=True)
    mobile.get_by_role('link',name='Jadwal & Kehadiran',exact=True).click()
    mobile.get_by_role('button',name='Tambah penugasan').click()
    mobile.get_by_role('combobox',name='Agen',exact=True).fill('integ')
    mobile.screenshot(path=str(out/'agent-picker-mobile.png'),full_page=True)
    mobile.get_by_role('option').filter(has_text='Agen Integrasi').tap()
    assert mobile.locator('#shift-form [name="agent"]').input_value()==AGENT
    assert mobile.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert not errors,errors
    print(json.dumps({'result':'passed','backend':'mock HTTP, no live Supabase writes','checks':['login failure','admin-only gate','no seeded records','failed write preserved form','agent save','private photo upload','session restore and signed media','dated shift','attendance time','editorial upload and save','conflict handling','logout clears records','nonadmin denied','mobile layouts','legacy import preview and deduplication','distinct service and data divisions','volunteer flag preservation','regular duty cannot be relabeled as volunteering','editable PI positions','BPH and member presets','directory substring search and combined filters','name sorting','identity edits preserve record references','searchable agent ID selection','keyboard and mobile picker'],'screenshots':str(out)}))
    browser.close()
