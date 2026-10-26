export const ONLINE_DAYS = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
export const ONLINE_CHANNELS = ['Instagram','OA LINE'];
export const CLIENT_STATUSES = ['Baru','Dalam penanganan','Menunggu klien','Selesai'];
export const eligibleOnlineAgent = a => Boolean(a?.active && a.division === 'Pelayanan dan Konsultasi');
export const onlineWeekday = date => new Date(`${date}T12:00:00+07:00`).getUTCDay();
export function onlineAssignment(roster, agents, channel, date, time = null) {
  const row = roster.filter(r => r.channel === channel && r.weekday === onlineWeekday(date)
    && r.valid_from <= date && (!r.valid_until || r.valid_until >= date)
    && (!r.exception_date || r.exception_date === date))
    .sort((a,b) => Number(Boolean(b.exception_date)) - Number(Boolean(a.exception_date)))[0];
  if (!row) return {row:null,agent:null,reason:'Belum ada jadwal'};
  const agent = agents.find(a => a.id === row.agent_id);
  if (!row.agent_id) return {row,agent:null,reason:'Tidak ada petugas · pengecualian harian'};
  if (!eligibleOnlineAgent(agent)) return {row,agent:null,reason:'Petugas nonaktif atau bukan Pelayanan dan Konsultasi'};
  if (time && (time.slice(0,5) < row.starts_at.slice(0,5) || time.slice(0,5) >= row.ends_at.slice(0,5)))
    return {row,agent:null,reason:'Di luar jam layanan'};
  return {row,agent,reason:''};
}
export function wibDateTime(value) {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value));
  const p = Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export function fromWib(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw Error('Isi tanggal dan jam WIB yang valid.');
  return new Date(value + ':00+07:00').toISOString();
}
