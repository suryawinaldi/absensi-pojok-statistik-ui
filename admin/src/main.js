import { divisionChoices } from "./agent-divisions.js";
import {
  directoryAgents,
  positionChoices,
  isCoreDivision,
} from "./agent-directory.js";
import { enhanceAgentPickers } from "./agent-picker.js";
import {
  durationMinutes,
  contribution,
  shiftFine,
} from "./attendance-rules.js";
import { client, repository } from "./backend.js";
import { loginWithUsername } from "./auth.js";
import {
  emptyState,
  readableError,
  SETTINGS_ID,
  WORKDAYS,
  defaultOperationalHours,
} from "./repository.js";
let authorized = false;
let operationPending = false;
let sessionEpoch = 0;

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
const nowJakartaTime = () =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

const DAY_NAMES = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];
const getDayName = (dateStr) =>
  DAY_NAMES[new Date(`${dateStr}T12:00:00+07:00`).getDay()] || "Senin";

const parseMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== "string" || !timeStr.includes(":"))
    return null;
  const [h, m] = timeStr.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const formatRupiah = (amount) =>
  `Rp ${Number(amount || 0).toLocaleString("id-ID")}`;

const statuses = [
  "Ide",
  "Dikerjakan",
  "Review",
  "Disetujui",
  "Dijadwalkan",
  "Terbit",
];
const availableDivisions = (current = "") =>
  divisionChoices(state.agents, current);
let state = emptyState();
let legacyAgentPreview = [];
let legacySchedulePreview = [];
let page = "beranda",
  agentSearch = "",
  divisionFilter = "",
  agentRoleFilter = "",
  agentSort = "division",
  contentFilter = "",
  calendarMonth = BASE,
  calendarView = window.matchMedia("(max-width: 720px)").matches
    ? "list"
    : "calendar",
  attendanceDate = TODAY,
  attendanceSession = "",
  attendanceTab = "harian",
  analyticsScope = "all",
  fineStatusFilter = "",
  fineSearch = "",
  draggedWeeklyId = "";
let toastTimer, lastFocused;
const dialog = document.querySelector("#detail-dialog");
const main = document.querySelector("#main");
const findAgent = (agentId) => state.agents.find((a) => a.id === agentId);
const agentName = (agentId) => findAgent(agentId)?.name || "Belum ditentukan";
const validImage = repository.isSafeMedia;

function activeSettings() {
  const saved = state.settings?.[0];
  const baseHours = defaultOperationalHours();
  if (!saved) {
    return {
      id: SETTINGS_ID,
      lateToleranceMinutes: 15,
      lateFineAmount: 5000,
      absentFineAmount: 10000,
      operationalHours: baseHours,
    };
  }
  const mergedHours = {};
  for (const day of WORKDAYS) {
    mergedHours[day] = {
      Pagi: {
        ...baseHours[day].Pagi,
        ...(saved.operationalHours?.[day]?.Pagi || {}),
      },
      Siang: {
        ...baseHours[day].Siang,
        ...(saved.operationalHours?.[day]?.Siang || {}),
      },
    };
  }
  return {
    ...saved,
    operationalHours: mergedHours,
  };
}

function getSessionConfig(dateStr, session) {
  const dayName = getDayName(dateStr);
  const cfg = activeSettings().operationalHours[dayName]?.[session];
  if (cfg) return cfg;
  const isFri = dayName === "Jumat";
  return session === "Pagi"
    ? { active: true, start: "10:00", end: isFri ? "11:30" : "12:30" }
    : { active: true, start: "13:30", end: isFri ? "15:30" : "16:00" };
}

function calcShiftDuration(shift) {
  return durationMinutes(shift, getSessionConfig(shift.date, shift.session));
}
function calcShiftFine(shift) {
  return shiftFine(
    shift,
    activeSettings(),
    getSessionConfig(shift.date, shift.session),
  );
}

function effectiveShiftsForDate(dateStr, sessionFilter = "") {
  const dayName = getDayName(dateStr);
  const settings = activeSettings();
  const recorded = state.shifts.filter(
    (s) =>
      s.date === dateStr && (!sessionFilter || s.session === sessionFilter),
  );
  const masterForDay = (state.weeklySchedule || []).filter((w) => {
    if (w.day !== dayName) return false;
    if (sessionFilter && w.session !== sessionFilter) return false;
    const sessCfg = settings.operationalHours[dayName]?.[w.session];
    if (sessCfg && sessCfg.active === false) return false;
    return true;
  });

  const combined = [...recorded];
  for (const w of masterForDay) {
    const exists = combined.some(
      (s) => s.agent === w.agent && s.session === w.session,
    );
    if (!exists) {
      combined.push({
        id: `master:${w.id}:${dateStr}`,
        _masterId: w.id,
        fromMaster: true,
        agent: w.agent,
        date: dateStr,
        session: w.session,
        pj: Boolean(w.pj),
        extra: false,
        finePaid: false,
        status: "Belum dicatat",
        time: "",
      });
    }
  }
  return combined.sort((a, b) => {
    if (a.session !== b.session) return a.session === "Pagi" ? -1 : 1;
    if (Boolean(a.pj) !== Boolean(b.pj)) return a.pj ? -1 : 1;
    if (Boolean(a.extra) !== Boolean(b.extra)) return a.extra ? 1 : -1;
    return agentName(a.agent).localeCompare(agentName(b.agent), "id");
  });
}

function computeAgentStats(scope = "all") {
  const map = new Map();
  for (const a of state.agents) {
    map.set(a.id, {
      agent: a,
      totalSessions: 0,
      regularSessions: 0,
      extraSessions: 0,
      extraMinutes: 0,
      totalMinutes: 0,
      finesTotal: 0,
      finesUnpaid: 0,
    });
  }
  for (const s of state.shifts) {
    if (scope === "month" && !s.date.startsWith(BASE)) continue;
    let entry = map.get(s.agent);
    if (!entry) continue;
    if (s.status === "Hadir") {
      const value = contribution(s, getSessionConfig(s.date, s.session));
      entry.totalSessions += value.regularSessions;
      entry.regularSessions += value.regularSessions;
      if (s.extra && value.totalMinutes > 0) entry.extraSessions += 1;
      entry.extraMinutes += value.extraMinutes;
      entry.totalMinutes += value.totalMinutes;
    }
    const fine = calcShiftFine(s);
    if (fine.amount > 0) {
      entry.finesTotal += fine.amount;
      if (!s.finePaid) entry.finesUnpaid += fine.amount;
    }
  }
  return [...map.values()].sort(
    (a, b) =>
      b.totalSessions - a.totalSessions ||
      b.totalMinutes - a.totalMinutes ||
      a.agent.name.localeCompare(b.agent.name, "id"),
  );
}

function avatar(agent, large = "") {
  if (!agent) return "";
  const n = state.agents.indexOf(agent) % 4;
  return `<span class="avatar color-${n} ${large}">${validImage(agent.photo) ? `<img src="${esc(agent.photo)}" alt="Foto ${esc(agent.name)}">` : esc(agent.initials)}</span>`;
}
function badge(status) {
  const color =
    {
      Hadir: "green",
      Aktif: "green",
      Lunas: "green",
      Terbit: "green",
      Disetujui: "green",
      "Agen Ekstra": "green",
      Dijadwalkan: "blue",
      "PJ sesi": "blue",
      Review: "amber",
      Izin: "amber",
      Sakit: "amber",
      Dikerjakan: "purple",
      "Tidak hadir": "red",
      "Belum lunas": "red",
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
async function update(mutator, message) {
  if (!authorized || operationPending) return false;
  const epoch = sessionEpoch;
  operationPending = true;
  document.body.classList.add("saving");
  document.querySelector("#connection-status").textContent = "Menyimpan…";
  try {
    const next = structuredClone(state);
    mutator(next);
    const saved = await repository.commit(state, next);
    if (epoch !== sessionEpoch || !authorized) return false;
    state = saved;
    toast(message || "Perubahan tersimpan.");
    return true;
  } catch (error) {
    if (epoch === sessionEpoch && authorized) toast(readableError(error));
    return false;
  } finally {
    operationPending = false;
    document.body.classList.remove("saving");
    document.querySelector("#connection-status").textContent = authorized
      ? "Terhubung"
      : "Belum masuk";
  }
}
async function updateMany(mutators, message) {
  if (!authorized || operationPending || !mutators.length) return false;
  const epoch = sessionEpoch;
  operationPending = true;
  document.body.classList.add("saving");
  document.querySelector("#connection-status").textContent = "Menyimpan…";
  try {
    let current = state;
    for (const mutator of mutators) {
      const next = structuredClone(current);
      mutator(next);
      current = await repository.commit(current, next);
      if (epoch !== sessionEpoch || !authorized) return false;
      state = current;
    }
    toast(message || "Perubahan tersimpan.");
    return true;
  } catch (error) {
    if (epoch === sessionEpoch && authorized) toast(readableError(error));
    return false;
  } finally {
    operationPending = false;
    document.body.classList.remove("saving");
    document.querySelector("#connection-status").textContent = authorized
      ? "Terhubung"
      : "Belum masuk";
  }
}

function downloadCsv(filename, headers, rows) {
  const escapeCsv = (val) => {
    const str = String(val ?? "");
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => r.map(escapeCsv).join(",")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
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
  if (!authorized) return;
  renderNav();
  if (page === "beranda") renderHome();
  if (page === "agen") renderAgents();
  if (page === "kehadiran") renderAttendance();
  if (page === "konten") renderContent();
}

function renderHome() {
  const shifts = effectiveShiftsForDate(TODAY),
    present = shifts.filter((s) => s.status === "Hadir").length,
    pending = shifts.filter((s) => s.status === "Belum dicatat").length,
    review = state.posts.filter((p) => p.status === "Review");
  const upcoming = state.posts
    .filter((p) => p.status !== "Terbit")
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 3);

  const stats = computeAgentStats(analyticsScope);
  const durationStats = [...stats].sort(
    (a, b) =>
      b.totalMinutes - a.totalMinutes || b.regularSessions - a.regularSessions,
  );
  const activeStats = durationStats.filter(
    (s) => s.totalSessions > 0 || s.totalMinutes > 0,
  );
  const starAgent = activeStats[0] || null;
  const top5Agents = durationStats
    .filter((s) => s.totalMinutes > 0)
    .slice(0, 5);
  const top10BySessions = stats
    .filter((s) => s.regularSessions > 0)
    .sort(
      (a, b) =>
        b.totalSessions - a.totalSessions || b.totalMinutes - a.totalMinutes,
    )
    .slice(0, 10);
  const top10ByMinutes = [...stats]
    .sort(
      (a, b) =>
        b.totalMinutes - a.totalMinutes || b.totalSessions - a.totalSessions,
    )
    .slice(0, 10);
  const maxSessions = Math.max(
    1,
    ...top10BySessions.map((x) => x.totalSessions),
  );
  const maxMinutes = Math.max(1, ...top10ByMinutes.map((x) => x.totalMinutes));

  let unpaidFinesTotal = 0;
  let paidFinesTotal = 0;
  for (const s of state.shifts) {
    const f = calcShiftFine(s);
    if (f.amount > 0) {
      if (s.finePaid) paidFinesTotal += f.amount;
      else unpaidFinesTotal += f.amount;
    }
  }

  main.innerHTML =
    header(
      "RUANG KERJA POJOK STATISTIK",
      "Selamat datang, Admin.",
      "Semua agenda, anggota, dan karya — dalam satu ruang.",
      `<a href="#kehadiran" class="button">${icon("calendar")}Lihat jadwal</a><button class="button primary" data-action="new-post">${icon("plus")}Buat konten</button>`,
    ) +
    `<section class="hero" aria-label="Ringkasan hari ini"><div class="hero-copy"><p class="eyebrow">${formatDate(TODAY, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p><h2>Kontribusi kecil.<br>Dampak yang berarti.</h2><p>Ada ${shifts.length} penugasan jaga dan ${state.posts.filter((p) => p.date === TODAY).length} agenda publikasi hari ini. Mari pastikan semuanya berjalan baik.</p><a href="#kehadiran" class="text-button hero-link">Kelola aktivitas hari ini ${icon("arrow")}</a></div><div class="hero-art" aria-hidden="true"><span class="art-star">✳</span><div class="art-bar"></div><div class="art-bar"></div><div class="art-bar"></div></div></section>` +
    `<section class="metrics" aria-label="Ringkasan operasional">${metric("Agen aktif", state.agents.filter((a) => a.active).length, "agen", "Dalam periode kepengurusan ini", "users")}${metric("Kehadiran hari ini", present, `/ ${shifts.length}`, `${pending} penugasan belum dicatat`, "check")}${metric("Menunggu review", review.length, "konten", "Perlu pemeriksaan admin", "review")}${metric("Publikasi bulan ini", state.posts.filter((p) => p.status === "Terbit" && p.date.startsWith(BASE)).length, "konten", monthLabel(BASE), "content")}</section>` +
    `<div class="dashboard-grid"><div class="panel"><div class="panel-header"><div><h2 class="panel-title">Jadwal jaga hari ini</h2><p class="panel-description">${formatDate(TODAY, { weekday: "long", day: "numeric", month: "long" })} · Otomatis dari Jadwal Master & penugasan</p></div><a class="text-button" href="#kehadiran">Lihat semua ${icon("arrow")}</a></div><div class="table-scroll"><table><thead><tr><th>AGEN</th><th>SESI</th><th>STATUS</th></tr></thead><tbody>${
      shifts.length
        ? shifts
            .map(
              (s) =>
                `<tr><td>${person(s.agent)}</td><td>${s.session}<br><small class="muted">${s.extra ? "Agen ekstra (sukarelawan)" : s.pj ? "Penanggung jawab" : "Anggota"}</small></td><td>${badge(s.status)}${s.time ? `<br><small class="muted">${esc(s.time)} WIB · ${calcShiftDuration(s)} mnt</small>` : ""}</td></tr>`,
            )
            .join("")
        : '<tr><td colspan="3">Belum ada penugasan hari ini.</td></tr>'
    }</tbody></table></div><div class="panel-foot">${icon("info")}Kehadiran dicatat dan dikelola oleh admin.</div></div>
 <div class="stack"><section class="panel"><div class="panel-header"><h2 class="panel-title">Perlu ditindaklanjuti</h2><span class="pill-count">${Number(review.length > 0) + Number(pending > 0) + Number(unpaidFinesTotal > 0)}</span></div><div class="task-list">${review.length ? `<button class="task-row" data-action="review-filter"><span class="task-icon">${icon("review")}</span><span><strong>${review.length} konten menunggu review</strong><small>Periksa materi sebelum publikasi</small></span>${icon("right")}</button>` : ""}${pending ? `<a class="task-row" href="#kehadiran"><span class="task-icon blue">${icon("clock")}</span><span><strong>${pending} kehadiran belum dicatat</strong><small>Lengkapi catatan penugasan hari ini</small></span>${icon("right")}</a>` : ""}${unpaidFinesTotal > 0 ? `<button class="task-row" data-action="open-fines-tab"><span class="task-icon">${icon("info")}</span><span><strong>${formatRupiah(unpaidFinesTotal)} denda belum lunas</strong><small>Terkumpul lunas: ${formatRupiah(paidFinesTotal)}</small></span>${icon("right")}</button>` : ""}${!pending && !review.length && !unpaidFinesTotal ? '<p class="help">Semua tindak lanjut sudah selesai.</p>' : ""}</div></section><section class="panel"><div class="panel-header"><h2 class="panel-title">Agenda publikasi</h2><a href="#konten" class="text-button">Kalender ${icon("arrow")}</a></div><div class="upcoming">${upcoming.map(upcomingRow).join("") || '<p class="help">Belum ada agenda publikasi.</p>'}</div></section></div></div>` +
    `<section class="analytics-section" aria-label="Analitik keaktifan dan durasi jaga">
      <div class="toolbar" style="margin-top:28px">
        <div>
          <p class="eyebrow">ANALITIK KEHADIRAN & APRESIASI</p>
          <h2 class="section-heading">Keaktifan sesi & durasi jaga agen</h2>
        </div>
        <div class="view-toggle" aria-label="Periode analitik">
          <button data-action="analytics-scope" data-scope="all" class="${analyticsScope === "all" ? "active" : ""}">Semua waktu</button>
          <button data-action="analytics-scope" data-scope="month" class="${analyticsScope === "month" ? "active" : ""}">Bulan ini (${monthLabel(BASE)})</button>
        </div>
      </div>

      <div class="dashboard-grid" style="margin-top:14px">
        <div class="panel star-agent-panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow" style="color:#9a6700">🌟 STAR AGENT OF THE MONTH</p>
              <h2 class="panel-title">Apresiasi dedikasi tertinggi</h2>
            </div>
            ${starAgent ? `<button class="button" data-action="show-certificate" data-id="${esc(starAgent.agent.id)}">${icon("spark")}Sertifikat digital</button>` : ""}
          </div>
          ${
            starAgent
              ? `<div class="star-agent-body">
                  <div class="person">${avatar(starAgent.agent, "large")}<span><strong>${esc(starAgent.agent.name)}</strong><small>${esc(starAgent.agent.position)} · ${esc(starAgent.agent.division)}</small></span></div>
                  <div class="star-metrics">
                    <div><span>Sesi reguler</span><strong>${starAgent.totalSessions} sesi</strong><small>Sukarelawan tidak menambah sesi reguler</small></div>
                    <div><span>Estimasi durasi</span><strong>${starAgent.totalMinutes} menit</strong><small>${starAgent.extraMinutes} menit dari bantuan sukarela</small></div>
                  </div>
                </div>`
              : `<div class="empty">Belum ada data kehadiran tercatat pada periode ini.</div>`
          }
        </div>

        <div class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Top 5 durasi kontribusi</h2>
              <p class="panel-description">Estimasi menit reguler + sukarela; bukan penambahan sesi wajib</p>
            </div>
          </div>
          <div class="leaderboard-list">
            ${
              top5Agents.length && top5Agents.some((x) => x.totalMinutes > 0)
                ? top5Agents
                    .filter((x) => x.totalMinutes > 0)
                    .map(
                      (item, idx) =>
                        `<div class="leaderboard-row">
                          <span class="rank-badge rank-${idx + 1}">#${idx + 1}</span>
                          ${person(item.agent.id)}
                          <div class="leaderboard-stats">
                            <strong>${item.totalMinutes} mnt</strong>
                            <small>${item.regularSessions} sesi reguler · ${item.extraMinutes} mnt sukarela</small>
                          </div>
                        </div>`,
                    )
                    .join("")
                : '<p class="help" style="padding:18px">Data peringkat akan tampil setelah kehadiran agen dicatat.</p>'
            }
          </div>
        </div>
      </div>

      <div class="dashboard-grid" style="margin-top:18px">
        <div class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Top 10 frekuensi jaga reguler</h2>
              <p class="panel-description">Hanya sesi reguler; bantuan sukarela menambah durasi apresiasi</p>
            </div>
            ${icon("trend")}
          </div>
          <div class="chart-bars">
            ${
              top10BySessions.length
                ? top10BySessions
                    .map(
                      (item) =>
                        `<div class="bar-row">
                          <div class="bar-label"><strong>${esc(item.agent.name)}</strong><span>${item.regularSessions} sesi reguler</span></div>
                          <div class="bar-track"><span class="bar-fill" style="width:${Math.max(4, Math.round((item.totalSessions / maxSessions) * 100))}%"></span></div>
                        </div>`,
                    )
                    .join("")
                : '<p class="help">Belum ada agen terdaftar.</p>'
            }
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Top 10 estimasi durasi (reguler + sukarela)</h2>
              <p class="panel-description">Selisih menit dari jam hadir aktual hingga jam tutup sesi</p>
            </div>
            ${icon("clock")}
          </div>
          <div class="chart-bars">
            ${
              top10ByMinutes.length
                ? top10ByMinutes
                    .map(
                      (item) =>
                        `<div class="bar-row">
                          <div class="bar-label"><strong>${esc(item.agent.name)}</strong><span>${item.totalMinutes} menit</span></div>
                          <div class="bar-track"><span class="bar-fill teal" style="width:${Math.max(4, Math.round((item.totalMinutes / maxMinutes) * 100))}%"></span></div>
                        </div>`,
                    )
                    .join("")
                : '<p class="help">Belum ada agen terdaftar.</p>'
            }
          </div>
        </div>
      </div>
    </section>`;
}

function showCertificate(agentId) {
  const stats = computeAgentStats(analyticsScope);
  const entry = stats.find((s) => s.agent.id === agentId) || stats[0];
  if (!entry) return;
  const periodText =
    analyticsScope === "month" ? monthLabel(BASE) : "Periode 2026 / 2027";
  openDialog(
    "Sertifikat Apresiasi Digital",
    "PENGHARGAAN POJOK STATISTIK UI",
    `<div class="certificate-card">
      <p class="eyebrow">POJOK STATISTIK · UNIVERSITAS INDONESIA</p>
      <h3>STAR AGENT OF THE MONTH</h3>
      <p class="help">Diberikan sebagai bentuk apresiasi atas dedikasi dan kontribusi terbaik kepada:</p>
      <div class="certificate-recipient">
        ${avatar(entry.agent, "large")}
        <h2>${esc(entry.agent.name)}</h2>
        <p>${esc(entry.agent.position)} · ${esc(entry.agent.division)}</p>
      </div>
      <div class="certificate-stats">
        <div><span>Kehadiran reguler</span><strong>${entry.totalSessions} Sesi</strong></div>
        <div><span>Estimasi durasi sukarela</span><strong>${entry.extraMinutes} Menit</strong></div>
        <div><span>Estimasi durasi kontribusi</span><strong>${entry.totalMinutes} Menit</strong></div>
      </div>
      <p class="certificate-period">${esc(periodText)}</p>
    </div>
    <div class="dialog-footer">
      <button type="button" class="button" data-action="close">Tutup</button>
      <button type="button" class="button primary" data-action="print-certificate">Cetak / Simpan PDF</button>
    </div>`,
  );
}

function agentCards() {
  return directoryAgents(state.agents, {
    query: agentSearch,
    division: divisionFilter,
    role: agentRoleFilter,
    sort: agentSort,
  });
}
function renderAgents() {
  main.innerHTML =
    header(
      "ORANG-ORANG DI BALIK POJOK",
      "Direktori agen",
      "Seluruh agen Pojok Statistik UI, beserta peran dan kontribusinya.",
      `<button class="button" data-action="import-agents">Impor agen lama</button><button class="button primary" data-action="new-agent">${icon("plus")}Tambah agen</button>`,
    ) +
    `<div class="toolbar"><div class="filters"><label class="search-field">${icon("search")}<input class="input" id="agent-search" type="search" placeholder="Ketik nama, misalnya su…" aria-label="Cari agen" value="${esc(agentSearch)}"></label><select id="division-filter" aria-label="Filter divisi"><option value="">Semua divisi</option>${availableDivisions()
      .map(
        (d) =>
          `<option ${divisionFilter === d ? "selected" : ""}>${esc(d)}</option>`,
      )
      .join(
        "",
      )}</select><select id="agent-role-filter" aria-label="Filter jabatan"><option value="">Semua jabatan</option><option value="pi" ${agentRoleFilter === "pi" ? "selected" : ""}>Pengurus Inti</option><option value="bph" ${agentRoleFilter === "bph" ? "selected" : ""}>BPH</option><option value="anggota" ${agentRoleFilter === "anggota" ? "selected" : ""}>Anggota</option><option value="other" ${agentRoleFilter === "other" ? "selected" : ""}>Jabatan lain</option></select><select id="agent-sort" aria-label="Urutkan agen"><option value="division" ${agentSort === "division" ? "selected" : ""}>Divisi & jabatan</option><option value="name-asc" ${agentSort === "name-asc" ? "selected" : ""}>Nama A–Z</option><option value="name-desc" ${agentSort === "name-desc" ? "selected" : ""}>Nama Z–A</option></select></div><span class="result-count" id="agent-count" aria-live="polite"></span></div><p class="directory-help">Cari potongan nama di bagian mana pun. Edit nama, divisi, dan jabatan melalui tombol Edit profil.</p><div class="agent-grid" id="agent-grid"></div>`;
  renderAgentCards();
}
function renderAgentCards() {
  const list = agentCards();
  document.querySelector("#agent-count").textContent =
    `${list.length} dari ${state.agents.length} agen`;
  let previousDivision = null;
  document.querySelector("#agent-grid").innerHTML =
    list
      .map((a) => {
        const weeklyCount = (state.weeklySchedule || []).filter(
          (w) => w.agent === a.id,
        ).length;
        const attendedCount = state.shifts.filter(
          (s) => s.agent === a.id && s.status === "Hadir" && !s.extra,
        ).length;
        let heading = "";
        if (agentSort === "division" && a.division !== previousDivision) {
          previousDivision = a.division;
          const count = list.filter(
            (item) => item.division === a.division,
          ).length;
          heading = `<div class="directory-group-heading"><h2>${esc(a.division)}</h2><span>${count} agen</span></div>`;
        }
        return `${heading}<article class="agent-card ${isCoreDivision(a.division) ? "pi-card" : ""}"><button type="button" class="agent-card-profile" data-action="agent" data-id="${esc(a.id)}"><span class="agent-card-top">${avatar(a)}${badge(a.active ? "Aktif" : "Nonaktif")}</span><h2>${esc(a.name)}</h2><p>${esc(a.position)}</p><span class="division-label ${isCoreDivision(a.division) ? "pi-badge" : ""}">${esc(a.division)}</span><span class="agent-card-bottom"><span>${weeklyCount ? `${weeklyCount} jadwal rutin · ` : ""}${attendedCount} sesi reguler</span>${icon("arrow")}</span></button><div class="agent-card-actions"><button type="button" class="text-button" data-action="edit-agent" data-id="${esc(a.id)}" aria-label="Edit profil ${esc(a.name)}">${icon("edit")}Edit profil</button></div></article>`;
      })
      .join("") ||
    '<div class="empty">Tidak ada agen yang sesuai. Coba nama atau divisi lain.</div>';
}

function renderAttendance() {
  const topActions =
    attendanceTab === "harian"
      ? `<button class="button" data-action="new-extra-shift">${icon("plus")}Agen ekstra</button><button class="button" data-action="mark-all-present">${icon("check")}Hadirkan semua</button><button class="button primary" data-action="new-shift">${icon("plus")}Tambah penugasan</button>`
      : attendanceTab === "master"
        ? `<button class="button" data-action="import-legacy-schedule">Impor jadwal lama</button><button class="button primary" data-action="add-weekly" data-day="Senin" data-session="Pagi">${icon("plus")}Tambah ke jadwal master</button>`
        : attendanceTab === "denda"
          ? `<button class="button" data-action="export-fines-csv">Export CSV Denda</button>`
          : "";

  const subTabs = `<div class="toolbar operational-toolbar">
    <div class="view-toggle operational-tabs" aria-label="Mode operasional jadwal dan kehadiran">
      <button data-action="attendance-tab" data-tab="harian" class="${attendanceTab === "harian" ? "active" : ""}">Absensi Harian</button>
      <button data-action="attendance-tab" data-tab="master" class="${attendanceTab === "master" ? "active" : ""}">Jadwal Master (Mingguan)</button>
      <button data-action="attendance-tab" data-tab="pengaturan" class="${attendanceTab === "pengaturan" ? "active" : ""}">Jam Buka & Tutup</button>
      <button data-action="attendance-tab" data-tab="denda" class="${attendanceTab === "denda" ? "active" : ""}">Rekap Denda</button>
    </div>
  </div>`;

  let bodyHtml = "";
  if (attendanceTab === "harian") bodyHtml = renderDailyAttendanceView();
  else if (attendanceTab === "master") bodyHtml = renderMasterScheduleView();
  else if (attendanceTab === "pengaturan") bodyHtml = renderSettingsView();
  else if (attendanceTab === "denda") bodyHtml = renderFinesView();

  main.innerHTML =
    header(
      "OPERASIONAL TIM",
      "Jadwal & kehadiran",
      "Atur jadwal master per hari & sesi, jam buka-tutup fleksibel, agen ekstra, dan catat kehadiran.",
      topActions,
    ) +
    subTabs +
    bodyHtml;
}

function renderDailyAttendanceView() {
  const shifts = effectiveShiftsForDate(attendanceDate, attendanceSession);
  const dayName = getDayName(attendanceDate);
  const pagiCfg = getSessionConfig(attendanceDate, "Pagi");
  const siangCfg = getSessionConfig(attendanceDate, "Siang");
  const settings = activeSettings();

  const opSummary = WORKDAYS.includes(dayName)
    ? `Jam operasional ${dayName} · Pagi ${pagiCfg.active ? `${pagiCfg.start}–${pagiCfg.end}` : "Libur"} · Siang ${siangCfg.active ? `${siangCfg.start}–${siangCfg.end}` : "Libur"} WIB · Toleransi telat ${settings.lateToleranceMinutes} menit`
    : `Akhir pekan (${dayName}) · Penugasan ekstra atau kegiatan khusus`;

  return `<div class="toolbar"><div class="attendance-date"><button class="icon-button" data-action="prev-day" aria-label="Hari sebelumnya">${icon("left")}</button><input class="input" id="attendance-date" type="date" aria-label="Tanggal kehadiran" value="${attendanceDate}" required><button class="icon-button" data-action="next-day" aria-label="Hari berikutnya">${icon("right")}</button><button class="button" data-action="today-attendance">Hari ini</button></div><div class="filters"><select id="session-filter" aria-label="Filter sesi"><option value="">Semua sesi</option>${["Pagi", "Siang"].map((s) => `<option ${attendanceSession === s ? "selected" : ""}>${s}</option>`).join("")}</select><button class="button" data-action="export-attendance-csv">Export CSV</button></div></div><div class="banner">${icon("info")}<span>Jadwal otomatis membaca <strong>Jadwal Master hari ${esc(dayName)}</strong>. Agen yang tidak terjadwal namun ikut membantu dapat dicatat lewat <strong>+ Agen ekstra</strong> (bebas denda telat).</span></div><section class="metrics">${metric("Terjadwal & ekstra", shifts.length, "agen", `Hari ${dayName}`, "users")}${metric("Hadir", shifts.filter((s) => s.status === "Hadir").length, "agen", `${shifts.filter((s) => s.extra && s.status === "Hadir").length} agen ekstra`, "check")}${metric("Izin / sakit", shifts.filter((s) => ["Izin", "Sakit"].includes(s.status)).length, "agen", "Bebas denda", "mail")}${metric("Belum dicatat", shifts.filter((s) => s.status === "Belum dicatat").length, "agen", "Menunggu pencatatan", "clock")}</section><section class="panel"><div class="panel-header"><div><h2 class="panel-title">${formatDate(attendanceDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h2><p class="panel-description">${esc(opSummary)}</p></div><button class="text-button" data-action="attendance-tab" data-tab="pengaturan">Ubah jam buka/tutup ${icon("arrow")}</button></div>${
    shifts.length
      ? ["Pagi", "Siang"]
          .filter((session) => shifts.some((s) => s.session === session))
          .map((session) => {
            const sessCfg = getSessionConfig(attendanceDate, session);
            return `<div class="shift-heading"><span>SESI ${session.toUpperCase()} (${sessCfg.active ? `${sessCfg.start}–${sessCfg.end} WIB` : "Diliburkan"})</span><span>${shifts.filter((s) => s.session === session).length} agen</span></div><div class="table-scroll"><table><thead><tr><th>AGEN</th><th>PERAN</th><th>KEHADIRAN</th><th>JAM HADIR & DURASI</th><th>AKSI</th></tr></thead><tbody>${shifts
              .filter((s) => s.session === session)
              .map((s) => {
                const dur = calcShiftDuration(s);
                const fine = calcShiftFine(s);
                const roleLabel = s.extra
                  ? `<span class="status green">Agen Ekstra</span><br><small class="muted">Sukarelawan · Kebal denda</small>`
                  : s.pj
                    ? `<span class="status blue">PJ sesi</span><br><small class="muted">Bebas denda</small>`
                    : `Anggota${s.fromMaster ? `<br><small class="muted">Jadwal master</small>` : ""}`;
                const timeAndDur =
                  s.status === "Hadir" && s.time
                    ? `<strong>${esc(s.time)}</strong> WIB<br><small class="muted">${dur} menit jaga</small>`
                    : esc(s.time) || "—";
                const fineBadge =
                  fine.amount > 0
                    ? `<br><small class="fine-note">${esc(fine.reason)} · ${formatRupiah(fine.amount)}</small>`
                    : "";
                const rowAttrs = s.fromMaster
                  ? `data-master-id="${esc(s._masterId)}" data-agent="${esc(s.agent)}" data-session="${esc(s.session)}" data-pj="${s.pj ? "true" : "false"}"`
                  : `data-id="${esc(s.id)}"`;
                return `<tr>
                  <td>${person(s.agent)}</td>
                  <td>${roleLabel}</td>
                  <td>${badge(s.status)}${fineBadge}</td>
                  <td>${timeAndDur}</td>
                  <td>
                    <div class="quick-actions">
                      <button class="chip-btn green" data-action="quick-attend" data-status="Hadir" ${rowAttrs} title="Tandai Hadir sekarang">Hadir</button>
                      <button class="chip-btn amber" data-action="quick-attend" data-status="Izin" ${rowAttrs} title="Tandai Izin">Izin</button>
                      <button class="chip-btn red" data-action="quick-attend" data-status="Tidak hadir" ${rowAttrs} title="Tandai Tidak hadir">Bolos</button>
                      <button class="text-button" data-action="attendance" ${rowAttrs}>${icon("edit")}Catat</button>
                      ${!s.fromMaster ? `<button class="text-button danger-text" data-action="reset-attendance" data-id="${esc(s.id)}" title="Batalkan / hapus catatan">Reset</button>` : ""}
                    </div>
                  </td>
                </tr>`;
              })
              .join("")}</tbody></table></div>`;
          })
          .join("")
      : '<div class="empty">Belum ada penugasan pada tanggal ini. Atur jadwal mingguan di tab “Jadwal Master (Mingguan)”, gunakan “Tambah penugasan”, atau catat “+ Agen ekstra”.</div>'
  }<div class="panel-foot">${icon("info")}Durasi menit dihitung otomatis dari selisih jam hadir ke jam tutup sesi hari tersebut.</div></section>`;
}

function renderMasterScheduleView() {
  const settings = activeSettings();
  const list = state.weeklySchedule || [];
  return `<div class="banner">${icon("info")}<span><strong>Geser & Lepas (Drag & Drop):</strong> Tarik kartu agen ke hari atau sesi lain untuk memindahkan jadwal jaga secara instan, atau klik label peran (<strong>PJ / Anggota</strong>) untuk mengubah penanggung jawab sesi.</span></div>
  <div class="master-board">
    ${WORKDAYS.map((day) => {
      const dayHours =
        settings.operationalHours[day] || defaultOperationalHours()[day];
      return `<section class="panel master-day-card">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">${day}</h2>
            <p class="panel-description">${list.filter((w) => w.day === day).length} agen terjadwal</p>
          </div>
          <button class="icon-button" data-action="add-weekly" data-day="${day}" data-session="Pagi" aria-label="Tambah agen hari ${day}" title="Tambah agen ke ${day}">${icon("plus")}</button>
        </div>
        <div class="master-sessions">
          ${["Pagi", "Siang"]
            .map((session) => {
              const cfg = dayHours[session];
              const slotItems = list
                .filter((w) => w.day === day && w.session === session)
                .sort(
                  (a, b) =>
                    Number(b.pj) - Number(a.pj) ||
                    agentName(a.agent).localeCompare(agentName(b.agent), "id"),
                );
              return `<div class="master-slot ${!cfg.active ? "slot-inactive" : ""}" data-drop-slot="true" data-day="${day}" data-session="${session}">
                <div class="master-slot-head">
                  <div>
                    <strong>SESI ${session.toUpperCase()}</strong>
                    <small>${cfg.active ? `${cfg.start}–${cfg.end} WIB` : "Sesi Diliburkan"}</small>
                  </div>
                  <button class="text-button" data-action="add-weekly" data-day="${day}" data-session="${session}">+ Agen</button>
                </div>
                <div class="master-slot-body">
                  ${
                    slotItems.length
                      ? slotItems
                          .map((item) => {
                            const ag = findAgent(item.agent);
                            return `<div class="master-chip" draggable="true" data-weekly-id="${esc(item.id)}">
                              <span class="drag-handle" aria-hidden="true" title="Geser ke hari/sesi lain">⋮⋮</span>
                              ${ag ? avatar(ag) : ""}
                              <div class="master-chip-info">
                                <strong>${esc(agentName(item.agent))}</strong>
                                <div class="master-chip-actions">
                                  <button type="button" class="role-toggle ${item.pj ? "is-pj" : ""}" data-action="toggle-weekly-pj" data-id="${esc(item.id)}" title="Klik untuk ubah PJ / Anggota">${item.pj ? "★ PJ Sesi" : "Anggota"}</button>
                                  <button type="button" class="role-toggle" data-action="move-weekly" data-id="${esc(item.id)}" title="Pindahkan hari/sesi">Pindah</button>
                                </div>
                              </div>
                              <button type="button" class="chip-remove" data-action="delete-weekly" data-id="${esc(item.id)}" aria-label="Hapus ${esc(agentName(item.agent))} dari ${day} ${session}" title="Hapus dari jadwal">×</button>
                            </div>`;
                          })
                          .join("")
                      : `<p class="slot-empty">Tarik agen ke sini atau klik + Agen</p>`
                  }
                </div>
              </div>`;
            })
            .join("")}
        </div>
      </section>`;
    }).join("")}
  </div>`;
}

function renderSettingsView() {
  const s = activeSettings();
  return `<form id="settings-form" class="panel settings-panel">
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Pengaturan Jam Buka, Jam Tutup & Aturan Denda</h2>
        <p class="panel-description">Sesuaikan waktu mulai (buka) dan selesai (tutup) tiap sesi per hari. Matikan centang jika sesi pada hari tersebut diliburkan.</p>
      </div>
      <button type="submit" class="button primary">${icon("check")}Simpan pengaturan</button>
    </div>
    <div class="settings-body">
      <div class="settings-days">
        ${WORKDAYS.map((day) => {
          const pagi = s.operationalHours[day].Pagi;
          const siang = s.operationalHours[day].Siang;
          return `<div class="settings-day-row">
            <div class="settings-day-name"><strong>${day}</strong></div>
            <div class="settings-session-box">
              <label class="settings-check">
                <input type="checkbox" name="active_${day}_Pagi" ${pagi.active ? "checked" : ""}>
                <span>Sesi Pagi</span>
              </label>
              <div class="settings-time-pair">
                <label><span>Buka</span><input class="input" type="time" name="start_${day}_Pagi" value="${esc(pagi.start)}" required></label>
                <label><span>Tutup</span><input class="input" type="time" name="end_${day}_Pagi" value="${esc(pagi.end)}" required></label>
              </div>
            </div>
            <div class="settings-session-box">
              <label class="settings-check">
                <input type="checkbox" name="active_${day}_Siang" ${siang.active ? "checked" : ""}>
                <span>Sesi Siang</span>
              </label>
              <div class="settings-time-pair">
                <label><span>Buka</span><input class="input" type="time" name="start_${day}_Siang" value="${esc(siang.start)}" required></label>
                <label><span>Tutup</span><input class="input" type="time" name="end_${day}_Siang" value="${esc(siang.end)}" required></label>
              </div>
            </div>
          </div>`;
        }).join("")}
      </div>

      <div class="settings-rules">
        <h3>Aturan Toleransi & Kas Denda</h3>
        <p class="help">Denda hanya berlaku untuk jadwal reguler anggota biasa. <strong>PJ Sesi</strong>, <strong>Agen Ekstra (Sukarelawan)</strong>, serta status <strong>Izin / Sakit</strong> otomatis bebas denda.</p>
        <div class="form-row" style="margin-top:14px">
          <label class="form-field">
            <span>Toleransi keterlambatan (menit)</span>
            <input class="input" type="number" min="0" max="180" name="lateToleranceMinutes" value="${s.lateToleranceMinutes}" required>
          </label>
          <label class="form-field">
            <span>Nominal denda terlambat (Rp)</span>
            <input class="input" type="number" min="0" step="500" name="lateFineAmount" value="${s.lateFineAmount}" required>
          </label>
          <label class="form-field">
            <span>Nominal denda tidak hadir / bolos (Rp)</span>
            <input class="input" type="number" min="0" step="500" name="absentFineAmount" value="${s.absentFineAmount}" required>
          </label>
        </div>
      </div>
    </div>
  </form>`;
}

function renderFinesView() {
  const q = fineSearch.toLocaleLowerCase("id");
  const finedShifts = state.shifts
    .map((s) => ({ shift: s, fine: calcShiftFine(s) }))
    .filter(({ shift, fine }) => {
      if (fine.amount <= 0) return false;
      if (fineStatusFilter === "unpaid" && shift.finePaid) return false;
      if (fineStatusFilter === "paid" && !shift.finePaid) return false;
      if (q && !agentName(shift.agent).toLocaleLowerCase("id").includes(q))
        return false;
      return true;
    })
    .sort((a, b) => b.shift.date.localeCompare(a.shift.date));

  const allFined = state.shifts
    .map((s) => ({ shift: s, fine: calcShiftFine(s) }))
    .filter((x) => x.fine.amount > 0);
  const unpaidTotal = allFined
    .filter((x) => !x.shift.finePaid)
    .reduce((acc, x) => acc + x.fine.amount, 0);
  const paidTotal = allFined
    .filter((x) => x.shift.finePaid)
    .reduce((acc, x) => acc + x.fine.amount, 0);

  return `<section class="metrics">
    ${metric("Tunggakan denda", formatRupiah(unpaidTotal), "", `${allFined.filter((x) => !x.shift.finePaid).length} catatan belum lunas`, "info")}
    ${metric("Kas denda terkumpul", formatRupiah(paidTotal), "", `${allFined.filter((x) => x.shift.finePaid).length} catatan sudah lunas`, "check")}
    ${metric("Total kasus denda", allFined.length, "kasus", "Otomatis dari keterlambatan & bolos", "clock")}
    ${metric("Aturan denda aktif", formatRupiah(activeSettings().lateFineAmount), "/ telat", `Bolos: ${formatRupiah(activeSettings().absentFineAmount)}`, "review")}
  </section>
  <div class="toolbar">
    <div class="filters">
      <label class="search-field">${icon("search")}<input class="input" id="fine-search" type="search" placeholder="Cari nama agen..." aria-label="Cari denda agen" value="${esc(fineSearch)}"></label>
      <select id="fine-status-filter" aria-label="Filter status denda">
        <option value="">Semua status</option>
        <option value="unpaid" ${fineStatusFilter === "unpaid" ? "selected" : ""}>Belum lunas</option>
        <option value="paid" ${fineStatusFilter === "paid" ? "selected" : ""}>Sudah lunas</option>
      </select>
    </div>
    <button class="button" data-action="export-fines-csv">Export CSV Denda</button>
  </div>
  <section class="panel">
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Rekapitulasi kas denda kehadiran</h2>
        <p class="panel-description">Dihitung otomatis berdasarkan jam buka sesi dan batas toleransi keterlambatan</p>
      </div>
    </div>
    ${
      finedShifts.length
        ? `<div class="table-scroll"><table><thead><tr><th>TANGGAL & SESI</th><th>AGEN</th><th>KETERANGAN</th><th>NOMINAL</th><th>STATUS KAS</th><th>AKSI</th></tr></thead><tbody>
          ${finedShifts
            .map(
              ({ shift, fine }) => `<tr>
                <td><strong>${shortDate(shift.date)}</strong><br><small class="muted">Sesi ${esc(shift.session)}</small></td>
                <td>${person(shift.agent)}</td>
                <td>${esc(fine.reason)}</td>
                <td><strong>${formatRupiah(fine.amount)}</strong></td>
                <td>${badge(shift.finePaid ? "Lunas" : "Belum lunas")}</td>
                <td>
                  <button class="button" data-action="toggle-fine-paid" data-id="${esc(shift.id)}">${shift.finePaid ? "Batalkan lunas" : "Tandai lunas"}</button>
                </td>
              </tr>`,
            )
            .join("")}
        </tbody></table></div>`
        : '<div class="empty">Tidak ada catatan denda pada filter ini.</div>'
    }
  </section>`;
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
  if (!authorized) return;
  lastFocused = document.activeElement;
  document.querySelector("#dialog-content").innerHTML =
    `<div class="dialog-header"><div><p class="eyebrow">${eyebrow}</p><h2 id="dialog-title">${esc(title)}</h2></div><button class="icon-button" data-action="close" aria-label="Tutup panel">${icon("close")}</button></div><div class="dialog-body">${body}</div>`;
  dialog.querySelectorAll(".form-field").forEach((label, index) => {
    const control = label.querySelector("input, select, textarea");
    const titleEl = label.querySelector("span");
    const help = label.querySelector(".help");
    if (control && titleEl)
      control.setAttribute("aria-label", titleEl.textContent);
    if (control && help) {
      if (!help.id) help.id = `field-help-${index}`;
      control.setAttribute("aria-describedby", help.id);
    }
  });
  enhanceAgentPickers(dialog, state.agents);
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}
function closeDialog() {
  if (operationPending) return;
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
    weekly = (state.weeklySchedule || []).filter((w) => w.agent === a.id),
    assigned = state.posts.filter((p) => p.agent === a.id),
    agentStat = computeAgentStats("all").find((x) => x.agent.id === a.id);
  openDialog(
    "Profil agen",
    "DIREKTORI POJOK STATISTIK",
    `<div class="profile-hero">${avatar(a)}<div><h3>${esc(a.name)}</h3><p>${esc(a.position)}</p><span class="division-label">${esc(a.division)}</span></div></div><div class="photo-control"><label class="field-label" for="agent-photo">Foto profil</label><input type="file" id="agent-photo" data-agent="${esc(a.id)}" accept="image/png,image/jpeg,image/webp"><p class="help">JPG, PNG, atau WebP, maksimal 5 MB. Foto dipotong persegi dan diperkecil sebelum diunggah.</p>${a.photo ? `<button class="text-button" data-action="remove-photo" data-id="${esc(a.id)}">Hapus foto</button>` : ""}</div><dl class="profile-data"><div><dt>Periode</dt><dd>${esc(a.period)}</dd></div><div><dt>Status keanggotaan</dt><dd>${badge(a.active ? "Aktif" : "Nonaktif")}</dd></div><div><dt>Total kehadiran</dt><dd><strong>${agentStat?.totalSessions || 0} sesi</strong> reguler</dd></div><div><dt>Estimasi durasi kontribusi</dt><dd><strong>${agentStat?.totalMinutes || 0} menit</strong><br><small>${agentStat?.extraMinutes || 0} menit sukarela</small></dd></div></dl><div class="profile-note">Profil ini merupakan data anggota. Agen tidak memiliki akun login; seluruh pengelolaan dilakukan admin.</div><section class="profile-section"><h3>Jadwal rutin mingguan <span class="pill-count">${weekly.length}</span></h3>${weekly.length ? weekly.map((w) => `<div class="task-row"><span class="task-icon blue">${icon("calendar")}</span><span><strong>Setiap ${esc(w.day)} · Sesi ${esc(w.session)}</strong><small>${w.pj ? "Penanggung jawab sesi" : "Anggota"}</small></span></div>`).join("") : '<p class="help">Belum ada jadwal rutin mingguan.</p>'}</section><section class="profile-section"><h3>Riwayat penugasan & absensi <span class="pill-count">${shifts.length}</span></h3>${shifts.length ? shifts.map((s) => `<div class="task-row"><span class="task-icon blue">${icon("calendar")}</span><span><strong>${shortDate(s.date)} · Sesi ${s.session}</strong><small>${s.extra ? "Agen ekstra (sukarelawan)" : s.pj ? "Penanggung jawab sesi" : "Anggota"}${s.time ? ` · ${s.time} WIB (${calcShiftDuration(s)} mnt)` : ""}</small></span>${badge(s.status)}</div>`).join("") : '<p class="help">Belum ada penugasan.</p>'}</section><section class="profile-section"><h3>Kontribusi konten <span class="pill-count">${assigned.length}</span></h3>${assigned.map(upcomingRow).join("") || '<p class="help">Belum ada konten yang ditugaskan.</p>'}</section><div class="dialog-footer"><span class="help">Dikelola oleh admin</span><button class="button" data-action="edit-agent" data-id="${esc(a.id)}">${icon("edit")}Edit profil</button></div>`,
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
  return (
    (!current ? '<option value="" selected disabled>Pilih agen</option>' : "") +
    state.agents
      .filter((a) => a.active || a.id === current)
      .map(
        (a) =>
          `<option value="${esc(a.id)}" ${a.id === current ? "selected" : ""}>${esc(a.name)}</option>`,
      )
      .join("")
  );
}
function positionSuggestions(division, current = "") {
  return positionChoices(division, current)
    .map((position) => `<option value="${esc(position)}"></option>`)
    .join("");
}
function updatePositionSuggestions() {
  const form = document.querySelector("#agent-form");
  if (!form) return;
  const division = form.elements.division.value;
  const current = form.elements.position.value;
  form.querySelector("#position-options").innerHTML = positionSuggestions(
    division,
    current,
  );
  form.querySelector("#position-help").textContent = isCoreDivision(division)
    ? "Pilih saran jabatan Pengurus Inti atau ketik jabatan sendiri. Nama dan jabatan dapat diedit."
    : "Pilih BPH atau Anggota. Jabatan khusus yang sudah ada tetap dapat disunting.";
  form.querySelector("#position-shortcuts").innerHTML = positionChoices(
    division,
  )
    .map(
      (position) =>
        `<button type="button" class="position-shortcut" data-action="set-agent-position" data-position="${esc(position)}">${esc(position)}</button>`,
    )
    .join("");
}
function editAgent(agentId) {
  const a = findAgent(agentId) || {
    name: "",
    division: "",
    position: "Anggota",
    active: true,
  };
  openDialog(
    agentId ? "Edit profil agen" : "Tambah agen",
    "DIREKTORI AGEN",
    `<form id="agent-form" data-id="${esc(agentId || "")}"><label class="form-field"><span>Nama lengkap</span><input class="input" name="name" required maxlength="80" value="${esc(a.name)}" placeholder="Nama lengkap agen"></label><label class="form-field"><span>Divisi</span><select name="division" required><option value="">Pilih divisi</option>${options(availableDivisions(a.division), a.division)}</select></label><label class="form-field"><span>Jabatan</span><input class="input" name="position" list="position-options" autocomplete="off" required maxlength="60" value="${esc(a.position)}"><datalist id="position-options">${positionSuggestions(a.division, a.position)}</datalist><small class="help" id="position-help"></small></label><label class="form-field"><span>Status</span><select name="active"><option value="true" ${a.active ? "selected" : ""}>Aktif</option><option value="false" ${!a.active ? "selected" : ""}>Nonaktif</option></select></label><div id="position-shortcuts" class="position-shortcuts" aria-label="Saran jabatan"></div><p class="profile-note">Menambahkan agen hanya membuat profil anggota. Tidak ada akun atau kredensial yang dibuat.</p><div class="dialog-footer"><button type="button" class="button" data-action="close">Batal</button><button class="button primary" type="submit">Simpan profil</button></div></form>`,
  );
  updatePositionSuggestions();
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
      .map(
        (src, i) =>
          `<img src="${esc(src)}" alt="Materi konten slide ${i + 1}">`,
      )
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
    agent: "",
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
    `<form id="post-form" data-id="${esc(postId || "")}"><label class="form-field"><span>Judul konten</span><input class="input" name="title" required maxlength="120" value="${esc(p.title)}" placeholder="Cerita apa yang ingin dibagikan?"></label><div class="form-row"><label class="form-field"><span>Tanggal publikasi</span><input class="input" name="date" type="date" required value="${p.date}"></label><label class="form-field"><span>Jam publikasi (WIB)</span><input class="input" name="time" type="time" required value="${p.time}"></label></div><div class="form-row"><label class="form-field"><span>Format</span><select name="format">${options(["Feed", "Carousel", "Reel", "Story"], p.format)}</select></label><label class="form-field"><span>Status</span><select name="status" id="post-status">${options(statuses, p.status)}</select></label></div><label class="form-field"><span>Penanggung jawab</span><select name="agent" required>${agentOptions(p.agent)}</select></label><label class="form-field"><span>Kategori / program</span><input class="input" name="category" maxlength="60" value="${esc(p.category)}" placeholder="Contoh: Cerita Data"></label><label class="form-field"><span>Brief & detail pengerjaan</span><textarea name="brief" maxlength="4000" placeholder="Tujuan, sumber data, isi setiap slide, dan catatan untuk tim...">${esc(p.brief)}</textarea></label><label class="form-field"><span>Caption</span><textarea name="caption" maxlength="2200" placeholder="Tulis caption dan hashtag...">${esc(p.caption)}</textarea></label><label class="form-field"><span>Gambar / slide carousel</span><input id="post-images" type="file" accept="image/jpeg,image/png,image/webp" multiple><small class="help">Maksimal 4 gambar, 5 MB per gambar. Urutan unggah menjadi urutan slide. Untuk video, cantumkan tautan materi dalam brief.</small></label><div class="media-preview" id="draft-images"></div><label class="form-field" style="margin-top:20px"><span>Tautan postingan Instagram</span><input class="input" name="link" id="post-link" type="url" value="${esc(p.link)}" placeholder="https://www.instagram.com/p/..." ${p.status === "Terbit" ? "required" : ""}><small class="help">Wajib diisi saat status Terbit. Jadwal tidak memposting otomatis.</small></label><div class="dialog-footer"><button class="button" type="button" data-action="close">Batal</button><button class="button primary" id="save-post" type="submit">Simpan konten</button></div></form>`,
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
          `<figure><img src="${esc(src)}" alt="Slide ${i + 1}"><button type="button" data-action="remove-draft-image" data-index="${i}">Hapus slide ${i + 1}</button></figure>`,
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
    `<form id="shift-form"><label class="form-field"><span>Agen</span><select name="agent" required>${agentOptions("")}</select></label><label class="form-field"><span>Tanggal</span><input class="input" name="date" type="date" value="${attendanceDate}" required></label><label class="form-field"><span>Sesi</span><select name="session">${options(["Pagi", "Siang"], attendanceSession || "Pagi")}</select></label><label class="form-field"><span>Peran</span><select name="role"><option value="member">Anggota</option><option value="pj">Penanggung jawab sesi</option><option value="extra">Agen ekstra (sukarelawan · bebas denda)</option></select></label><p class="help">Penugasan ini berlaku untuk tanggal yang dipilih. Untuk jadwal rutin mingguan per hari, gunakan tab Jadwal Master.</p><div class="dialog-footer"><button class="button" type="button" data-action="close">Batal</button><button class="button primary" type="submit">Simpan penugasan</button></div></form>`,
  );
}
function openExtraShiftModal() {
  const currentTime = nowJakartaTime();
  openDialog(
    "Hadirkan agen ekstra (sukarelawan)",
    "SUKARELAWAN & BACK-UP JAGA",
    `<form id="extra-shift-form">
      <label class="form-field"><span>Pilih agen sukarelawan</span><select name="agent" required>${agentOptions("")}</select></label>
      <div class="form-row">
        <label class="form-field"><span>Tanggal</span><input class="input" name="date" type="date" value="${attendanceDate}" required></label>
        <label class="form-field"><span>Sesi</span><select name="session">${options(["Pagi", "Siang"], attendanceSession || "Pagi")}</select></label>
      </div>
      <label class="form-field"><span>Jam hadir (WIB)</span><input class="input" name="time" type="time" value="${esc(currentTime)}" required><small class="help">Agen ekstra tidak memiliki jadwal wajib di sesi ini, sehingga <strong>100% bebas denda keterlambatan</strong> dan hanya menambah estimasi durasi apresiasi, bukan jumlah sesi reguler. Datang kapan pun pada sesi ini tetap bebas denda.</small></label>
      <div class="dialog-footer">
        <button class="button" type="button" data-action="close">Batal</button>
        <button class="button primary" type="submit">Catat hadir ekstra</button>
      </div>
    </form>`,
  );
}
function openWeeklyModal(day = "Senin", session = "Pagi", existingId = "") {
  const existing = (state.weeklySchedule || []).find(
    (w) => w.id === existingId,
  );
  openDialog(
    existing ? "Pindahkan jadwal rutin" : "Tambah ke Jadwal Master",
    "JADWAL MASTER MINGGUAN",
    `<form id="weekly-form" data-id="${esc(existingId)}">
      <label class="form-field"><span>Agen</span><select name="agent" required ${existing ? "disabled" : ""}>${agentOptions(existing?.agent || "")}</select></label>
      <div class="form-row">
        <label class="form-field"><span>Hari jaga</span><select name="day">${options(WORKDAYS, existing?.day || day)}</select></label>
        <label class="form-field"><span>Sesi</span><select name="session">${options(["Pagi", "Siang"], existing?.session || session)}</select></label>
      </div>
      <label class="form-field"><span>Peran di sesi ini</span><select name="role"><option value="member" ${!existing?.pj ? "selected" : ""}>Anggota</option><option value="pj" ${existing?.pj ? "selected" : ""}>Penanggung jawab sesi (PJ)</option></select></label>
      <p class="help">Jadwal Master berlaku berulang setiap minggu pada hari dan sesi tersebut.</p>
      <div class="dialog-footer">
        <button class="button" type="button" data-action="close">Batal</button>
        <button class="button primary" type="submit">Simpan jadwal master</button>
      </div>
    </form>`,
  );
}
function recordAttendance(shiftId, masterMeta = null) {
  let s = state.shifts.find((x) => x.id === shiftId);
  if (!s && masterMeta) {
    s = {
      id: "",
      _masterMeta: masterMeta,
      agent: masterMeta.agent,
      date: attendanceDate,
      session: masterMeta.session,
      pj: masterMeta.pj,
      extra: false,
      status: "Belum dicatat",
      time: "",
    };
  }
  if (!s) return;
  const defaultTime =
    s.time || getSessionConfig(s.date, s.session).start || "10:00";
  openDialog(
    "Catat kehadiran",
    "ABSENSI OLEH ADMIN",
    `<div class="profile-hero">${person(s.agent)}</div><p class="help">${formatDate(s.date)} · Sesi ${s.session} · ${s.extra ? "Agen ekstra (sukarelawan · bebas denda)" : s.pj ? "Penanggung jawab" : "Anggota"}</p><form id="attendance-form" data-id="${esc(s.id)}" data-agent="${esc(s.agent)}" data-date="${esc(s.date)}" data-session="${esc(s.session)}" data-pj="${s.pj ? "true" : "false"}"><label class="form-field"><span>Status kehadiran</span><select name="status" id="attendance-status">${options(["Belum dicatat", "Hadir", "Izin", "Sakit", "Tidak hadir"], s.status)}</select></label><label class="form-field"><span>Jam hadir (WIB)</span><input class="input" name="time" id="attendance-time" type="time" value="${esc(s.status === "Hadir" ? s.time : defaultTime)}" ${s.status === "Hadir" ? "required" : "disabled"}><small class="help">Masukkan waktu kehadiran sebenarnya. Durasi menit jaga dan denda (bila terlambat) dihitung otomatis.</small></label><div class="dialog-footer"><button type="button" class="button" data-action="close">Batal</button><button class="button primary" type="submit">Simpan kehadiran</button></div></form>`,
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

// Drag & Drop handlers for Jadwal Master Mingguan
document.addEventListener("dragstart", (e) => {
  const chip = e.target.closest(".master-chip[data-weekly-id]");
  if (!chip || !authorized || operationPending) return;
  draggedWeeklyId = chip.dataset.weeklyId;
  chip.classList.add("dragging");
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", draggedWeeklyId);
  }
});
document.addEventListener("dragend", (e) => {
  const chip = e.target.closest(".master-chip");
  if (chip) chip.classList.remove("dragging");
  document
    .querySelectorAll(".master-slot.drag-over")
    .forEach((el) => el.classList.remove("drag-over"));
});
document.addEventListener("dragover", (e) => {
  const slot = e.target.closest(".master-slot[data-drop-slot]");
  if (!slot || !draggedWeeklyId) return;
  e.preventDefault();
  slot.classList.add("drag-over");
});
document.addEventListener("dragleave", (e) => {
  const slot = e.target.closest(".master-slot[data-drop-slot]");
  if (slot && !slot.contains(e.relatedTarget)) {
    slot.classList.remove("drag-over");
  }
});
document.addEventListener("drop", async (e) => {
  const slot = e.target.closest(".master-slot[data-drop-slot]");
  if (!slot || !draggedWeeklyId || !authorized || operationPending) return;
  e.preventDefault();
  slot.classList.remove("drag-over");
  const targetDay = slot.dataset.day;
  const targetSession = slot.dataset.session;
  const item = (state.weeklySchedule || []).find(
    (w) => w.id === draggedWeeklyId,
  );
  draggedWeeklyId = "";
  if (!item || (item.day === targetDay && item.session === targetSession))
    return;
  if (
    (state.weeklySchedule || []).some(
      (w) =>
        w.id !== item.id &&
        w.agent === item.agent &&
        w.day === targetDay &&
        w.session === targetSession,
    )
  ) {
    toast("Agen sudah terdaftar di hari dan sesi tersebut.");
    return;
  }
  if (
    await update((s) => {
      const target = s.weeklySchedule.find((w) => w.id === item.id);
      if (target) {
        target.day = targetDay;
        target.session = targetSession;
      }
    }, `Jadwal dipindahkan ke ${targetDay} · Sesi ${targetSession}.`)
  ) {
    renderAttendance();
  }
});

document.addEventListener("click", async (e) => {
  if (operationPending || !authorized) return;
  const button = e.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action,
    recordId = button.dataset.id;
  switch (action) {
    case "set-agent-position": {
      const field = document.querySelector('#agent-form [name="position"]');
      if (field) {
        field.value = button.dataset.position;
        field.focus();
      }
      break;
    }
    case "import-agents":
      await previewAgentImport();
      break;
    case "confirm-import-agents":
      await confirmAgentImport();
      break;
    case "import-legacy-schedule":
      await previewScheduleImport();
      break;
    case "confirm-import-schedule":
      await confirmScheduleImport();
      break;
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
        "Konten ini akan dihapus dari workspace. Tindakan ini tidak dapat dibatalkan.",
        "confirm-delete-post",
        recordId,
      );
      break;
    case "confirm-delete-post":
      if (
        await update(
          (s) => (s.posts = s.posts.filter((p) => p.id !== recordId)),
          "Konten dihapus.",
        )
      ) {
        closeDialog();
        render();
      }
      break;
    case "remove-photo":
      if (
        await update(
          (s) => (s.agents.find((a) => a.id === recordId).photo = ""),
          "Foto dihapus.",
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
    case "open-fines-tab":
      attendanceTab = "denda";
      navigate("kehadiran");
      break;
    case "analytics-scope":
      analyticsScope = button.dataset.scope || "all";
      renderHome();
      break;
    case "show-certificate":
      showCertificate(recordId);
      break;
    case "print-certificate":
      window.print();
      break;
    case "attendance-tab":
      attendanceTab = button.dataset.tab || "harian";
      renderAttendance();
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
    case "new-extra-shift":
      openExtraShiftModal();
      break;
    case "add-weekly":
      openWeeklyModal(button.dataset.day, button.dataset.session);
      break;
    case "move-weekly":
      openWeeklyModal("Senin", "Pagi", recordId);
      break;
    case "toggle-weekly-pj":
      if (
        await update((s) => {
          const w = s.weeklySchedule.find((x) => x.id === recordId);
          if (w) w.pj = !w.pj;
        }, "Peran jadwal master diperbarui.")
      ) {
        renderAttendance();
      }
      break;
    case "delete-weekly":
      confirmAction(
        "Hapus jadwal rutin",
        "Agen ini akan dihapus dari slot Jadwal Master mingguan tersebut.",
        "confirm-delete-weekly",
        recordId,
      );
      break;
    case "confirm-delete-weekly":
      if (
        await update(
          (s) =>
            (s.weeklySchedule = s.weeklySchedule.filter(
              (w) => w.id !== recordId,
            )),
          "Jadwal rutin dihapus.",
        )
      ) {
        closeDialog();
        renderAttendance();
      }
      break;
    case "attendance":
      if (recordId) {
        recordAttendance(recordId);
      } else {
        recordAttendance("", {
          agent: button.dataset.agent,
          session: button.dataset.session,
          pj: button.dataset.pj === "true",
        });
      }
      break;
    case "quick-attend": {
      const targetStatus = button.dataset.status;
      const cfg = getSessionConfig(
        attendanceDate,
        button.dataset.session || "Pagi",
      );
      const autoTime =
        targetStatus === "Hadir"
          ? attendanceDate === TODAY
            ? nowJakartaTime()
            : cfg.start
          : "";
      if (recordId) {
        if (
          await update((s) => {
            const row = s.shifts.find((x) => x.id === recordId);
            if (row) {
              row.status = targetStatus;
              row.time = targetStatus === "Hadir" ? row.time || autoTime : "";
            }
          }, `Status diubah menjadi ${targetStatus}.`)
        ) {
          renderAttendance();
        }
      } else {
        const agentId = button.dataset.agent;
        const session = button.dataset.session;
        const isPj = button.dataset.pj === "true";
        if (
          await update((s) => {
            s.shifts.push({
              id: id(),
              date: attendanceDate,
              session,
              agent: agentId,
              pj: isPj,
              extra: false,
              finePaid: false,
              status: targetStatus,
              time: autoTime,
            });
          }, `Kehadiran ${targetStatus} tercatat.`)
        ) {
          renderAttendance();
        }
      }
      break;
    }
    case "reset-attendance":
      confirmAction(
        "Batalkan catatan kehadiran",
        "Catatan kehadiran (beserta denda terkait jika ada) pada sesi ini akan direset.",
        "confirm-reset-attendance",
        recordId,
      );
      break;
    case "confirm-reset-attendance":
      if (
        await update(
          (s) => (s.shifts = s.shifts.filter((x) => x.id !== recordId)),
          "Catatan kehadiran dibatalkan.",
        )
      ) {
        closeDialog();
        renderAttendance();
      }
      break;
    case "mark-all-present": {
      const pendingList = effectiveShiftsForDate(
        attendanceDate,
        attendanceSession,
      ).filter((s) => s.status === "Belum dicatat");
      if (!pendingList.length) {
        toast("Semua agen terjadwal sudah dicatat kehadirannya.");
        return;
      }
      const mutators = pendingList.map((item) => {
        const sessStart = getSessionConfig(attendanceDate, item.session).start;
        if (item.fromMaster) {
          return (s) => {
            s.shifts.push({
              id: id(),
              date: attendanceDate,
              session: item.session,
              agent: item.agent,
              pj: Boolean(item.pj),
              extra: false,
              finePaid: false,
              status: "Hadir",
              time: sessStart,
            });
          };
        }
        return (s) => {
          const target = s.shifts.find((x) => x.id === item.id);
          if (target) {
            target.status = "Hadir";
            target.time = sessStart;
          }
        };
      });
      if (
        await updateMany(
          mutators,
          `${pendingList.length} agen ditandai Hadir tepat waktu.`,
        )
      ) {
        renderAttendance();
      }
      break;
    }
    case "toggle-fine-paid":
      if (
        await update((s) => {
          const target = s.shifts.find((x) => x.id === recordId);
          if (target) target.finePaid = !target.finePaid;
        }, "Status pembayaran denda diperbarui.")
      ) {
        renderAttendance();
      }
      break;
    case "export-attendance-csv": {
      const rows = effectiveShiftsForDate(
        attendanceDate,
        attendanceSession,
      ).map((s) => [
        s.date,
        getDayName(s.date),
        s.session,
        agentName(s.agent),
        s.extra ? "Agen Ekstra" : s.pj ? "PJ Sesi" : "Anggota",
        s.status,
        s.time || "-",
        calcShiftDuration(s),
        calcShiftFine(s).amount,
      ]);
      downloadCsv(
        `absensi-pojok-statistik-${attendanceDate}.csv`,
        [
          "Tanggal",
          "Hari",
          "Sesi",
          "Nama Agen",
          "Peran",
          "Status",
          "Jam Hadir",
          "Durasi (Menit)",
          "Denda (Rp)",
        ],
        rows,
      );
      toast("File CSV absensi berhasil diunduh.");
      break;
    }
    case "export-fines-csv": {
      const rows = state.shifts
        .map((s) => ({ s, fine: calcShiftFine(s) }))
        .filter((x) => x.fine.amount > 0)
        .map(({ s, fine }) => [
          s.date,
          s.session,
          agentName(s.agent),
          fine.reason,
          fine.amount,
          s.finePaid ? "Lunas" : "Belum Lunas",
        ]);
      downloadCsv(
        `rekap-denda-pojok-statistik-${TODAY}.csv`,
        [
          "Tanggal",
          "Sesi",
          "Nama Agen",
          "Keterangan",
          "Nominal Denda",
          "Status",
        ],
        rows,
      );
      toast("File CSV rekap denda berhasil diunduh.");
      break;
    }
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
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "agent-search") {
    agentSearch = e.target.value;
    renderAgentCards();
  }
  if (e.target.id === "fine-search") {
    fineSearch = e.target.value;
    renderAttendance();
  }
  if (e.target.id === "post-link") e.target.setCustomValidity("");
});
document.addEventListener("change", async (e) => {
  const el = e.target;
  if (el.name === "division" && el.closest("#agent-form"))
    updatePositionSuggestions();
  switch (el.id) {
    case "agent-sort":
      agentSort = el.value;
      renderAgentCards();
      break;
    case "agent-role-filter":
      agentRoleFilter = el.value;
      renderAgentCards();
      break;
    case "division-filter":
      divisionFilter = el.value;
      renderAgentCards();
      break;
    case "session-filter":
      attendanceSession = el.value;
      renderAttendance();
      break;
    case "fine-status-filter":
      fineStatusFilter = el.value;
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
          await update(
            (s) =>
              (s.agents.find((a) => a.id === el.dataset.agent).photo = photo),
            "Foto agen tersimpan.",
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
        toast("Maksimal 4 gambar per konten.");
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
document.addEventListener("submit", async (e) => {
  const form = e.target;
  if (!authorized) return;
  if (
    ![
      "agent-form",
      "post-form",
      "shift-form",
      "extra-shift-form",
      "weekly-form",
      "settings-form",
      "attendance-form",
    ].includes(form.id)
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
        await update((s) => {
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
        }, "Profil agen tersimpan.")
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
        await update((s) => {
          const existing = s.posts.find((p) => p.id === savedId);
          const patch = { ...data, title, images: [...draftImages] };
          if (existing) Object.assign(existing, patch);
          else s.posts.push({ id: savedId, ...patch });
        }, "Konten tersimpan di kalender.")
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
      const isExtra = data.role === "extra";
      if (
        isExtra &&
        effectiveShiftsForDate(data.date, data.session).some(
          (s) => s.agent === data.agent && !s.extra,
        )
      ) {
        toast(
          "Agen ini bertugas reguler pada sesi tersebut. Catat melalui kehadiran reguler.",
        );
        return;
      }
      const isPj = data.role === "pj";
      if (
        await update(
          (s) =>
            s.shifts.push({
              id: id(),
              date: data.date,
              session: data.session,
              agent: data.agent,
              pj: isPj,
              extra: isExtra,
              finePaid: false,
              status: "Belum dicatat",
              time: "",
            }),
          "Penugasan tersimpan.",
        )
      ) {
        attendanceDate = data.date;
        attendanceSession = "";
        closeDialog();
        renderAttendance();
      }
      break;
    }
    case "extra-shift-form": {
      if (
        effectiveShiftsForDate(data.date, data.session).some(
          (s) => s.agent === data.agent && !s.extra,
        )
      ) {
        toast(
          "Agen ini bertugas reguler pada sesi tersebut. Catat melalui kehadiran reguler.",
        );
        return;
      }
      const existing = state.shifts.find(
        (s) =>
          s.date === data.date &&
          s.session === data.session &&
          s.agent === data.agent,
      );
      if (
        await update((s) => {
          if (existing) {
            const target = s.shifts.find((x) => x.id === existing.id);
            Object.assign(target, {
              extra: true,
              status: "Hadir",
              time: data.time,
            });
          } else {
            s.shifts.push({
              id: id(),
              date: data.date,
              session: data.session,
              agent: data.agent,
              pj: false,
              extra: true,
              finePaid: false,
              status: "Hadir",
              time: data.time,
            });
          }
        }, "Agen ekstra (sukarelawan) tercatat hadir & bebas denda.")
      ) {
        attendanceDate = data.date;
        attendanceSession = "";
        closeDialog();
        renderAttendance();
      }
      break;
    }
    case "weekly-form": {
      const targetId = recordId || "";
      const existing = (state.weeklySchedule || []).find(
        (w) => w.id === targetId,
      );
      const agentId = existing ? existing.agent : data.agent;
      if (
        (state.weeklySchedule || []).some(
          (w) =>
            w.id !== targetId &&
            w.agent === agentId &&
            w.day === data.day &&
            w.session === data.session,
        )
      ) {
        toast(
          "Agen sudah terdaftar pada hari dan sesi tersebut di Jadwal Master.",
        );
        return;
      }
      if (
        await update((s) => {
          if (existing) {
            const w = s.weeklySchedule.find((x) => x.id === targetId);
            Object.assign(w, {
              day: data.day,
              session: data.session,
              pj: data.role === "pj",
            });
          } else {
            s.weeklySchedule.push({
              id: id(),
              agent: agentId,
              day: data.day,
              session: data.session,
              pj: data.role === "pj",
            });
          }
        }, "Jadwal Master mingguan diperbarui.")
      ) {
        closeDialog();
        renderAttendance();
      }
      break;
    }
    case "settings-form": {
      const operationalHours = {};
      for (const day of WORKDAYS) {
        operationalHours[day] = {
          Pagi: {
            active: Boolean(data[`active_${day}_Pagi`]),
            start: data[`start_${day}_Pagi`] || "10:00",
            end: data[`end_${day}_Pagi`] || "12:30",
          },
          Siang: {
            active: Boolean(data[`active_${day}_Siang`]),
            start: data[`start_${day}_Siang`] || "13:30",
            end: data[`end_${day}_Siang`] || "16:00",
          },
        };
      }
      const patch = {
        id: SETTINGS_ID,
        lateToleranceMinutes: Math.max(
          0,
          Number(data.lateToleranceMinutes ?? 15),
        ),
        lateFineAmount: Math.max(0, Number(data.lateFineAmount ?? 5000)),
        absentFineAmount: Math.max(0, Number(data.absentFineAmount ?? 10000)),
        operationalHours,
      };
      if (
        await update((s) => {
          if (s.settings.length) Object.assign(s.settings[0], patch);
          else s.settings.push(patch);
        }, "Pengaturan jam buka/tutup & aturan denda tersimpan.")
      ) {
        renderAttendance();
      }
      break;
    }
    case "attendance-form": {
      if (recordId) {
        if (
          await update(
            (s) =>
              Object.assign(
                s.shifts.find((x) => x.id === recordId),
                {
                  status: data.status,
                  time: data.status === "Hadir" ? data.time : "",
                },
              ),
            "Kehadiran diperbarui.",
          )
        ) {
          closeDialog();
          renderAttendance();
        }
      } else {
        if (
          await update(
            (s) =>
              s.shifts.push({
                id: id(),
                date: form.dataset.date || attendanceDate,
                session: form.dataset.session || "Pagi",
                agent: form.dataset.agent,
                pj: form.dataset.pj === "true",
                extra: false,
                finePaid: false,
                status: data.status,
                time: data.status === "Hadir" ? data.time : "",
              }),
            "Kehadiran diperbarui.",
          )
        ) {
          closeDialog();
          renderAttendance();
        }
      }
      break;
    }
  }
});
window.addEventListener("hashchange", () => {
  if (!authorized || operationPending) return;
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

// Authentication is independent of agent records; only the singleton ps_admin
// membership and database policies grant access, never a local UI flag.
const authScreen = document.querySelector("#auth-screen");
const shell = document.querySelector("#workspace-shell");
const loginForm = document.querySelector("#login-form");
const authError = document.querySelector("#auth-error");
const authProgress = document.querySelector("#auth-progress");
let authBusy = false;
let lastRefresh = 0;

function clearWorkspace(message = "") {
  sessionEpoch++;
  authorized = false;
  state = emptyState();
  main.replaceChildren();
  document.querySelector("#navigation").replaceChildren();
  document.querySelector("#dialog-content").replaceChildren();
  draftImages = [];
  legacyAgentPreview = [];
  legacySchedulePreview = [];
  if (dialog.open) dialog.close();
  shell.hidden = true;
  authScreen.hidden = false;
  authError.textContent = message;
  document.querySelector("#connection-status").textContent = "Belum masuk";
}
function authLoading(active, text = "") {
  authBusy = active;
  loginForm
    .querySelectorAll("input,button")
    .forEach((input) => (input.disabled = active));
  authProgress.textContent = text;
}
async function enterWorkspace() {
  const epoch = ++sessionEpoch;
  authLoading(true, "Memuat workspace…");
  authError.textContent = "";
  try {
    await repository.requireAdmin();
    const records = await repository.load();
    if (epoch !== sessionEpoch) return;
    state = records;
    authorized = true;
    authScreen.hidden = true;
    shell.hidden = false;
    lastRefresh = Date.now();
    document.querySelector("#connection-status").textContent = "Terhubung";
    document.querySelector("#retry-connection").hidden = true;
    render();
  } catch (error) {
    if (epoch !== sessionEpoch) return;
    clearWorkspace(readableError(error));
    document.querySelector("#retry-connection").hidden = false;
    if (error?.code === "NOT_ADMIN")
      await client.auth.signOut({ scope: "local" });
  } finally {
    authLoading(false);
  }
}
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (authBusy) return;
  const fields = new FormData(loginForm);
  authError.textContent = "";
  authLoading(true, "Memeriksa akun admin…");
  try {
    await loginWithUsername(
      client,
      fields.get("username"),
      fields.get("password"),
    );
    await enterWorkspace();
  } catch (error) {
    authError.textContent = error.message || "Belum dapat masuk. Coba lagi.";
  } finally {
    loginForm.elements.password.value = "";
    authLoading(false);
  }
});
document.querySelector("#retry-connection").addEventListener("click", () => {
  if (!authBusy) void enterWorkspace();
});
document.querySelector("#sign-out").addEventListener("click", async () => {
  if (operationPending) return;
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error) toast("Belum dapat keluar. Periksa koneksi lalu coba lagi.");
  else clearWorkspace();
});
async function refreshWorkspace({ silent = false } = {}) {
  if (!authorized || operationPending || dialog.open) {
    if (!silent && dialog.open)
      toast(
        "Tutup panel terlebih dahulu agar perubahan yang belum disimpan tetap aman.",
      );
    return;
  }
  const epoch = sessionEpoch;
  operationPending = true;
  document.querySelector("#connection-status").textContent = "Memuat ulang…";
  document.body.classList.add("saving");
  try {
    await repository.requireAdmin();
    const records = await repository.load();
    if (epoch !== sessionEpoch || !authorized) return;
    state = records;
    lastRefresh = Date.now();
    render();
    if (!silent) toast("Data terbaru sudah dimuat.");
  } catch (error) {
    if (["NOT_ADMIN", "SESSION_REQUIRED"].includes(error?.code))
      clearWorkspace(readableError(error));
    else toast(readableError(error));
  } finally {
    operationPending = false;
    document.body.classList.remove("saving");
    document.querySelector("#connection-status").textContent = authorized
      ? "Terhubung"
      : "Belum masuk";
  }
}
document
  .querySelector("#refresh-data")
  .addEventListener("click", () => void refreshWorkspace());
// Signed media expire in an hour; refresh when returning after 45 minutes,
// without interrupting a form or overwriting an unsaved draft.
window.addEventListener("focus", () => {
  if (Date.now() - lastRefresh > 45 * 60 * 1000)
    void refreshWorkspace({ silent: true });
});
client.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT")
    clearWorkspace("Sesi telah berakhir. Silakan masuk kembali.");
});
dialog.addEventListener("cancel", (event) => {
  if (operationPending) event.preventDefault();
});
async function bootstrap() {
  authLoading(true, "Memeriksa sesi…");
  try {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (data.session) await enterWorkspace();
  } catch {
    clearWorkspace("Sesi belum dapat dibaca. Silakan masuk kembali.");
  } finally {
    authLoading(false);
  }
}
void bootstrap();

async function previewAgentImport() {
  operationPending = true;
  document.body.classList.add("saving");
  const epoch = sessionEpoch;
  try {
    const records = await repository.previewLegacyAgents();
    if (!authorized || epoch !== sessionEpoch) return;
    legacyAgentPreview = records;
    if (records.length > 500) {
      toast(
        "Ada lebih dari 500 agen. Siapkan migrasi bertahap sebelum melakukan impor.",
      );
      return;
    }
    openDialog(
      "Impor agen lama",
      "PRATINJAU DATA",
      `<p class="help">${records.length} profil akan disalin dari daftar agen lama. Nama, divisi, dan status Pengurus Inti / BPH ikut disalin; jabatan dapat diedit setelah impor.</p><div class="table-scroll"><table><thead><tr><th>NAMA</th><th>DIVISI</th><th>JABATAN AWAL</th></tr></thead><tbody>${records.map((a) => `<tr><td>${esc(a.name)}</td><td>${esc(a.division)}</td><td>${esc(a.position)}</td></tr>`).join("")}</tbody></table></div><p class="help">Profil dengan ID sumber yang pernah diimpor akan dilewati. Data lama tetap tersedia.</p><div class="dialog-footer"><button class="button" data-action="close">Batal</button><button class="button primary" data-action="confirm-import-agents" ${records.length ? "" : "disabled"}>Impor ${records.length} agen</button></div>`,
    );
  } catch (error) {
    toast(readableError(error));
  } finally {
    operationPending = false;
    document.body.classList.remove("saving");
  }
}
async function confirmAgentImport() {
  if (!legacyAgentPreview.length) return;
  const epoch = sessionEpoch;
  operationPending = true;
  document.body.classList.add("saving");
  try {
    const result = await repository.importLegacyAgents(legacyAgentPreview);
    legacyAgentPreview = [];
    if (epoch !== sessionEpoch || !authorized) return;
    dialog.close();
    toast(
      `${result.imported} agen diimpor, ${result.skipped} profil lama dilewati.`,
    );
    try {
      const records = await repository.load();
      if (epoch === sessionEpoch && authorized) {
        state = records;
        render();
      }
    } catch {
      toast(
        "Impor berhasil. Data terbaru belum dapat dimuat; gunakan Muat ulang.",
      );
    }
  } catch (error) {
    if (epoch === sessionEpoch && authorized) toast(readableError(error));
  } finally {
    operationPending = false;
    document.body.classList.remove("saving");
  }
}

async function previewScheduleImport() {
  operationPending = true;
  document.body.classList.add("saving");
  const epoch = sessionEpoch;
  try {
    const raw = await repository.previewLegacySchedule();
    if (!authorized || epoch !== sessionEpoch) return;
    const matched = [];
    for (const item of raw) {
      const ag = state.agents.find(
        (a) =>
          a.name.toLocaleLowerCase("id") ===
          item.agentName.toLocaleLowerCase("id"),
      );
      if (
        ag &&
        WORKDAYS.includes(item.day) &&
        ["Pagi", "Siang"].includes(item.session)
      ) {
        matched.push({
          agent: ag.id,
          agentName: ag.name,
          day: item.day,
          session: item.session,
          pj: item.pj,
        });
      }
    }
    legacySchedulePreview = matched;
    openDialog(
      "Impor Jadwal Master Lama",
      "PRATINJAU JADWAL MINGGUAN",
      `<p class="help">Ditemukan ${matched.length} jadwal mingguan dari tabel <code>jadwal_master</code> lama yang cocok dengan direktori agen saat ini.</p><div class="table-scroll"><table><thead><tr><th>HARI</th><th>SESI</th><th>AGEN</th><th>PERAN</th></tr></thead><tbody>${matched.map((m) => `<tr><td>${esc(m.day)}</td><td>${esc(m.session)}</td><td>${esc(m.agentName)}</td><td>${m.pj ? "PJ Sesi" : "Anggota"}</td></tr>`).join("")}</tbody></table></div><div class="dialog-footer"><button class="button" data-action="close">Batal</button><button class="button primary" data-action="confirm-import-schedule" ${matched.length ? "" : "disabled"}>Impor ${matched.length} jadwal</button></div>`,
    );
  } catch (error) {
    toast(readableError(error));
  } finally {
    operationPending = false;
    document.body.classList.remove("saving");
  }
}

async function confirmScheduleImport() {
  if (!legacySchedulePreview.length) return;
  const toInsert = legacySchedulePreview.filter(
    (m) =>
      !(state.weeklySchedule || []).some(
        (w) =>
          w.agent === m.agent && w.day === m.day && w.session === m.session,
      ),
  );
  legacySchedulePreview = [];
  closeDialog();
  if (!toInsert.length) {
    toast("Semua jadwal lama sudah ada di Jadwal Master.");
    return;
  }
  const mutators = toInsert.map((m) => (s) => {
    s.weeklySchedule.push({
      id: id(),
      agent: m.agent,
      day: m.day,
      session: m.session,
      pj: m.pj,
    });
  });
  if (
    await updateMany(
      mutators,
      `${toInsert.length} jadwal rutin berhasil diimpor.`,
    )
  ) {
    renderAttendance();
  }
}
