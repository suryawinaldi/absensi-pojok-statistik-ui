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
            'ps_shifts': [], 'ps_posts': [], 'ps_weekly_schedule': [], 'ps_settings': [], 'ps_online_roster': [], 'ps_online_clients': [], 'ps_online_notes': [], 'ps_online_events': []}
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
        elif path.endswith('/rest/v1/rpc/ps_online_resolve'):
            respond(None)
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
                if table.startswith('ps_online_'):
                    row.setdefault('id',str(__import__('uuid').uuid4()))
                    row.setdefault('created_at','2026-10-26T10:00:00Z')
                    if table=='ps_online_clients':
                        row.setdefault('status','Baru');row.setdefault('assignment_source','manual')
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
    assert page.get_by_role('link',name='Buka aplikasi absensi lama').count()==0
    assert page.request.get(args.base_url+'/legacy/').status==404
    assert page.request.get(args.base_url+'/legacy/js/auth.js').status==404
    page.screenshot(path=str(out/'admin-login.png'),full_page=True)
    PNG=(out/'admin-login.png').read_bytes()
    login(page,'incorrect')
    expect(page.locator('#auth-error')).to_contain_text('Username atau password tidak sesuai')
    login(page)
    expect(page.get_by_role('heading',name='Selamat datang, Admin.')).to_be_visible()
    assert 'Nadia' not in page.locator('#main').inner_text(), 'Demo records leaked into production UI'
    expect(page.locator('.sidebar-note strong')).to_have_text('Pojok Statistik UI')
    expect(page.locator('.sidebar-note p')).to_have_text('Tempat Asyik Belajar Statistik')
    page.screenshot(path=str(out/'home-desktop.png'),full_page=True)
    page.get_by_role('link',name='Jadwal & Kehadiran',exact=True).click()
    page.get_by_role('button',name='Jam Buka & Tutup',exact=True).click()
    page.get_by_label('Periode kepengurusan aktif',exact=True).fill('2027 / 2028')
    page.locator('[name="end_Senin_Pagi"]').fill('09:00')
    page.get_by_role('button',name='Simpan pengaturan',exact=True).click()
    expect(page.locator('#toast')).to_contain_text('harus setelah jam buka')
    assert backend.rows['ps_settings']==[]
    page.locator('[name="end_Senin_Pagi"]').fill('12:30')
    page.get_by_role('button',name='Simpan pengaturan',exact=True).click()
    expect(page.locator('#toast')).to_contain_text('tersimpan')
    assert backend.rows['ps_settings'][0]['active_period']=='2027 / 2028'
    expect(page.locator('.semester')).to_contain_text('2027 / 2028')
    page.get_by_role('button',name='Absensi Harian',exact=True).click()
    page.get_by_role('link',name='Direktori Agen').click()
    expect(page.get_by_label('Cari agen',exact=True)).to_have_attribute('placeholder','Ketik nama')
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
    assert backend.rows['ps_agents'][-1]['period']=='2027 / 2028'
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
    expect(page.get_by_role('heading',name='Konsisten hadir, bersama berkarya')).to_be_visible()
    expect(page.locator('.ranking-column')).to_have_count(1)
    expect(page.locator('.ranking-column')).to_have_attribute('aria-label', re.compile('75 menit, termasuk 75 menit sukarela'))
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
    choose_agent(page,'PIC produksi','Agen Integrasi')
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
    # The complete week remains one row; long chip contents cannot escape their card.
    for width in [1440, 390]:
        page.set_viewport_size({'width':width,'height':1000})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert page.locator('.master-day-card').evaluate_all('(els) => new Set(els.map(e => Math.round(e.getBoundingClientRect().top))).size') == 1
        assert page.locator('.master-chip').evaluate_all('(els) => els.every(e => e.scrollWidth <= e.clientWidth)')
    page.set_viewport_size({'width':1440,'height':1000})
    weekly_id=backend.rows['ps_weekly_schedule'][0]['id']
    page.get_by_role('button',name='Pindah',exact=True).click()
    expect(page.get_by_role('combobox',name='Agen',exact=True)).to_be_disabled()
    expect(page.get_by_role('combobox',name='Agen',exact=True)).to_have_value('Agus Sutanto')
    page.get_by_label('Hari jaga',exact=True).select_option('Selasa')
    page.get_by_role('button',name='Simpan jadwal master',exact=True).click()
    expect(page.locator('dialog')).to_be_hidden()
    assert backend.rows['ps_weekly_schedule'][0]['id']==weekly_id
    assert backend.rows['ps_weekly_schedule'][0]['day_name']=='Selasa'
    # Verify the actual CSV download follows the paid/unpaid filter.
    backend.rows['ps_shifts'] = [
        {'id':'fine-unpaid','agent_id':AGENT,'date':'2026-10-20','session':'Pagi','status':'Tidak hadir','arrival_time':None,'fine_paid':False,'is_extra':False,'is_pj':False,'version':1},
        {'id':'fine-paid','agent_id':AGENT,'date':'2026-10-21','session':'Pagi','status':'Tidak hadir','arrival_time':None,'fine_paid':True,'is_extra':False,'is_pj':False,'version':1}
    ]
    page.reload(wait_until='networkidle')
    page.get_by_role('button',name='Rekap Denda',exact=True).click()
    page.get_by_label('Filter status denda').select_option('unpaid')
    page.get_by_label('Cari denda agen').press_sequentially('Surya')
    expect(page.get_by_label('Cari denda agen')).to_have_value('Surya')
    expect(page.get_by_label('Cari denda agen')).to_be_focused()
    with page.expect_download() as downloaded:
        page.get_by_role('button',name='Ekspor CSV sesuai filter',exact=True).first.click()
    csv=Path(downloaded.value.path()).read_text(encoding='utf-8-sig')
    assert '2026-10-20' in csv and '2026-10-21' not in csv
    page.get_by_role('link',name='Direktori Agen',exact=True).click()
    expect(page.get_by_label('Filter periode')).to_be_visible()

    # Online workspace uses separate tables and only service agents in selectors.
    service_id='77777777-7777-4777-8777-777777777777'
    backend.rows['ps_agents'].append({'id':service_id,'name':'Petugas Layanan','division':'Pelayanan dan Konsultasi','position':'Anggota','active':True,'period':'2026 / 2027','photo_path':None,'version':1})
    page.reload(wait_until='networkidle')
    page.get_by_role('link',name='Layanan Online',exact=True).click()
    page.get_by_role('button',name='Tambah jadwal online',exact=True).click()
    expect(page.get_by_label('Petugas online')).to_contain_text('Petugas Layanan')
    assert page.get_by_label('Petugas online').locator('option').count()==2
    page.get_by_label('Kanal',exact=True).select_option('OA LINE')
    page.get_by_label('Hari',exact=True).select_option('1')
    page.get_by_label('Mulai berlaku',exact=True).fill('2026-10-26')
    page.get_by_label('Jam mulai (WIB)',exact=True).fill('09:00')
    page.get_by_label('Jam selesai (WIB)',exact=True).fill('17:00')
    page.get_by_label('Petugas online').select_option(service_id)
    page.get_by_role('button',name='Simpan jadwal online',exact=True).click()
    expect(page.locator('#online-editor')).to_be_empty()
    assert backend.rows['ps_online_roster'][0]['agent_id']==service_id
    page.screenshot(path=str(out/'online-desktop.png'),full_page=True)
    page.get_by_role('button',name='Klien OA LINE',exact=True).click()
    page.get_by_role('button',name='Tambah klien OA LINE',exact=True).click()
    page.get_by_label('Nama klien',exact=True).fill('Klien Simulasi')
    page.get_by_label('Waktu chat pertama (WIB)',exact=True).fill('2026-10-26T10:00')
    expect(page.locator('#online-suggestion')).to_contain_text('Petugas Layanan')
    page.get_by_label('PJ tetap klien',exact=True).select_option(service_id)
    page.get_by_label('Alasan penetapan manual',exact=True).fill('Ditinjau admin')
    page.get_by_label('Ringkasan kebutuhan',exact=True).fill('Konsultasi pengolahan data')
    backend.fail_write=True
    page.get_by_role('button',name='Simpan klien',exact=True).click()
    expect(page.locator('#toast')).to_contain_text('Belum berhasil')
    expect(page.locator('[data-online-form="client"]')).to_be_visible()
    assert backend.rows['ps_online_clients']==[]
    backend.fail_write=False
    page.get_by_role('button',name='Simpan klien',exact=True).click()
    expect(page.locator('.online-client')).to_contain_text('Klien Simulasi')
    assert backend.rows['ps_online_clients'][0]['first_contact_at']=='2026-10-26T03:00:00.000Z'
    page.locator('.online-client').click()
    page.get_by_label('Status layanan',exact=True).select_option('Dalam penanganan')
    page.get_by_role('button',name='Simpan status layanan',exact=True).click()
    expect(page.locator('body')).not_to_have_class(re.compile(r'\bsaving\b'))
    expect(page.get_by_label('Status layanan',exact=True)).to_have_value('Dalam penanganan')
    assert backend.rows['ps_online_clients'][0]['owner_id']==service_id
    page.get_by_label('Catatan layanan',exact=True).fill('Penjelasan metode sudah diberikan.')
    page.get_by_role('button',name='Tambah catatan',exact=True).click()
    expect(page.locator('.online-history')).to_contain_text('Penjelasan metode sudah diberikan.')
    page.get_by_role('button',name='Tutup formulir',exact=True).click()
    page.get_by_role('button',name='Publikasi IG',exact=True).click()
    expect(page.get_by_role('heading',name='Antrean publikasi Instagram')).to_be_visible()
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
    for route in ['agen','kehadiran','konten','online']:
        mobile.goto(args.base_url+'/admin/#'+route,wait_until='networkidle')
        assert mobile.evaluate('document.documentElement.scrollWidth <= innerWidth'),route
    mobile.screenshot(path=str(out/'online-mobile.png'),full_page=True)
    mobile.set_viewport_size({'width':320,'height':700})
    assert mobile.evaluate('document.documentElement.scrollWidth <= innerWidth')
    mobile.set_viewport_size({'width':390,'height':844})
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
    print(json.dumps({'result':'passed','backend':'mock HTTP, no live Supabase writes','checks':['login failure','admin-only gate','no seeded records','failed write preserved form','agent save','private photo upload','session restore and signed media','dated shift','attendance time','editorial upload and save','conflict handling','logout clears records','nonadmin denied','mobile layouts','legacy import preview and deduplication','distinct service and data divisions','volunteer flag preservation','regular duty cannot be relabeled as volunteering','editable PI positions','BPH and member presets','directory substring search and combined filters','name sorting','identity edits preserve record references','searchable agent ID selection','keyboard and mobile picker','active period and default profile period','invalid operational hours rejected','filtered CSV download','search retains keyboard focus','legacy routes removed','online roster eligibility UI','online client save and failed write','WIB contact time','stable client owner','online service notes and IG queue'],'screenshots':str(out)}))
    browser.close()
