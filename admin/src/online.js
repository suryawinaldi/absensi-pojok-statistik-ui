import {ONLINE_DAYS, ONLINE_CHANNELS, CLIENT_STATUSES, eligibleOnlineAgent, onlineAssignment, fromWib, wibDateTime} from './online-rules.js';
const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const opt = (values,current='') => values.map(v=>`<option value="${esc(v)}" ${v===current?'selected':''}>${esc(v)}</option>`).join('');
const field = (title,control) => `<label class="form-field"><span>${title}</span>${control.replace(/<(input|select|textarea)\b/, `<$1 aria-label="${esc(title)}"`)}</label>`;
const input = (name,value='',type='text',attrs='') => `<input class="input" name="${name}" type="${type}" value="${esc(value)}" ${attrs}>`;
const when = value => new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',dateStyle:'medium',timeStyle:'short'}).format(new Date(value))+' WIB';

export function createOnlineWorkspace({client, root, state, allowed, active, busy, setBusy, toast, showPost}) {
  let data={roster:[],clients:[],notes:[],events:[]}, tab='roster', selectedDate=wibDateTime(new Date()).slice(0,10), epoch=0;
  let selectedClient=null, search='', statusFilter='', ownerFilter='';
  const name = id => state().agents.find(a=>a.id===id)?.name || 'Belum ditetapkan';
  const agentSelect = (key,current='',empty='Pilih petugas',required=true) => `<select name="${key}" ${required?'required':''}><option value="">${empty}</option>${state().agents.filter(eligibleOnlineAgent).map(a=>`<option value="${esc(a.id)}" ${a.id===current?'selected':''}>${esc(a.name)}</option>`).join('')}</select>`;
  const assignment = (channel,date,time) => onlineAssignment(data.roster,state().agents,channel,date,time);
  async function rows(table) {
    const all=[];
    for(let start=0;;start+=500) {
      const r=await client.from(table).select('*').order('id').range(start,start+499);
      if(r.error) throw r.error;
      all.push(...r.data); if(r.data.length<500) return all;
    }
  }
  function errorText(error) {
    if(['42P01','PGRST205'].includes(error?.code)) return 'Layanan online belum diaktifkan di database. Fitur offline tetap tersedia.';
    if(error?.code==='23505') return 'Identitas LINE atau jadwal sudah terdaftar. Cari data lama sebelum menambah.';
    if(error?.code==='23514') return error.message || 'Data belum sesuai aturan layanan online.';
    if(error?.code==='CONFLICT') return 'Data berubah di perangkat lain. Muat ulang lalu periksa sebelum menyimpan kembali.';
    return 'Belum berhasil. Periksa koneksi, lalu muat ulang untuk memastikan hasil sebelum mengulangi penyimpanan.';
  }
  async function refresh() {
    const token=++epoch;
    if(!active()) return;
    root.innerHTML='<p class="empty" role="status">Memuat layanan online…</p>';
    try {
      const lists=await Promise.all(['ps_online_roster','ps_online_clients','ps_online_notes','ps_online_events'].map(rows));
      if(token!==epoch || !allowed() || !active()) return;
      data=Object.fromEntries(['roster','clients','notes','events'].map((k,i)=>[k,lists[i]]));
      paint();
    } catch(error) {
      if(token===epoch && allowed() && active()) root.innerHTML=`<section class="panel online-panel"><h1>Layanan Online</h1><p role="alert">${esc(errorText(error))}</p><button class="button" data-online="reload">Coba lagi</button></section>`;
    }
  }
  function chrome() {
    return `<div class="page-heading"><div><p class="eyebrow">PELAYANAN DAN KONSULTASI</p><h1>Layanan online</h1><p class="subtitle">Jadwal Instagram, OA LINE, dan PJ tetap klien. Terpisah dari absensi serta denda offline.</p></div><button class="button" data-online="reload">Muat ulang online</button></div>
    <nav class="online-tabs" aria-label="Bagian layanan online">${[['roster','Jadwal Online'],['instagram','Publikasi IG'],['clients','Klien OA LINE']].map(([key,label])=>`<button class="button ${key===tab?'primary':''}" data-online="tab" data-tab="${key}" aria-pressed="${key===tab}">${label}</button>`).join('')}</nav>
    <p class="help">Publikasi dan percakapan tetap dilakukan manual di Instagram/OA LINE. Aplikasi ini mencatat jadwal dan layanan; tidak membaca atau mengirim pesan otomatis.</p>`;
  }
  function scheduleView() {
    const ig=assignment('Instagram',selectedDate),oa=assignment('OA LINE',selectedDate);
    const doubled=ig.agent && ig.agent.id===oa.agent?.id;
    return `<div class="online-toolbar">${field('Tanggal layanan',input('online-date',selectedDate,'date','required'))}<button class="button primary" data-online="new-roster">Tambah jadwal online</button><button class="button" data-online="new-exception">Pengecualian harian</button></div>
    ${doubled?'<p class="banner">Petugas yang sama menangani kedua kanal pada tanggal ini. Tinjau beban kerjanya.</p>':''}
    <div class="online-summary">${ONLINE_CHANNELS.map(channel=>{const a=assignment(channel,selectedDate);return `<section class="panel online-panel"><p class="eyebrow">${channel}</p><h2>${esc(a.agent?.name||a.reason)}</h2><p>${a.row?`${a.row.starts_at.slice(0,5)}–${a.row.ends_at.slice(0,5)} WIB`:'Hari dan jam belum diatur'}</p>${a.row?.reason?`<p class="help">${esc(a.row.reason)}</p>`:''}</section>`}).join('')}</div>
    <section class="panel online-panel"><h2>Riwayat pola mingguan & pengecualian</h2><p class="help">Pola berulang hanya pada hari yang kamu pilih. Jadwal lama tidak ditimpa; akhiri masa berlaku sebelum membuat pola pengganti. Pengecualian harian mengutamakan tanggal khusus.</p><div class="table-scroll"><table><thead><tr><th>Kanal / hari</th><th>Petugas</th><th>Jam WIB</th><th>Berlaku</th><th>Tindakan</th></tr></thead><tbody>${[...data.roster].sort((a,b)=>b.valid_from.localeCompare(a.valid_from)).map(r=>`<tr><td>${esc(r.channel)}<br>${r.exception_date?`Khusus ${r.exception_date}`:ONLINE_DAYS[r.weekday]}</td><td>${esc(name(r.agent_id))}${r.agent_id&&!eligibleOnlineAgent(state().agents.find(a=>a.id===r.agent_id))?'<br><strong class="online-warning">Perlu pengganti</strong>':''}</td><td>${r.starts_at.slice(0,5)}–${r.ends_at.slice(0,5)}</td><td>${r.valid_from}<br>s.d. ${r.valid_until||'seterusnya'}</td><td>${!r.exception_date&&(!r.valid_until||r.valid_until>=wibDateTime(new Date()).slice(0,10))?`<button class="text-button" data-online="end-roster" data-id="${r.id}">Akhiri jadwal</button>`:'Tersimpan'}</td></tr>`).join('')||'<tr><td colspan="5">Belum ada jadwal. Tambahkan hari, jam, dan petugas secara eksplisit.</td></tr>'}</tbody></table></div></section>`;
  }
  function instagramView() {
    const posts=state().posts.filter(p=>p.date===selectedDate).sort((a,b)=>a.time.localeCompare(b.time));
    return `<div class="online-toolbar">${field('Tanggal publikasi',input('online-date',selectedDate,'date','required'))}</div><section class="panel online-panel"><h2>Antrean publikasi Instagram</h2><p class="help">PIC produksi dan petugas publikasi adalah peran berbeda. Petugas terbit disimpan saat konten pertama ditandai Terbit; konten lama yang belum memiliki catatan petugas ditampilkan apa adanya.</p><div class="table-scroll"><table><thead><tr><th>Konten / jam</th><th>PIC produksi</th><th>Petugas publikasi</th><th>Status</th></tr></thead><tbody>${posts.map(p=>{const a=assignment('Instagram',p.date,p.time);return `<tr><td><button class="text-button" data-online="post" data-id="${p.id}">${esc(p.title)}</button><br>${esc(p.time)} WIB</td><td>${esc(name(p.agent))}</td><td>${esc(p.status==='Terbit'?(p.onlinePublisher?name(p.onlinePublisher):'Belum tercatat'):a.agent?.name||a.reason)}</td><td>${esc(p.status)}</td></tr>`}).join('')||'<tr><td colspan="4">Tidak ada konten pada tanggal ini.</td></tr>'}</tbody></table></div></section>`;
  }
  function clientCards() {
    return data.clients.filter(c=>(!statusFilter||c.status===statusFilter)&&(!ownerFilter||(ownerFilter==='none'?!c.owner_id:c.owner_id===ownerFilter))&&`${c.name} ${c.line_id||''}`.toLocaleLowerCase('id').includes(search.toLocaleLowerCase('id')))
      .sort((a,b)=>b.first_contact_at.localeCompare(a.first_contact_at)).map(c=>`<button class="panel online-client" data-online="client" data-id="${c.id}"><strong>${esc(c.name)}</strong><span>${esc(c.status)}</span><span>PJ tetap: ${esc(name(c.owner_id))}</span><small>${when(c.first_contact_at)}</small>${c.owner_id&&!eligibleOnlineAgent(state().agents.find(a=>a.id===c.owner_id))?'<span class="online-warning">PJ perlu ditinjau; alihkan secara eksplisit.</span>':''}</button>`).join('')||'<p class="empty">Belum ada klien yang sesuai.</p>';
  }
  function clientsView() {
    const counts=state().agents.filter(a=>data.clients.some(c=>c.owner_id===a.id&&c.status!=='Selesai')).map(a=>`${a.name}: ${data.clients.filter(c=>c.owner_id===a.id&&c.status!=='Selesai').length}`).join(' · ');
    return `<div class="online-toolbar"><label class="form-field"><span>Cari klien / ID LINE</span><input class="input" name="client-search" value="${esc(search)}" placeholder="Ketik nama atau ID LINE"></label>${field('Filter status',`<select name="client-status"><option value="">Semua status</option>${opt(CLIENT_STATUSES,statusFilter)}</select>`)}${field('Filter PJ',`<select name="client-owner"><option value="">Semua PJ</option><option value="none" ${ownerFilter==='none'?'selected':''}>Belum ditetapkan</option>${state().agents.map(a=>`<option value="${a.id}" ${ownerFilter===a.id?'selected':''}>${esc(a.name)}</option>`).join('')}</select>`)}<button class="button primary" data-online="new-client">Tambah klien OA LINE</button></div><p class="help">Layanan terbuka per PJ: ${esc(counts||'Belum ada')}. Tanpa PJ: ${data.clients.filter(c=>!c.owner_id&&c.status!=='Selesai').length}.</p><div class="online-client-grid" id="online-client-list">${clientCards()}</div>`;
  }
  function paint() {
    if(!active()||!allowed()) return;
    root.innerHTML=chrome()+`<div id="online-editor"></div>`+(tab==='roster'?scheduleView():tab==='instagram'?instagramView():clientsView());
  }
  function editor(title,content) {
    const box=root.querySelector('#online-editor');
    box.innerHTML=`<section class="panel online-panel online-editor"><div class="online-toolbar"><h2 tabindex="-1">${title}</h2><button class="text-button" data-online="cancel">Tutup formulir</button></div>${content}</section>`;
    box.querySelector('h2').focus(); box.scrollIntoView({block:'nearest'});
  }
  function rosterForm(exception=false) {
    editor(exception?'Pengecualian satu hari':'Tambah pola mingguan',`<form data-online-form="roster"><input type="hidden" name="exception" value="${exception?'yes':''}"><div class="form-row">${field('Kanal',`<select name="channel">${opt(ONLINE_CHANNELS)}</select>`)}${exception?'':field('Hari',`<select name="weekday">${ONLINE_DAYS.map((d,i)=>`<option value="${i}">${d}</option>`).join('')}</select>`)}</div>${field('Mulai berlaku',input('valid_from',selectedDate,'date','required'))}${exception?'':field('Berlaku sampai (opsional)',input('valid_until','','date'))}<div class="form-row">${field('Jam mulai (WIB)',input('starts_at','','time','required'))}${field('Jam selesai (WIB)',input('ends_at','','time','required'))}</div>${field('Petugas online',agentSelect('agent_id','',exception?'Tidak ada petugas / libur':'Pilih petugas',!exception))}${field('Alasan / catatan',`<textarea name="reason" maxlength="1000" ${exception?'required':''}></textarea>`)}<p class="help">Hanya agen aktif Pelayanan dan Konsultasi. Jam akhir tidak termasuk cakupan layanan. Penggantian pada tanggal tertentu tidak mengubah PJ klien lama.</p><button class="button primary" type="submit">Simpan jadwal online</button></form>`);
  }
  function clientForm() {
    editor('Tambah klien OA LINE',`<form data-online-form="client"><p class="help">Cari nama/ID LINE di daftar terlebih dahulu untuk menghindari duplikasi. Nama sama tidak otomatis dianggap orang yang sama.</p>${field('Nama klien',input('name','','text','required maxlength="120"'))}${field('ID LINE (opsional)',input('line_id','','text','maxlength="120"'))}${field('Waktu chat pertama (WIB)',input('first_contact',wibDateTime(new Date()),'datetime-local','required'))}<p class="banner" id="online-suggestion" role="status"></p>${field('PJ tetap klien',agentSelect('owner_id','','Ikuti jadwal / belum ditetapkan',false))}${field('Alasan penetapan manual',`<textarea name="transfer_reason" maxlength="1000"></textarea>`)}${field('Ringkasan kebutuhan',`<textarea name="summary" maxlength="4000"></textarea>`)}<button class="button primary" type="submit">Simpan klien</button></form>`);
    suggestion();
  }
  function suggestion() {
    const field=root.querySelector('[name="first_contact"]'); if(!field?.value) return;
    const [date,time]=field.value.split('T'), a=assignment('OA LINE',date,time);
    root.querySelector('#online-suggestion').textContent=a.agent?`Saran sesuai waktu chat: ${a.agent.name}. PJ akan tetap sama setelah hari berganti.`:`${a.reason}. Pilih PJ manual dengan alasan, atau simpan sebagai perlu penetapan PJ.`;
  }
  function detail(id) {
    const c=data.clients.find(x=>x.id===id); if(!c)return; selectedClient=c.id;
    const events=data.events.filter(e=>e.entity_id===c.id).sort((a,b)=>b.created_at.localeCompare(a.created_at));
    editor(esc(c.name),`<p>ID internal: ${esc(c.id)}<br>ID LINE: ${esc(c.line_id||'Belum diisi')}<br>Kontak pertama: ${when(c.first_contact_at)}<br>PJ tetap: <strong>${esc(name(c.owner_id))}</strong></p><p class="online-pre">${esc(c.summary)}</p><form data-online-form="client-edit" data-id="${c.id}"><h3>Identitas dan kebutuhan</h3>${field('Nama klien',input('name',c.name,'text','required maxlength="120"'))}${field('ID LINE (opsional)',input('line_id',c.line_id||'','text','maxlength="120"'))}${field('Ringkasan kebutuhan',`<textarea name="summary" maxlength="4000">${esc(c.summary)}</textarea>`)}<button class="button" type="submit">Simpan detail klien</button></form><hr><form data-online-form="status" data-id="${c.id}">${field('Status layanan',`<select name="status">${opt(CLIENT_STATUSES,c.status)}</select>`)}<button class="button" type="submit">Simpan status layanan</button></form><hr><form data-online-form="transfer" data-id="${c.id}"><h3>Alihkan PJ</h3>${field('PJ pengganti',agentSelect('owner_id',c.owner_id))}${field('Alasan alih PJ',`<textarea name="transfer_reason" required maxlength="1000"></textarea>`)}<button class="button" type="submit">Alihkan PJ klien</button></form><hr><form data-online-form="note" data-id="${c.id}"><h3>Catat perkembangan</h3>${field('Waktu kegiatan (WIB)',input('occurred_at',wibDateTime(new Date()),'datetime-local','required'))}${field('Catatan layanan',`<textarea name="body" required maxlength="4000"></textarea>`)}<button class="button primary" type="submit">Tambah catatan</button></form><h3>Riwayat catatan</h3>${data.notes.filter(n=>n.client_id===c.id).sort((a,b)=>b.occurred_at.localeCompare(a.occurred_at)).map(n=>`<article class="online-history"><small>${when(n.occurred_at)}</small><p class="online-pre">${esc(n.body)}</p></article>`).join('')||'<p class="help">Belum ada catatan.</p>'}<h3>Riwayat penetapan & status</h3>${events.map(e=>`<article class="online-history"><small>${when(e.created_at)}</small><p>${esc(name(e.old_owner))} → ${esc(name(e.new_owner))}<br>${esc(e.detail?.after?.status||'')}<br>${esc(e.detail?.after?.transfer_reason||'Penetapan awal')}</p></article>`).join('')||'<p class="help">Belum ada riwayat.</p>'}`);
  }
  async function write(table,payload,old=null) {
    let req=old?client.from(table).update(payload).eq('id',old.id).eq('version',old.version):client.from(table).insert(payload);
    const result=await req.select('*').maybeSingle(); if(result.error)throw result.error; if(!result.data)throw {code:'CONFLICT'}; return result.data;
  }
  root.addEventListener('click',e=>{
    const b=e.target.closest('[data-online]'); if(!b||!allowed()||busy())return;
    const a=b.dataset.online;
    if(a==='reload') void refresh();
    if(a==='tab'){tab=b.dataset.tab;selectedClient=null;paint();}
    if(a==='cancel') root.querySelector('#online-editor').replaceChildren();
    if(a==='new-roster')rosterForm(); if(a==='new-exception')rosterForm(true);
    if(a==='new-client')clientForm(); if(a==='client')detail(b.dataset.id);
    if(a==='post')showPost(b.dataset.id);
    if(a==='end-roster') {
      const row=data.roster.find(r=>r.id===b.dataset.id);
      editor('Akhiri masa berlaku',`<form data-online-form="end" data-id="${row.id}"><p>${esc(row.channel)} · ${ONLINE_DAYS[row.weekday]} · ${esc(name(row.agent_id))}</p>${field('Tanggal akhir (masih termasuk jadwal)',input('valid_until',row.valid_until||selectedDate,'date','required'))}<p class="help">Pola pengganti dimulai setelah tanggal ini. Untuk pergantian hari ini, gunakan pengecualian harian.</p><button type="submit" class="button primary">Simpan tanggal akhir</button></form>`);
    }
  });
  root.addEventListener('input',e=>{
    if(!allowed())return;
    if(e.target.name==='first_contact')suggestion();
    if(e.target.name==='client-search'){search=e.target.value;root.querySelector('#online-client-list').innerHTML=clientCards();}
  });
  root.addEventListener('change',e=>{
    if(!allowed()||busy())return;
    if(e.target.name==='online-date' && e.target.value){selectedDate=e.target.value;paint();}
    if(e.target.name==='client-status'){statusFilter=e.target.value;root.querySelector('#online-client-list').innerHTML=clientCards();}
    if(e.target.name==='client-owner'){ownerFilter=e.target.value;root.querySelector('#online-client-list').innerHTML=clientCards();}
  });
  root.addEventListener('submit',async e=>{
    const form=e.target.closest('[data-online-form]'); if(!form)return; e.preventDefault();
    if(!allowed()||busy())return;
    const values=Object.fromEntries(new FormData(form)),kind=form.dataset.onlineForm,token=epoch;
    const controls=[...root.querySelectorAll('input,select,textarea,button')].map(el=>({el,disabled:el.disabled}));
    controls.forEach(({el})=>el.disabled=true);setBusy(true);
    let committed=false;
    try {
      if(kind==='roster') {
        if(values.ends_at<=values.starts_at)throw {code:'23514',message:'Jam selesai harus setelah jam mulai.'};
        await write('ps_online_roster',{channel:values.channel,weekday:values.exception?new Date(values.valid_from+'T12:00:00+07:00').getUTCDay():Number(values.weekday),valid_from:values.valid_from,valid_until:values.exception?values.valid_from:values.valid_until||null,exception_date:values.exception?values.valid_from:null,starts_at:values.starts_at,ends_at:values.ends_at,agent_id:values.agent_id||null,reason:values.reason.trim()});
      }
      if(kind==='end')await write('ps_online_roster',{valid_until:values.valid_until},data.roster.find(r=>r.id===form.dataset.id));
      if(kind==='client')await write('ps_online_clients',{name:values.name.trim(),line_id:values.line_id.trim()||null,first_contact_at:fromWib(values.first_contact),owner_id:values.owner_id||null,transfer_reason:values.transfer_reason.trim(),summary:values.summary.trim()});
      if(kind==='client-edit')await write('ps_online_clients',{name:values.name.trim(),line_id:values.line_id.trim()||null,summary:values.summary.trim()},data.clients.find(c=>c.id===form.dataset.id));
      if(kind==='status')await write('ps_online_clients',{status:values.status},data.clients.find(c=>c.id===form.dataset.id));
      if(kind==='transfer')await write('ps_online_clients',{owner_id:values.owner_id,transfer_reason:values.transfer_reason.trim()},data.clients.find(c=>c.id===form.dataset.id));
      if(kind==='note')await write('ps_online_notes',{client_id:form.dataset.id,body:values.body.trim(),occurred_at:fromWib(values.occurred_at)});
      committed=true;
      if(token===epoch&&allowed()){toast('Perubahan layanan online tersimpan.'); await refresh(); if(['status','transfer','note','client-edit'].includes(kind)&&active())detail(form.dataset.id);}
    } catch(error) {if(token===epoch&&allowed())toast(errorText(error));}
    finally {setBusy(false); if(!committed)controls.forEach(({el,disabled})=>el.disabled=disabled);}
  });
  async function publicationPreview(element, post) {
    if(!element || !allowed()) return;
    const token=Symbol(); element.onlineRequest=token;
    if(post.status==='Terbit' || post.onlinePublisher) {
      element.textContent = 'Petugas publikasi tersimpan: ' + (post.onlinePublisher ? name(post.onlinePublisher) : 'Belum tercatat untuk publikasi ini');
      return;
    }
    if(!post.date || !post.time) {element.textContent='Isi tanggal dan jam untuk melihat petugas publikasi.';return;}
    element.textContent='Memeriksa petugas publikasi…';
    try {
      const r=await client.rpc('ps_online_resolve',{channel_name:'Instagram',contact_at:fromWib(post.date+'T'+post.time.slice(0,5))});
      if(r.error)throw r.error;
      if(element.isConnected && allowed() && element.onlineRequest===token)
        element.textContent='Petugas publikasi sesuai jadwal: '+(r.data?name(r.data):'Belum ditentukan — atur jadwal online pada tanggal dan jam ini.');
    } catch {
      if(element.isConnected && allowed() && element.onlineRequest===token)
        element.textContent='Petugas publikasi belum dapat diperiksa. Coba muat ulang layanan online.';
    }
  }
  return {render:refresh,publicationPreview,reset(){epoch++;data={roster:[],clients:[],notes:[],events:[]};selectedClient=null;search='';statusFilter='';ownerFilter='';}};
}
