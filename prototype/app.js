"use strict";
// Interactive design prototype. All records are fictional and stay in this browser.
const STORAGE_KEY = "pojok-workspace-prototype-v1";
const TODAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const BASE = TODAY.slice(0, 7);
const icons = {
  home: "M3 10 12 3l9 7M5 9v11h5v-6h4v6h5V9",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  calendar:
    "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2M8 14h2M14 14h2M8 18h2",
  content: "M5 3h14v18H5zM8 7h8M8 11h8M8 15h5",
  arrow: "M5 12h14M13 6l6 6-6 6",
  right: "m9 5 7 7-7 7",
  left: "m15 5-7 7 7 7",
  plus: "M12 5v14M5 12h14",
  check: "m5 12 4 4L19 6",
  clock: "M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  close: "m6 6 12 12M6 18 18 6",
  image: "M3 3h18v18H3zM3 17l6-6 4 4 3-3 5 5M9 7h.01",
  edit: "m14 4 6 6M4 20l5-1L21 7l-4-4L5 15z",
  info: "M12 11v6M12 7h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  trend: "m3 17 6-6 4 4 8-10M15 5h6v6",
  review: "M9 3h6v4H9zM9 5H5v16h14V5h-4M8 13l3 3 5-6",
  spark: "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z",
  mail: "M3 5h18v14H3zM3 5l9 8 9-8",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
};
const icon = (name) =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[name] || icons.content}"/></svg>`;
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const id = () => crypto.randomUUID();
const formatDate = (
  date,
  opts = { day: "numeric", month: "long", year: "numeric" },
) =>
  new Intl.DateTimeFormat("id-ID", opts).format(
    new Date(`${date}T12:00:00+07:00`),
  );
const monthLabel = (date) =>
  formatDate(`${date}-01`, { month: "long", year: "numeric" });
const shortDate = (date) =>
  formatDate(date, { day: "numeric", month: "short" });
const dateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const offsetDate = (base, offset) => {
  const d = new Date(`${base}T12:00:00`);
  d.setDate(d.getDate() + offset);
  return dateKey(d);
};
const statuses = [
  "Ide",
  "Dikerjakan",
  "Review",
  "Disetujui",
  "Dijadwalkan",
  "Terbit",
];
const divisions = ["Pengurus Inti", "Media Kreatif", "Analisis & Pelayanan"];
function seed() {
  const agents = [
    {
      id: "a1",
      name: "Nadia Putri",
      division: "Pengurus Inti",
      position: "Ketua Agen",
      initials: "NP",
    },
    {
      id: "a2",
      name: "Raka Pratama",
      division: "Analisis & Pelayanan",
      position: "Koordinator Divisi",
      initials: "RP",
    },
    {
      id: "a3",
      name: "Alya Maharani",
      division: "Media Kreatif",
      position: "Koordinator Divisi",
      initials: "AM",
    },
    {
      id: "a4",
      name: "Dimas Saputra",
      division: "Analisis & Pelayanan",
      position: "Anggota",
      initials: "DS",
    },
    {
      id: "a5",
      name: "Safira Rahma",
      division: "Media Kreatif",
      position: "Anggota",
      initials: "SR",
    },
    {
      id: "a6",
      name: "Bima Aditya",
      division: "Analisis & Pelayanan",
      position: "Anggota",
      initials: "BA",
    },
    {
      id: "a7",
      name: "Kirana Dewi",
      division: "Media Kreatif",
      position: "Anggota",
      initials: "KD",
    },
    {
      id: "a8",
      name: "Farhan Akbar",
      division: "Pengurus Inti",
      position: "Sekretaris & Bendahara",
      initials: "FA",
    },
  ].map((a) => ({ ...a, active: true, photo: "", period: "2026 / 2027" }));
  const posts = [
    {
      id: "p1",
      title: "Kenalan dengan Pojok Statistik UI",
      date: offsetDate(TODAY, -3),
      time: "18:30",
      format: "Carousel",
      status: "Terbit",
      agent: "a3",
      category: "Kenali Pojok",
      brief: "Perkenalkan ruang, layanan, dan kegiatan Pojok Statistik UI.",
      caption:
        "Satu ruang untuk belajar, berdiskusi, dan bercerita lewat data. Kenali Pojok Statistik UI lebih dekat!\n\n#PojokStatistikUI #BerceritaDenganData",
      link: "https://www.instagram.com/",
      images: [],
    },
    {
      id: "p2",
      title: "Data di balik kebiasaan membaca",
      date: TODAY,
      time: "19:00",
      format: "Carousel",
      status: "Review",
      agent: "a5",
      category: "Cerita Data",
      brief:
        "Carousel 5 slide tentang kebiasaan membaca. Sertakan sumber statistik pada slide terakhir.",
      caption:
        "Seberapa dekat kita dengan buku? 📚\n\nYuk, lihat cerita di balik data kebiasaan membaca.\n\n#CeritaData #PojokStatistikUI",
      link: "",
      images: [],
    },
    {
      id: "p3",
      title: "Seminggu bersama Pojok Statistik",
      date: offsetDate(TODAY, 2),
      time: "17:00",
      format: "Reel",
      status: "Dikerjakan",
      agent: "a7",
      category: "Di Balik Pojok",
      brief: "Rangkuman aktivitas mingguan dan suasana ruang pelayanan.",
      caption: "Sepotong cerita dari Pojok Statistik minggu ini. ✨",
      link: "",
      images: [],
    },
    {
      id: "p4",
      title: "Statistik itu dekat dengan kita",
      date: offsetDate(TODAY, 4),
      time: "18:00",
      format: "Feed",
      status: "Dijadwalkan",
      agent: "a3",
      category: "Literasi Statistik",
      brief: "Infografis ringan tentang statistik dalam keseharian mahasiswa.",
      caption:
        "Dari perjalanan ke kampus sampai pilihan makan siang, data ada di mana-mana.\n\n#LiterasiStatistik",
      link: "",
      images: [],
    },
    {
      id: "p5",
      title: "Kenali agen: tim analisis",
      date: `${BASE}-07`,
      time: "12:00",
      format: "Carousel",
      status: "Terbit",
      agent: "a7",
      category: "Kenali Pojok",
      brief: "Perkenalan tim analisis.",
      caption:
        "Kenalan dengan orang-orang di balik pelayanan Pojok Statistik UI.",
      link: "https://www.instagram.com/",
      images: [],
    },
    {
      id: "p6",
      title: "Polling: topik data favoritmu",
      date: `${BASE}-14`,
      time: "16:00",
      format: "Story",
      status: "Terbit",
      agent: "a5",
      category: "Interaksi",
      brief: "Polling topik data untuk konten berikutnya.",
      caption: "Kamu ingin belajar data tentang apa?",
      link: "https://www.instagram.com/",
      images: [],
    },
    {
      id: "p7",
      title: "Angka yang bercerita",
      date: offsetDate(TODAY, 6),
      time: "18:30",
      format: "Carousel",
      status: "Ide",
      agent: "a3",
      category: "Cerita Data",
      brief: "Eksplorasi visualisasi data sederhana.",
      caption: "",
      link: "",
      images: [],
    },
  ];
  const shifts = [
    {
      id: "s1",
      date: TODAY,
      agent: "a2",
      session: "Pagi",
      pj: true,
      status: "Hadir",
      time: "09:57",
    },
    {
      id: "s2",
      date: TODAY,
      agent: "a4",
      session: "Pagi",
      pj: false,
      status: "Hadir",
      time: "10:02",
    },
    {
      id: "s3",
      date: TODAY,
      agent: "a6",
      session: "Pagi",
      pj: false,
      status: "Izin",
      time: "",
    },
    {
      id: "s4",
      date: TODAY,
      agent: "a1",
      session: "Siang",
      pj: true,
      status: "Belum dicatat",
      time: "",
    },
    {
      id: "s5",
      date: TODAY,
      agent: "a5",
      session: "Siang",
      pj: false,
      status: "Belum dicatat",
      time: "",
    },
    {
      id: "s6",
      date: offsetDate(TODAY, 1),
      agent: "a7",
      session: "Pagi",
      pj: false,
      status: "Belum dicatat",
      time: "",
    },
  ];
  return { version: 1, agents, posts, shifts };
}
let storageProblem = false;
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    const s = JSON.parse(raw);
    if (
      s.version !== 1 ||
      !Array.isArray(s.agents) ||
      !Array.isArray(s.posts) ||
      !Array.isArray(s.shifts)
    )
      throw Error("invalid");
    return s;
  } catch {
    storageProblem = true;
    return seed();
  }
}
let state = load();
let page = "beranda",
  agentSearch = "",
  divisionFilter = "",
  contentFilter = "",
  calendarMonth = BASE,
  calendarView = window.matchMedia("(max-width: 720px)").matches
    ? "list"
    : "calendar",
  attendanceDate = TODAY,
  attendanceSession = "";
let toastTimer, lastFocused;
const dialog = document.querySelector("#detail-dialog");
const main = document.querySelector("#main");
const findAgent = (agentId) => state.agents.find((a) => a.id === agentId);
const agentName = (agentId) => findAgent(agentId)?.name || "Belum ditentukan";
const validImage = (src) =>
  typeof src === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(src);
function avatar(agent, large = "") {
  if (!agent) return "";
  const n = state.agents.indexOf(agent) % 4;
  return `<span class="avatar color-${n} ${large}">${validImage(agent.photo) ? `<img src="${agent.photo}" alt="Foto ${esc(agent.name)}">` : esc(agent.initials)}</span>`;
}
function badge(status) {
  const color =
    {
      Hadir: "green",
      Aktif: "green",
      Terbit: "green",
      Disetujui: "green",
      Dijadwalkan: "blue",
      Review: "amber",
      Izin: "amber",
      Sakit: "amber",
      Dikerjakan: "purple",
      "Tidak hadir": "red",
    }[status] || "";
  return `<span class="status ${color}">${esc(status)}</span>`;
}
function person(agentId) {
  const a = findAgent(agentId);
  return a
    ? `<div class="person">${avatar(a)}<span><strong>${esc(a.name)}</strong><small>${esc(a.division)}</small></span></div>`
    : "—";
}
function toast(message) {
  clearTimeout(toastTimer);
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.classList.add("show");
  toastTimer = setTimeout(() => el.classList.remove("show"), 4500);
}
function save(next, message) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    state = next;
    if (message) toast(message);
    return true;
  } catch {
    toast(
      "Penyimpanan browser penuh atau tidak tersedia. Perubahan belum disimpan.",
    );
    return false;
  }
}
function update(mutator, message) {
  const next = structuredClone(state);
  mutator(next);
  return save(next, message);
}
function header(eyebrow, title, description, actions = "") {
  return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="subtitle">${description}</p></div><div class="heading-actions">${actions}</div></div>`;
}
function metric(title, value, suffix, note, ic) {
  return `<div class="metric"><div class="metric-title">${title}${icon(ic)}</div><div class="metric-value">${value}<small>${suffix}</small></div><div class="metric-note">${note}</div></div>`;
}
function tile(post) {
  return `<span class="content-tile ${post.format === "Reel" ? "violet" : post.format === "Story" ? "sand" : ""}" aria-hidden="true">${icon(post.format === "Reel" ? "spark" : "trend")}<small>POJOK STATISTIK</small></span>`;
}
function upcomingRow(post) {
  return `<button class="upcoming-row" data-action="post" data-id="${esc(post.id)}">${tile(post)}<span class="upcoming-text"><strong>${esc(post.title)}</strong><p>${shortDate(post.date)} · ${esc(post.time)} WIB · ${esc(post.format)}</p>${badge(post.status)}</span>${icon("right")}</button>`;
}
function renderNav() {
  const items = [
    ["beranda", "home", "Beranda"],
    ["agen", "users", "Direktori Agen"],
    ["kehadiran", "calendar", "Jadwal & Kehadiran"],
    ["konten", "content", "Konten & Publikasi"],
  ];
  document.querySelector("#navigation").innerHTML = items
    .map(
      ([key, ic, label]) =>
        `<a href="#${key}" class="nav-item ${page === key ? "active" : ""}" ${page === key ? 'aria-current="page"' : ""}>${icon(ic)}<span>${label}</span>${key === "konten" ? `<span class="nav-count">${state.posts.filter((p) => p.status === "Review").length}</span>` : ""}</a>`,
    )
    .join("");
  document.querySelector("#breadcrumb").textContent = items.find(
    (x) => x[0] === page,
  )[2];
  document.title = `${items.find((x) => x[0] === page)[2]} · Pojok Statistik UI`;
}
function render() {
  renderNav();
  if (page === "beranda") renderHome();
  if (page === "agen") renderAgents();
  if (page === "kehadiran") renderAttendance();
  if (page === "konten") renderContent();
}
function renderHome() {
  const shifts = state.shifts.filter((s) => s.date === TODAY),
    present = shifts.filter((s) => s.status === "Hadir").length,
    pending = shifts.filter((s) => s.status === "Belum dicatat").length,
    review = state.posts.filter((p) => p.status === "Review");
  const upcoming = state.posts
    .filter((p) => p.status !== "Terbit")
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 3);
  main.innerHTML =
    header(
      "RUANG KERJA POJOK STATISTIK",
      "Selamat datang, Admin.",
      "Semua agenda, anggota, dan karya — dalam satu ruang.",
      `<a href="#kehadiran" class="button">${icon("calendar")}Lihat jadwal</a><button class="button primary" data-action="new-post">${icon("plus")}Buat konten</button>`,
    ) +
    `<section class="hero" aria-label="Ringkasan hari ini"><div class="hero-copy"><p class="eyebrow">${formatDate(TODAY, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p><h2>Kontribusi kecil.<br>Dampak yang berarti.</h2><p>Ada ${shifts.length} penugasan jaga dan ${state.posts.filter((p) => p.date === TODAY).length} agenda publikasi hari ini. Mari pastikan semuanya berjalan baik.</p><a href="#kehadiran" class="text-button hero-link">Kelola aktivitas hari ini ${icon("arrow")}</a></div><div class="hero-art" aria-hidden="true"><span class="art-star">✳</span><div class="art-bar"></div><div class="art-bar"></div><div class="art-bar"></div></div></section>` +
    `<section class="metrics" aria-label="Ringkasan operasional">${metric("Agen aktif", state.agents.filter((a) => a.active).length, "agen", "Dalam periode kepengurusan ini", "users")}${metric("Kehadiran hari ini", present, `/ ${shifts.length}`, `${pending} penugasan belum dicatat`, "check")}${metric("Menunggu review", review.length, "konten", "Perlu pemeriksaan admin", "review")}${metric("Publikasi bulan ini", state.posts.filter((p) => p.status === "Terbit" && p.date.startsWith(BASE)).length, "konten", monthLabel(BASE), "content")}</section>` +
    `<div class="dashboard-grid"><div class="panel"><div class="panel-header"><div><h2 class="panel-title">Jadwal jaga hari ini</h2><p class="panel-description">${formatDate(TODAY, { weekday: "long", day: "numeric", month: "long" })} · Semua sesi</p></div><a class="text-button" href="#kehadiran">Lihat semua ${icon("arrow")}</a></div><div class="table-scroll"><table><thead><tr><th>AGEN</th><th>SESI</th><th>STATUS</th></tr></thead><tbody>${shifts.length ? shifts.map((s) => `<tr><td>${person(s.agent)}</td><td>${s.session}<br><small class="muted">${s.pj ? "Penanggung jawab" : "Anggota"}</small></td><td>${badge(s.status)}</td></tr>`).join("") : '<tr><td colspan="3">Belum ada penugasan hari ini.</td></tr>'}</tbody></table></div><div class="panel-foot">${icon("info")}Kehadiran dicatat dan dikelola oleh admin.</div></div>
 <div class="stack"><section class="panel"><div class="panel-header"><h2 class="panel-title">Perlu ditindaklanjuti</h2><span class="pill-count">${Number(review.length > 0) + Number(pending > 0)}</span></div><div class="task-list">${review.length ? `<button class="task-row" data-action="review-filter"><span class="task-icon">${icon("review")}</span><span><strong>${review.length} konten menunggu review</strong><small>Periksa materi sebelum publikasi</small></span>${icon("right")}</button>` : ""}${pending ? `<a class="task-row" href="#kehadiran"><span class="task-icon blue">${icon("clock")}</span><span><strong>${pending} kehadiran belum dicatat</strong><small>Lengkapi catatan penugasan hari ini</small></span>${icon("right")}</a>` : ""}${!pending && !review.length ? '<p class="help">Semua tindak lanjut sudah selesai.</p>' : ""}</div></section><section class="panel"><div class="panel-header"><h2 class="panel-title">Agenda publikasi</h2><a href="#konten" class="text-button">Kalender ${icon("arrow")}</a></div><div class="upcoming">${upcoming.map(upcomingRow).join("") || '<p class="help">Belum ada agenda publikasi.</p>'}</div></section></div></div>`;
}
function agentCards() {
  const q = agentSearch.toLocaleLowerCase("id");
  return state.agents.filter(
    (a) =>
      (!divisionFilter || a.division === divisionFilter) &&
      `${a.name} ${a.position} ${a.division}`
        .toLocaleLowerCase("id")
        .includes(q),
  );
}
function renderAgents() {
  main.innerHTML =
    header(
      "ORANG-ORANG DI BALIK POJOK",
      "Direktori agen",
      "Seluruh agen Pojok Statistik UI, beserta peran dan kontribusinya.",
      `<button class="button primary" data-action="new-agent">${icon("plus")}Tambah agen</button>`,
    ) +
    `<div class="toolbar"><div class="filters"><label class="search-field">${icon("search")}<input class="input" id="agent-search" type="search" placeholder="Cari nama atau jabatan..." aria-label="Cari agen" value="${esc(agentSearch)}"></label><select id="division-filter" aria-label="Filter divisi"><option value="">Semua divisi</option>${divisions.map((d) => `<option ${divisionFilter === d ? "selected" : ""}>${esc(d)}</option>`).join("")}</select></div><span class="result-count" id="agent-count"></span></div><div class="agent-grid" id="agent-grid"></div>`;
  renderAgentCards();
}
function renderAgentCards() {
  const list = agentCards();
  document.querySelector("#agent-count").textContent =
    `${list.length} dari ${state.agents.length} agen`;
  document.querySelector("#agent-grid").innerHTML =
    list
      .map(
        (a) =>
          `<button class="agent-card" data-action="agent" data-id="${esc(a.id)}"><span class="agent-card-top">${avatar(a)}${badge(a.active ? "Aktif" : "Nonaktif")}</span><h2>${esc(a.name)}</h2><p>${esc(a.position)}</p><span class="division-label">${esc(a.division)}</span><span class="agent-card-bottom"><span>${state.shifts.filter((s) => s.agent === a.id && s.date >= TODAY).length} penugasan mendatang</span>${icon("arrow")}</span></button>`,
      )
      .join("") ||
    '<div class="empty">Tidak ada agen yang sesuai. Coba nama atau divisi lain.</div>';
}
function renderAttendance() {
  const shifts = state.shifts.filter(
    (s) =>
      s.date === attendanceDate &&
      (!attendanceSession || s.session === attendanceSession),
  );
  main.innerHTML =
    header(
      "OPERASIONAL TIM",
      "Jadwal & kehadiran",
      "Atur penugasan bertanggal dan catat kehadiran setiap agen.",
      `<button class="button primary" data-action="new-shift">${icon("plus")}Tambah penugasan</button>`,
    ) +
    `<div class="toolbar"><div class="attendance-date"><button class="icon-button" data-action="prev-day" aria-label="Hari sebelumnya">${icon("left")}</button><input class="input" id="attendance-date" type="date" aria-label="Tanggal kehadiran" value="${attendanceDate}" required><button class="icon-button" data-action="next-day" aria-label="Hari berikutnya">${icon("right")}</button><button class="button" data-action="today-attendance">Hari ini</button></div><select id="session-filter" aria-label="Filter sesi"><option value="">Semua sesi</option>${["Pagi", "Siang"].map((s) => `<option ${attendanceSession === s ? "selected" : ""}>${s}</option>`).join("")}</select></div><div class="banner">${icon("info")}Pencatatan dilakukan oleh admin. Agen tidak memiliki akun login.</div><section class="metrics">${metric("Terjadwal", shifts.length, "agen", "Pada tanggal dan sesi terpilih", "users")}${metric("Hadir", shifts.filter((s) => s.status === "Hadir").length, "agen", "Kehadiran sudah dicatat", "check")}${metric("Izin / sakit", shifts.filter((s) => ["Izin", "Sakit"].includes(s.status)).length, "agen", "Sesuai catatan admin", "mail")}${metric("Belum dicatat", shifts.filter((s) => s.status === "Belum dicatat").length, "agen", "Menunggu pencatatan", "clock")}</section><section class="panel"><div class="panel-header"><div><h2 class="panel-title">${formatDate(attendanceDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h2><p class="panel-description">Jam operasional contoh · Pagi 10.00–12.30 · Siang 13.30–16.00 WIB</p></div></div>${
      shifts.length
        ? ["Pagi", "Siang"]
            .filter((session) => shifts.some((s) => s.session === session))
            .map(
              (session) =>
                `<div class="shift-heading"><span>SESI ${session.toUpperCase()}</span><span>${shifts.filter((s) => s.session === session).length} agen</span></div><div class="table-scroll"><table><thead><tr><th>AGEN</th><th>PERAN</th><th>KEHADIRAN</th><th>JAM HADIR (WIB)</th><th>AKSI</th></tr></thead><tbody>${shifts
                  .filter((s) => s.session === session)
                  .map(
                    (s) =>
                      `<tr><td>${person(s.agent)}</td><td>${s.pj ? "PJ sesi" : "Anggota"}</td><td>${badge(s.status)}</td><td>${esc(s.time) || "—"}</td><td><button class="text-button" data-action="attendance" data-id="${esc(s.id)}">${icon("edit")}Catat</button></td></tr>`,
                  )
                  .join("")}</tbody></table></div>`,
            )
            .join("")
        : '<div class="empty">Belum ada penugasan pada tanggal ini. Gunakan “Tambah penugasan” untuk mengatur jadwal.</div>'
    }<div class="panel-foot">${icon("info")}Status belum dicatat tidak otomatis dianggap tidak hadir.</div></section>`;
}
function filteredPosts() {
  return state.posts
    .filter(
      (p) =>
        p.date.startsWith(calendarMonth) &&
        (!contentFilter || p.status === contentFilter),
    )
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}
function renderContent() {
  const posts = filteredPosts(),
    monthPosts = state.posts.filter((p) => p.date.startsWith(calendarMonth)),
    published = monthPosts.filter((p) => p.status === "Terbit").length;
  main.innerHTML =
    header(
      "DARI IDE MENJADI CERITA",
      "Konten & publikasi",
      "Rencanakan karya, rapikan proses, dan jaga ritme publikasi.",
      `<button class="button primary" data-action="new-post">${icon("plus")}Buat konten</button>`,
    ) +
    `<div class="toolbar"><div class="filters"><select id="content-filter" aria-label="Filter status konten"><option value="">Semua status</option>${statuses.map((s) => `<option ${s === contentFilter ? "selected" : ""}>${s}</option>`).join("")}</select><span class="result-count">${posts.length} konten · Instagram</span></div><div class="view-toggle" aria-label="Tampilan konten"><button data-action="calendar-view" class="${calendarView === "calendar" ? "active" : ""}" aria-pressed="${calendarView === "calendar"}">Kalender</button><button data-action="list-view" class="${calendarView === "list" ? "active" : ""}" aria-pressed="${calendarView === "list"}">Daftar</button></div></div><div class="editorial-grid"><section class="panel"><div class="calendar-toolbar"><h2>${monthLabel(calendarMonth)}</h2><div class="calendar-controls"><button class="button" data-action="this-month">Bulan ini</button><button class="icon-button" data-action="prev-month" aria-label="Bulan sebelumnya">${icon("left")}</button><button class="icon-button" data-action="next-month" aria-label="Bulan berikutnya">${icon("right")}</button></div></div>${calendarView === "calendar" ? calendar(posts) : postList(posts)}<div class="calendar-legend"><span><i class="legend-dot purple"></i>Dikerjakan</span><span><i class="legend-dot amber"></i>Review</span><span><i class="legend-dot blue"></i>Dijadwalkan</span><span><i class="legend-dot"></i>Ide / disetujui / terbit</span></div></section><aside class="stack editorial-aside"><section class="panel"><div class="panel-header"><div><h2 class="panel-title">Progres bulan ini</h2><p class="panel-description">${monthLabel(calendarMonth)}</p></div>${icon("trend")}</div><div class="editorial-summary"><div class="progress-label"><span>Sudah terbit</span><strong>${published} / ${monthPosts.length}</strong></div><div class="progress-track"><span style="width:${monthPosts.length ? (published / monthPosts.length) * 100 : 0}%"></span></div><div class="progress-label"><span>Perlu review</span><strong>${monthPosts.filter((p) => p.status === "Review").length} konten</strong></div></div></section><section class="panel"><div class="panel-header"><h2 class="panel-title">Dalam pengerjaan</h2></div><div class="upcoming">${
      monthPosts
        .filter((p) => ["Dikerjakan", "Review"].includes(p.status))
        .slice(0, 3)
        .map(upcomingRow)
        .join("") || '<p class="help">Tidak ada konten dalam pengerjaan.</p>'
    }</div></section><section class="hint-card">${icon("spark")}<h3>Ruang untuk cerita berikutnya.</h3><p>Klik + pada tanggal untuk merencanakan konten. Setelah diposting di Instagram, tambahkan tautannya dan tandai terbit.</p></section></aside></div>`;
}
function postColor(post) {
  return (
    { Review: "amber", Dikerjakan: "purple", Dijadwalkan: "blue" }[
      post.status
    ] || ""
  );
}
function calendar(posts) {
  const first = new Date(`${calendarMonth}-01T12:00:00`),
    start = new Date(first);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const daysInMonth = new Date(
      first.getFullYear(),
      first.getMonth() + 1,
      0,
    ).getDate(),
    cells = Math.ceil((((first.getDay() + 6) % 7) + daysInMonth) / 7) * 7;
  let html =
    '<div class="calendar-grid">' +
    ["SEN", "SEL", "RAB", "KAM", "JUM", "SAB", "MIN"]
      .map((d) => `<div class="weekday">${d}</div>`)
      .join("");
  for (let n = 0; n < cells; n++) {
    const d = new Date(start);
    d.setDate(start.getDate() + n);
    const key = dateKey(d);
    html += `<div class="calendar-day ${key === TODAY ? "today" : ""} ${!key.startsWith(calendarMonth) ? "outside" : ""}"><div class="day-top"><span class="day-number">${d.getDate()}</span><button class="add-day" data-action="new-post" data-date="${key}" aria-label="Buat konten ${formatDate(key)}">+</button></div>${posts
      .filter((p) => p.date === key)
      .map(
        (p) =>
          `<button class="calendar-event ${postColor(p)}" data-action="post" data-id="${esc(p.id)}" aria-label="${esc(p.title)}, ${esc(p.time)} WIB, ${esc(p.status)}"><time>${esc(p.time)} · ${esc(p.format)}</time><strong>${esc(p.title)}</strong></button>`,
      )
      .join("")}</div>`;
  }
  return html + "</div>";
}
function postList(posts) {
  return posts.length
    ? `<div class="table-scroll post-list"><table><thead><tr><th>KONTEN</th><th>PUBLIKASI</th><th>PIC</th><th>STATUS</th></tr></thead><tbody>${posts.map((p) => `<tr><td><button class="list-content-title" data-action="post" data-id="${esc(p.id)}">${esc(p.title)}</button><br><small class="muted">${esc(p.format)}</small></td><td>${shortDate(p.date)}<br><small class="muted">${esc(p.time)} WIB</small></td><td>${esc(agentName(p.agent))}</td><td>${badge(p.status)}</td></tr>`).join("")}</tbody></table></div>`
    : '<div class="empty">Tidak ada konten pada bulan atau status ini.</div>';
}
function openDialog(title, eyebrow, body) {
  lastFocused = document.activeElement;
  document.querySelector("#dialog-content").innerHTML =
    `<div class="dialog-header"><div><p class="eyebrow">${eyebrow}</p><h2 id="dialog-title">${esc(title)}</h2></div><button class="icon-button" data-action="close" aria-label="Tutup panel">${icon("close")}</button></div><div class="dialog-body">${body}</div>`;
  // Keep field names separate from option text and longer help descriptions.
  dialog.querySelectorAll(".form-field").forEach((label, index) => {
    const control = label.querySelector("input, select, textarea");
    const title = label.querySelector("span");
    const help = label.querySelector(".help");
    if (control && title) control.setAttribute("aria-label", title.textContent);
    if (control && help) {
      help.id = `field-help-${index}`;
      control.setAttribute("aria-describedby", help.id);
    }
  });
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}
function closeDialog() {
  dialog.close();
}
dialog.addEventListener("close", () => {
  if (lastFocused?.isConnected) lastFocused.focus();
});
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right) closeDialog();
  }
});
function openAgent(agentId) {
  const a = findAgent(agentId);
  if (!a) return;
  const shifts = state.shifts.filter((s) => s.agent === a.id),
    assigned = state.posts.filter((p) => p.agent === a.id);
  openDialog(
    "Profil agen",
    "DIREKTORI POJOK STATISTIK",
    `<div class="profile-hero">${avatar(a)}<div><h3>${esc(a.name)}</h3><p>${esc(a.position)}</p><span class="division-label">${esc(a.division)}</span></div></div><div class="photo-control"><label class="field-label" for="agent-photo">Foto profil</label><input type="file" id="agent-photo" data-agent="${esc(a.id)}" accept="image/png,image/jpeg,image/webp"><p class="help">JPG, PNG, atau WebP, maksimal 5 MB. Foto dipotong persegi dan diperkecil sebelum disimpan dalam demo.</p>${a.photo ? `<button class="text-button" data-action="remove-photo" data-id="${esc(a.id)}">Hapus foto</button>` : ""}</div><dl class="profile-data"><div><dt>Periode</dt><dd>${esc(a.period)}</dd></div><div><dt>Status keanggotaan</dt><dd>${badge(a.active ? "Aktif" : "Nonaktif")}</dd></div></dl><div class="profile-note">Profil ini merupakan data anggota. Agen tidak memiliki akun login; seluruh pengelolaan dilakukan admin.</div><section class="profile-section"><h3>Penugasan jaga <span class="pill-count">${shifts.length}</span></h3>${shifts.length ? shifts.map((s) => `<div class="task-row"><span class="task-icon blue">${icon("calendar")}</span><span><strong>${shortDate(s.date)} · Sesi ${s.session}</strong><small>${s.pj ? "Penanggung jawab sesi" : "Anggota"}</small></span>${badge(s.status)}</div>`).join("") : '<p class="help">Belum ada penugasan.</p>'}</section><section class="profile-section"><h3>Kontribusi konten <span class="pill-count">${assigned.length}</span></h3>${assigned.map(upcomingRow).join("") || '<p class="help">Belum ada konten yang ditugaskan.</p>'}</section><div class="dialog-footer"><span class="help">Data contoh · dikelola admin</span><button class="button" data-action="edit-agent" data-id="${esc(a.id)}">${icon("edit")}Edit profil</button></div>`,
  );
}
function options(values, current) {
  return values
    .map(
      (v) =>
        `<option value="${esc(v)}" ${v === current ? "selected" : ""}>${esc(v)}</option>`,
    )
    .join("");
}
function agentOptions(current) {
  return state.agents
    .map(
      (a) =>
        `<option value="${esc(a.id)}" ${a.id === current ? "selected" : ""}>${esc(a.name)}</option>`,
    )
    .join("");
}
function editAgent(agentId) {
  const a = findAgent(agentId) || {
    name: "",
    division: divisions[0],
    position: "Anggota",
    active: true,
  };
  openDialog(
    agentId ? "Edit profil agen" : "Tambah agen",
    "DIREKTORI AGEN",
    `<form id="agent-form" data-id="${esc(agentId || "")}"><label class="form-field"><span>Nama lengkap</span><input class="input" name="name" required maxlength="80" value="${esc(a.name)}" placeholder="Nama lengkap agen"></label><label class="form-field"><span>Divisi</span><select name="division">${options(divisions, a.division)}</select></label><label class="form-field"><span>Jabatan</span><input class="input" name="position" required maxlength="60" value="${esc(a.position)}"></label><label class="form-field"><span>Status</span><select name="active"><option value="true" ${a.active ? "selected" : ""}>Aktif</option><option value="false" ${!a.active ? "selected" : ""}>Nonaktif</option></select></label><p class="profile-note">Menambahkan agen hanya membuat profil anggota. Tidak ada akun atau kredensial yang dibuat.</p><div class="dialog-footer"><button type="button" class="button" data-action="close">Batal</button><button class="button primary" type="submit">Simpan profil</button></div></form>`,
  );
}
function showPost(postId) {
  const p = state.posts.find((x) => x.id === postId);
  if (!p) return;
  const url = safeInstagramUrl(p.link);
  openDialog(
    p.title,
    "DETAIL KONTEN · INSTAGRAM",
    `<div class="content-meta">${badge(p.status)}<span class="division-label" style="margin:0">${esc(p.format)}</span><span class="division-label" style="margin:0">${esc(p.category || "Umum")}</span></div><dl class="profile-data"><div><dt>Rencana publikasi</dt><dd>${formatDate(p.date)}<br>${esc(p.time)} WIB</dd></div><div><dt>Penanggung jawab</dt><dd>${esc(agentName(p.agent))}</dd></div></dl><section class="profile-section"><h3>Brief konten</h3><p class="help">${esc(p.brief || "Belum ada brief.")}</p></section><section class="profile-section"><h3>Caption</h3><div class="content-caption">${esc(p.caption || "Caption belum ditulis.")}</div></section><section class="profile-section"><h3>Materi visual <span class="pill-count">${p.images.length}</span></h3><div class="media-preview">${p.images
      .filter(validImage)
      .map((src, i) => `<img src="${src}" alt="Materi konten slide ${i + 1}">`)
      .join(
        "",
      )}</div>${!p.images.length ? '<p class="help">Belum ada gambar. Unggah materi melalui Edit konten.</p>' : ""}</section>${url ? `<section class="profile-section"><h3>Tautan publikasi</h3><a class="text-button" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Buka di Instagram ${icon("arrow")}</a></section>` : ""}<p class="profile-note">Penjadwalan ini adalah agenda tim. Publikasi dilakukan manual di Instagram, lalu dicatat oleh admin.</p><div class="dialog-footer"><button class="button danger" data-action="delete-post" data-id="${esc(p.id)}">Hapus konten</button><button class="button primary" data-action="edit-post" data-id="${esc(p.id)}">${icon("edit")}Edit konten</button></div>`,
  );
}
let draftImages = [],
  mediaBusy = false;
function editPost(postId, date) {
  const p = state.posts.find((x) => x.id === postId) || {
    title: "",
    date: date || TODAY,
    time: "19:00",
    format: "Carousel",
    status: "Ide",
    agent: state.agents[0]?.id || "",
    category: "",
    brief: "",
    caption: "",
    link: "",
    images: [],
  };
  draftImages = [...p.images];
  openDialog(
    postId ? "Edit konten" : "Rencanakan konten",
    "KALENDER EDITORIAL",
    `<form id="post-form" data-id="${esc(postId || "")}"><label class="form-field"><span>Judul konten</span><input class="input" name="title" required maxlength="120" value="${esc(p.title)}" placeholder="Cerita apa yang ingin dibagikan?"></label><div class="form-row"><label class="form-field"><span>Tanggal publikasi</span><input class="input" name="date" type="date" required value="${p.date}"></label><label class="form-field"><span>Jam publikasi (WIB)</span><input class="input" name="time" type="time" required value="${p.time}"></label></div><div class="form-row"><label class="form-field"><span>Format</span><select name="format">${options(["Feed", "Carousel", "Reel", "Story"], p.format)}</select></label><label class="form-field"><span>Status</span><select name="status" id="post-status">${options(statuses, p.status)}</select></label></div><label class="form-field"><span>Penanggung jawab</span><select name="agent" required>${agentOptions(p.agent)}</select></label><label class="form-field"><span>Kategori / program</span><input class="input" name="category" maxlength="60" value="${esc(p.category)}" placeholder="Contoh: Cerita Data"></label><label class="form-field"><span>Brief & detail pengerjaan</span><textarea name="brief" maxlength="4000" placeholder="Tujuan, sumber data, isi setiap slide, dan catatan untuk tim...">${esc(p.brief)}</textarea></label><label class="form-field"><span>Caption</span><textarea name="caption" maxlength="2200" placeholder="Tulis caption dan hashtag...">${esc(p.caption)}</textarea></label><label class="form-field"><span>Gambar / slide carousel</span><input id="post-images" type="file" accept="image/jpeg,image/png,image/webp" multiple><small class="help">Maksimal 4 gambar contoh, 5 MB per gambar. Urutan unggah menjadi urutan slide. Unggah video belum tersedia dalam prototipe.</small></label><div class="media-preview" id="draft-images"></div><label class="form-field" style="margin-top:20px"><span>Tautan postingan Instagram</span><input class="input" name="link" id="post-link" type="url" value="${esc(p.link)}" placeholder="https://www.instagram.com/p/..." ${p.status === "Terbit" ? "required" : ""}><small class="help">Wajib diisi saat status Terbit. Jadwal tidak memposting otomatis.</small></label><div class="dialog-footer"><button class="button" type="button" data-action="close">Batal</button><button class="button primary" id="save-post" type="submit">Simpan konten</button></div></form>`,
  );
  renderDraftImages();
}
function renderDraftImages() {
  const el = document.querySelector("#draft-images");
  if (el)
    el.innerHTML = draftImages
      .filter(validImage)
      .map(
        (src, i) =>
          `<figure><img src="${src}" alt="Slide ${i + 1}"><button type="button" data-action="remove-draft-image" data-index="${i}">Hapus slide ${i + 1}</button></figure>`,
      )
      .join("");
}
function safeInstagramUrl(value) {
  if (!value) return "";
  try {
    const u = new URL(value);
    return u.protocol === "https:" &&
      (u.hostname === "instagram.com" || u.hostname === "www.instagram.com")
      ? u.href
      : "";
  } catch {
    return "";
  }
}
function editShift() {
  openDialog(
    "Tambah penugasan",
    "JADWAL TIM",
    `<form id="shift-form"><label class="form-field"><span>Agen</span><select name="agent" required>${agentOptions("")}</select></label><label class="form-field"><span>Tanggal</span><input class="input" name="date" type="date" value="${attendanceDate}" required></label><label class="form-field"><span>Sesi</span><select name="session">${options(["Pagi", "Siang"], attendanceSession || "Pagi")}</select></label><label class="form-field"><span>Peran</span><select name="role"><option value="member">Anggota</option><option value="pj">Penanggung jawab sesi</option></select></label><p class="help">Penugasan ini berlaku hanya untuk tanggal yang dipilih.</p><div class="dialog-footer"><button class="button" type="button" data-action="close">Batal</button><button class="button primary" type="submit">Simpan penugasan</button></div></form>`,
  );
}
function recordAttendance(shiftId) {
  const s = state.shifts.find((x) => x.id === shiftId);
  if (!s) return;
  openDialog(
    "Catat kehadiran",
    "ABSENSI OLEH ADMIN",
    `<div class="profile-hero">${person(s.agent)}</div><p class="help">${formatDate(s.date)} · Sesi ${s.session} · ${s.pj ? "Penanggung jawab" : "Anggota"}</p><form id="attendance-form" data-id="${esc(s.id)}"><label class="form-field"><span>Status kehadiran</span><select name="status" id="attendance-status">${options(["Belum dicatat", "Hadir", "Izin", "Sakit", "Tidak hadir"], s.status)}</select></label><label class="form-field"><span>Jam hadir (WIB)</span><input class="input" name="time" id="attendance-time" type="time" value="${esc(s.time)}" ${s.status === "Hadir" ? "required" : "disabled"}><small class="help">Masukkan waktu kehadiran sebenarnya. Hanya diperlukan untuk status Hadir.</small></label><div class="dialog-footer"><button type="button" class="button" data-action="close">Batal</button><button class="button primary" type="submit">Simpan kehadiran</button></div></form>`,
  );
}
function confirmAction(title, description, action, recordId = "") {
  openDialog(
    title,
    "KONFIRMASI",
    `<p>${description}</p><div class="dialog-footer"><button class="button" data-action="close">Batal</button><button class="button danger" data-action="${action}" data-id="${esc(recordId)}">${title}</button></div>`,
  );
}
async function readImage(file, { avatarCrop = false } = {}) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw Error("Gunakan gambar JPG, PNG, atau WebP.");
  if (file.size > 5 * 1024 * 1024) throw Error("Ukuran gambar maksimal 5 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    if (!bitmap.width || !bitmap.height) throw Error("Gambar tidak valid.");
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
    canvas.width = avatarCrop ? 256 : Math.round(bitmap.width * scale);
    canvas.height = avatarCrop ? 256 : Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (avatarCrop) {
      const size = Math.min(bitmap.width, bitmap.height);
      ctx.drawImage(
        bitmap,
        (bitmap.width - size) / 2,
        (bitmap.height - size) / 2,
        size,
        size,
        0,
        0,
        256,
        256,
      );
    } else ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.75);
  } finally {
    bitmap.close();
  }
}
function shiftMonth(delta) {
  const d = new Date(`${calendarMonth}-01T12:00:00`);
  d.setMonth(d.getMonth() + delta);
  calendarMonth = dateKey(d).slice(0, 7);
  renderContent();
}
function navigate(target) {
  if (location.hash.slice(1) === target) {
    page = target;
    render();
  } else location.hash = target;
}
document.addEventListener("click", (e) => {
  const button = e.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action,
    recordId = button.dataset.id;
  switch (action) {
    case "close":
      closeDialog();
      break;
    case "agent":
      openAgent(recordId);
      break;
    case "edit-agent":
      editAgent(recordId);
      break;
    case "new-agent":
      editAgent();
      break;
    case "new-post":
      editPost(null, button.dataset.date);
      break;
    case "post":
      showPost(recordId);
      break;
    case "edit-post":
      editPost(recordId);
      break;
    case "delete-post":
      confirmAction(
        "Hapus konten",
        "Konten ini akan dihapus dari data demo di browser.",
        "confirm-delete-post",
        recordId,
      );
      break;
    case "confirm-delete-post":
      if (
        update(
          (s) => (s.posts = s.posts.filter((p) => p.id !== recordId)),
          "Konten demo dihapus.",
        )
      ) {
        closeDialog();
        render();
      }
      break;
    case "remove-photo":
      if (
        update(
          (s) => (s.agents.find((a) => a.id === recordId).photo = ""),
          "Foto demo dihapus.",
        )
      ) {
        render();
        openAgent(recordId);
      }
      break;
    case "remove-draft-image":
      draftImages.splice(Number(button.dataset.index), 1);
      renderDraftImages();
      break;
    case "review-filter":
      contentFilter = "Review";
      calendarView = "list";
      calendarMonth = (
        state.posts.find((p) => p.status === "Review")?.date || TODAY
      ).slice(0, 7);
      navigate("konten");
      break;
    case "prev-day":
      attendanceDate = offsetDate(attendanceDate, -1);
      renderAttendance();
      break;
    case "next-day":
      attendanceDate = offsetDate(attendanceDate, 1);
      renderAttendance();
      break;
    case "today-attendance":
      attendanceDate = TODAY;
      renderAttendance();
      break;
    case "new-shift":
      editShift();
      break;
    case "attendance":
      recordAttendance(recordId);
      break;
    case "prev-month":
      shiftMonth(-1);
      break;
    case "next-month":
      shiftMonth(1);
      break;
    case "this-month":
      calendarMonth = BASE;
      renderContent();
      break;
    case "calendar-view":
      calendarView = "calendar";
      renderContent();
      break;
    case "list-view":
      calendarView = "list";
      renderContent();
      break;
    case "confirm-reset":
      if (save(seed(), "Data demo dikembalikan ke contoh awal.")) {
        closeDialog();
        render();
      }
      break;
  }
});
document
  .querySelector("#reset-demo")
  .addEventListener("click", () =>
    confirmAction(
      "Reset demo",
      "Seluruh perubahan demo di browser ini, termasuk foto dan konten, akan dihapus.",
      "confirm-reset",
    ),
  );
document.addEventListener("input", (e) => {
  if (e.target.id === "agent-search") {
    agentSearch = e.target.value;
    renderAgentCards();
  }
  if (e.target.id === "post-link") e.target.setCustomValidity("");
});
document.addEventListener("change", async (e) => {
  const el = e.target;
  switch (el.id) {
    case "division-filter":
      divisionFilter = el.value;
      renderAgentCards();
      break;
    case "session-filter":
      attendanceSession = el.value;
      renderAttendance();
      break;
    case "attendance-date":
      if (el.value) {
        attendanceDate = el.value;
        renderAttendance();
      }
      break;
    case "content-filter":
      contentFilter = el.value;
      renderContent();
      break;
    case "post-status":
      document.querySelector("#post-link").required = el.value === "Terbit";
      break;
    case "attendance-status": {
      const time = document.querySelector("#attendance-time");
      time.disabled = el.value !== "Hadir";
      time.required = el.value === "Hadir";
      break;
    }
    case "agent-photo": {
      const file = el.files[0];
      if (!file) return;
      el.disabled = true;
      try {
        const photo = await readImage(file, { avatarCrop: true });
        if (
          update(
            (s) =>
              (s.agents.find((a) => a.id === el.dataset.agent).photo = photo),
            "Foto agen tersimpan dalam demo.",
          )
        ) {
          render();
          if (dialog.open) openAgent(el.dataset.agent);
        }
      } catch (error) {
        toast(error.message || "Gambar tidak dapat dibaca.");
      } finally {
        el.disabled = false;
      }
      break;
    }
    case "post-images": {
      if (!el.files.length) return;
      if (draftImages.length + el.files.length > 4) {
        toast("Maksimal 4 gambar dalam prototipe ini.");
        el.value = "";
        return;
      }
      const form = document.querySelector("#post-form"),
        saveButton = document.querySelector("#save-post");
      mediaBusy = true;
      saveButton.disabled = true;
      try {
        const images = await Promise.all(
          [...el.files].map((file) => readImage(file)),
        );
        if (form.isConnected) {
          draftImages.push(...images);
          renderDraftImages();
        }
      } catch (error) {
        toast(error.message || "Gambar tidak dapat dibaca.");
      } finally {
        mediaBusy = false;
        saveButton.disabled = false;
        el.value = "";
      }
      break;
    }
  }
});
document.addEventListener("submit", (e) => {
  const form = e.target;
  if (
    !["agent-form", "post-form", "shift-form", "attendance-form"].includes(
      form.id,
    )
  )
    return;
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form)),
    recordId = form.dataset.id;
  switch (form.id) {
    case "agent-form": {
      const name = data.name.trim(),
        position = data.position.trim();
      if (!name || !position) {
        toast("Nama dan jabatan wajib diisi.");
        return;
      }
      let savedId = recordId || id();
      if (
        update((s) => {
          const a = s.agents.find((x) => x.id === savedId);
          const patch = {
            name,
            position,
            division: data.division,
            active: data.active === "true",
            initials: name
              .split(/\s+/)
              .slice(0, 2)
              .map((x) => x[0].toUpperCase())
              .join(""),
          };
          if (a) Object.assign(a, patch);
          else
            s.agents.push({
              id: savedId,
              ...patch,
              period: "2026 / 2027",
              photo: "",
            });
        }, "Profil agen tersimpan dalam demo.")
      ) {
        render();
        openAgent(savedId);
      }
      break;
    }
    case "post-form": {
      if (mediaBusy) return;
      const title = data.title.trim();
      if (!title) {
        toast("Judul konten wajib diisi.");
        return;
      }
      if (data.link && !safeInstagramUrl(data.link)) {
        const input = form.querySelector("[name=link]");
        input.setCustomValidity(
          "Gunakan tautan HTTPS dari instagram.com atau www.instagram.com.",
        );
        input.reportValidity();
        return;
      }
      if (data.status === "Terbit" && !data.link) {
        toast("Tambahkan tautan Instagram sebelum menandai Terbit.");
        return;
      }
      const savedId = recordId || id();
      if (
        update((s) => {
          const existing = s.posts.find((p) => p.id === savedId);
          const patch = { ...data, title, images: [...draftImages] };
          if (existing) Object.assign(existing, patch);
          else s.posts.push({ id: savedId, ...patch });
        }, "Konten tersimpan dalam kalender demo.")
      ) {
        calendarMonth = data.date.slice(0, 7);
        contentFilter = "";
        closeDialog();
        navigate("konten");
      }
      break;
    }
    case "shift-form": {
      if (
        state.shifts.some(
          (s) =>
            s.date === data.date &&
            s.session === data.session &&
            s.agent === data.agent,
        )
      ) {
        toast("Agen sudah terdaftar pada tanggal dan sesi tersebut.");
        return;
      }
      if (
        update(
          (s) =>
            s.shifts.push({
              id: id(),
              date: data.date,
              session: data.session,
              agent: data.agent,
              pj: data.role === "pj",
              status: "Belum dicatat",
              time: "",
            }),
          "Penugasan tersimpan dalam demo.",
        )
      ) {
        attendanceDate = data.date;
        attendanceSession = "";
        closeDialog();
        renderAttendance();
      }
      break;
    }
    case "attendance-form":
      if (
        update(
          (s) =>
            Object.assign(
              s.shifts.find((x) => x.id === recordId),
              {
                status: data.status,
                time: data.status === "Hadir" ? data.time : "",
              },
            ),
          "Kehadiran demo diperbarui.",
        )
      ) {
        closeDialog();
        renderAttendance();
      }
      break;
  }
});
window.addEventListener("hashchange", () => {
  const next = location.hash.slice(1);
  page = ["beranda", "agen", "kehadiran", "konten"].includes(next)
    ? next
    : "beranda";
  if (dialog.open) closeDialog();
  render();
  window.scrollTo(0, 0);
});
page = ["beranda", "agen", "kehadiran", "konten"].includes(
  location.hash.slice(1),
)
  ? location.hash.slice(1)
  : "beranda";
document.querySelector("#topbar-date").textContent = formatDate(TODAY, {
  day: "numeric",
  month: "short",
  year: "numeric",
});
render();
if (storageProblem)
  toast("Data demo sebelumnya tidak dapat dibaca. Menampilkan contoh awal.");
