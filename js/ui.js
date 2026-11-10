/* =========================================================
   ui.js — utilitas antarmuka: ikon, format WIB, toast, modal,
   drawer, tabel (sort + paginasi + kartu di ponsel), ekspor.
   ========================================================= */
(function () {
  'use strict';
  const TZ = 'Asia/Jakarta';

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));

  /* ---------- Ikon garis (gaya Lucide) ---------- */
  const P = {
    grid: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    users: '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-3.9 3.1-7 7-7s7 3.1 7 7"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/><path d="M22 21c0-3.2-2-5.9-5-6.7"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M2 13h20"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/>',
    clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/><path d="M12 12 18 6"/>',
    scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>',
    finger: '<path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .13-5.35 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    money: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    wa: '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.6-5.4A8.4 8.4 0 1 1 21 11.5z"/><path d="M9 9.5c.3 1.8 1.7 3.3 3.5 3.8"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    db: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    okc: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    xc: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>',
    alert: '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3z"/><path d="M12 9v4M12 17h.01"/>',
    right: '<path d="M5 12h14M12 5l7 7-7 7"/>', left: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    chr: '<path d="m9 18 6-6-6-6"/>', chl: '<path d="m15 18-6-6 6-6"/>', chd: '<path d="m6 9 6 6 6-6"/>', chu: '<path d="m18 15-6-6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    dl: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
    ul: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
    refresh: '<path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
    cam: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    shieldok: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    nav: '<path d="m3 11 19-9-9 19-2-8z"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    cross: '<circle cx="12" cy="12" r="10"/><path d="M22 12h-4M6 12H2M12 6V2M12 22v-4"/>',
    filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
    sheet: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8M12 11v8"/>',
    printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    up: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>', down: '<path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>',
    send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    mega: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
    plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9z"/>',
    sync: '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9z"/><path d="m9 13 2 2 4-4"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
    face: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    flip: '<path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/><path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5"/><circle cx="12" cy="12" r="3"/><path d="m18 22-3-3 3-3M6 2l3 3-3 3"/>',
    gauge: '<path d="m12 14 4-4"/><path d="M3.3 19a10 10 0 1 1 17.4 0"/>'
  };
  const icon = (n, cls) => '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (P[n] || P.info) + '</svg>';

  /* ---------- Format tanggal & angka (WIB) ---------- */
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const fmtParts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  function wib(ms) {
    const p = {};
    fmtParts.formatToParts(new Date(ms)).forEach((x) => { p[x.type] = x.value; });
    return { tgl: p.year + '-' + p.month + '-' + p.day, jam: p.hour + ':' + p.minute + ':' + p.second, hm: p.hour + ':' + p.minute, y: +p.year, m: +p.month, d: +p.day };
  }
  const tglParse = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null; };
  const hariKe = (s) => { const t = tglParse(s); return t ? new Date(Date.UTC(t.y, t.m - 1, t.d)).getUTCDay() : 0; };
  function tgl(s, mode) {
    const t = tglParse(s);
    if (!t) return s ? esc(s) : '—';
    if (mode === 'pendek') return t.d + ' ' + BLN[t.m - 1];
    if (mode === 'panjang') return HARI[hariKe(s)] + ', ' + t.d + ' ' + BULAN[t.m - 1] + ' ' + t.y;
    if (mode === 'hari') return HARI[hariKe(s)] + ', ' + t.d + ' ' + BLN[t.m - 1] + ' ' + t.y;
    if (mode === 'bulan') return BULAN[t.m - 1] + ' ' + t.y;
    return t.d + ' ' + BLN[t.m - 1] + ' ' + t.y;
  }
  function periode(a, b) {
    const x = tglParse(a), y = tglParse(b);
    if (!x || !y) return '—';
    if (a === b) return tgl(a);
    if (x.y === y.y && x.m === y.m) return x.d + '–' + y.d + ' ' + BLN[y.m - 1] + ' ' + y.y;
    if (x.y === y.y) return x.d + ' ' + BLN[x.m - 1] + ' – ' + y.d + ' ' + BLN[y.m - 1] + ' ' + y.y;
    return tgl(a) + ' – ' + tgl(b);
  }
  const selisihHari = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);
  const tambahHari = (t, n) => new Date(Date.parse(t + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
  const menit = (s) => { const m = String(s || '').match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/); return m ? +m[1] * 60 + +m[2] + (m[3] ? +m[3] / 60 : 0) : NaN; };
  const jamDariMenit = (x) => { x = Math.max(0, Math.round(x)); return String(Math.floor(x / 60) % 24).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0'); };
  const nf = new Intl.NumberFormat('id-ID');
  const angka = (n, d) => (n == null || n === '' || isNaN(n) ? '—' : new Intl.NumberFormat('id-ID', { maximumFractionDigits: d == null ? 0 : d, minimumFractionDigits: d || 0 }).format(n));
  const rupiah = (n) => 'Rp ' + nf.format(Math.round(Number(n) || 0));
  const rupiahPendek = (n) => {
    n = Number(n) || 0;
    if (n >= 1e9) return 'Rp' + angka(n / 1e9, 2) + ' M';
    if (n >= 1e6) return 'Rp' + angka(n / 1e6, 2) + ' jt';
    if (n >= 1e3) return 'Rp' + angka(n / 1e3, 0) + ' rb';
    return 'Rp' + nf.format(n);
  };
  const pct = (a, b, d) => (b ? Math.round((a / b) * 100 * Math.pow(10, d || 0)) / Math.pow(10, d || 0) : 0);

  /* ---------- Komponen kecil ---------- */
  const WARNA_AV = ['#1F4FD8', '#7C3AED', '#0E9F6E', '#D9480F', '#0891B2', '#C026D3', '#B45309', '#2563EB'];
  function avatar(nama, cls, online) {
    // gelar belakang dipisah koma ("Siti Rahmawati, S.Kom."), gelar depan diawali titik ("Dr. ", "Ir. ")
    const n = String(nama || '?').split(',')[0].replace(/^((dr|drs|dra|ir|prof|h|hj)\.\s*)+/i, '');
    const ini = n.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
    let h = 0;
    for (const c of String(nama)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return '<span class="av ' + (cls || '') + '" style="background:' + WARNA_AV[h % WARNA_AV.length] + '">' + esc(ini) + (online ? '<i class="on-dot"></i>' : '') + '</span>';
  }
  const STATUS_KELAS = {
    'Tepat Waktu': 'ok', 'Terlambat': 'warn', 'Pulang Cepat': 'bad', 'Aktif': 'ok', 'Nonaktif': 'gray', 'Draft': 'gray', 'Selesai': 'info', 'Batal': 'bad',
    'Otomatis': 'ok', 'Disetujui': 'ok', 'Perlu Tinjauan': 'warn', 'Ditolak': 'bad', 'Terkirim': 'ok', 'Antri': 'info', 'Gagal': 'bad',
    'Berjalan': 'info', 'Terjadwal': 'violet', 'Siap Dibayar': 'ok', 'Perlu Verifikasi': 'warn', 'Terdaftar': 'ok', 'Tidak Terdaftar': 'bad',
    'Hari Ini': 'info', 'Admin': 'violet', 'Pegawai': 'gray', 'Lolos': 'ok', 'Datang': 'info', 'Pulang': 'violet'
  };
  const badge = (s, kelas, dot) => '<span class="badge ' + (kelas || STATUS_KELAS[s] || 'gray') + '">' + (dot !== false ? '<i class="bd"></i>' : '') + esc(s) + '</span>';
  const empty = (ic, judul, teks, tombol) => '<div class="empty"><div class="ic-tile">' + icon(ic, 'lg') + '</div><b>' + esc(judul) + '</b><p>' + esc(teks || '') + '</p>' + (tombol || '') + '</div>';
  const skel = (h, w) => '<div class="sk" style="height:' + (h || 16) + 'px;width:' + (w || '100%') + '"></div>';
  const progress = (p, kls) => '<div class="progress ' + (kls || '') + '"><i style="width:' + Math.max(0, Math.min(100, p)) + '%"></i></div>';

  /* ---------- Toast ---------- */
  function toast(pesan, jenis, judul) {
    let box = $('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
    const el = document.createElement('div');
    const ic = { ok: 'okc', bad: 'xc', warn: 'alert', info: 'info' }[jenis || 'info'];
    el.className = 'toast ' + (jenis || 'info');
    el.innerHTML = icon(ic) + '<div>' + (judul ? '<b>' + esc(judul) + '</b>' : '') + esc(pesan) + '</div>';
    box.appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 320); }, jenis === 'bad' ? 6000 : 3500);
  }

  /* ---------- Overlay: modal, confirm, drawer, sheet ---------- */
  const tumpukan = [];
  function bukaOverlay(cls, html, opt) {
    const ov = document.createElement('div');
    ov.className = 'overlay';
    const el = document.createElement('div');
    el.className = cls;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML = html;
    document.body.appendChild(ov);
    document.body.appendChild(el);
    const obj = {
      el, tutup() {
        if (obj.tertutup) return;
        obj.tertutup = true;
        ov.remove(); el.remove();
        const i = tumpukan.indexOf(obj); if (i > -1) tumpukan.splice(i, 1);
        if (opt && opt.onClose) opt.onClose();
      }
    };
    ov.addEventListener('click', () => { if (!opt || opt.tutupLuar !== false) obj.tutup(); });
    el.addEventListener('click', (e) => { if (e.target.closest('[data-tutup]')) obj.tutup(); });
    tumpukan.push(obj);
    setTimeout(() => { const f = el.querySelector('[autofocus], input:not([type=hidden]), select, textarea'); if (f && window.innerWidth > 767) f.focus(); }, 30);
    return obj;
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && tumpukan.length) tumpukan[tumpukan.length - 1].tutup(); });
  const adaOverlay = () => tumpukan.length > 0;
  const tutupSemua = () => tumpukan.slice().forEach((o) => o.tutup());

  function drawer(o) {
    return bukaOverlay('drawer' + (o.wide ? ' wide' : ''),
      '<div class="drawer-h"><div class="grow"><h2>' + esc(o.judul) + '</h2>' + (o.sub ? '<p class="muted" style="font-size:12.5px">' + esc(o.sub) + '</p>' : '') + '</div>' +
      '<button class="icon-btn" data-tutup aria-label="Tutup">' + icon('x') + '</button></div>' +
      '<div class="drawer-b">' + o.isi + '</div>' + (o.kaki ? '<div class="drawer-f">' + o.kaki + '</div>' : ''), o);
  }
  function modal(o) {
    return bukaOverlay('modal', (o.ikon ? '<div class="ic-tile ' + (o.warna || '') + '" style="margin-bottom:14px">' + icon(o.ikon) + '</div>' : '') +
      '<h2>' + esc(o.judul) + '</h2><div style="margin-top:8px;color:var(--muted)">' + (o.isi || '') + '</div>' +
      (o.aksi ? '<div class="actions">' + o.aksi + '</div>' : ''), o);
  }
  function konfirmasi(judul, isi, opsi) {
    opsi = opsi || {};
    return new Promise((res) => {
      let jawab = false;
      const m = modal({
        judul, isi: esc(isi), ikon: opsi.ikon || 'alert', warna: opsi.bahaya ? 'red' : 'yellow',
        aksi: '<button class="btn btn-ghost" data-tutup>Batal</button><button class="btn ' + (opsi.bahaya ? 'btn-danger' : 'btn-primary') + '" data-ya>' + esc(opsi.ya || 'Ya, lanjutkan') + '</button>',
        onClose: () => res(jawab)
      });
      m.el.querySelector('[data-ya]').addEventListener('click', () => { jawab = true; m.tutup(); });
    });
  }
  const sheet = (html) => bukaOverlay('sheet', '<div class="grab"></div>' + html);

  /* ---------- Tombol loading ---------- */
  async function sibuk(btn, fn) {
    if (!btn || btn.classList.contains('is-loading')) return;
    btn.classList.add('is-loading');
    btn.disabled = true;
    try { return await fn(); } finally { btn.classList.remove('is-loading'); btn.disabled = false; }
  }

  /* ---------- Tabel (sort + paginasi + kartu di ponsel) ---------- */
  const _tbl = {}, _st = {};
  function tabel(id, opt) {
    _tbl[id] = opt;
    _st[id] = _st[id] || { hal: 1, sort: opt.sortAwal || null, dir: opt.dirAwal || -1, pp: opt.perHalaman || 10 };
    return '<div data-tbl="' + id + '" class="' + (opt.kartuPonsel !== false ? 'm-cards' : '') + '">' + tabelIsi(id) + '</div>';
  }
  function tabelIsi(id) {
    const o = _tbl[id], st = _st[id];
    let data = (o.data || []).slice();
    if (st.sort) {
      const k = o.kolom.find((c) => c.k === st.sort);
      const val = k && k.nilai ? k.nilai : (r) => r[st.sort];
      data.sort((a, b) => {
        const x = val(a), y = val(b);
        const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x == null ? '' : x).localeCompare(String(y == null ? '' : y), 'id', { numeric: true });
        return c * st.dir;
      });
    }
    const total = data.length, pp = st.pp, hal = Math.min(st.hal, Math.max(1, Math.ceil(total / pp)));
    st.hal = hal;
    const potong = data.slice((hal - 1) * pp, hal * pp);
    if (!total) return o.kosong || empty('search', 'Tidak ada data', 'Ubah filter atau kata kunci pencarian.');
    const th = o.kolom.map((c) => '<th' + (c.sort !== false && c.k ? ' class="sortable" data-tbl-sort="' + id + '|' + c.k + '"' : '') + (c.w ? ' style="width:' + c.w + '"' : '') + (c.kanan ? ' class="right"' : '') + '>' +
      esc(c.l) + (st.sort === c.k ? '<span class="srt">' + (st.dir > 0 ? '▲' : '▼') + '</span>' : '') + '</th>').join('');
    const rows = potong.map((r) => {
      const ex = o.ekspansi && o.ekspansi.terbuka === (o.kunci ? r[o.kunci] : null);
      return '<tr class="' + (o.kelasBaris ? o.kelasBaris(r) : '') + (o.klik ? ' click' : '') + '"' + (o.klik ? ' data-tbl-row="' + id + '|' + esc(r[o.kunci]) + '"' : '') + '>' +
        o.kolom.map((c, i) => '<td data-l="' + esc(c.l) + '" class="' + (i === 0 ? 'td-main ' : '') + (c.kanan ? 'right ' : '') + (c.cls || '') + (c.l ? '' : ' td-kosong') + '"><div class="tdv">' + (c.r ? c.r(r) : esc(r[c.k])) + '</div></td>').join('') +
        '</tr>' + (ex ? '<tr class="expand-row"><td colspan="' + o.kolom.length + '">' + o.ekspansi.isi(r) + '</td></tr>' : '');
    }).join('');
    const halMax = Math.ceil(total / pp);
    let pg = '';
    const tombol = (n) => '<button data-tbl-pg="' + id + '|' + n + '"' + (n === hal ? ' class="on"' : '') + '>' + n + '</button>';
    if (halMax > 1) {
      pg += '<button data-tbl-pg="' + id + '|' + (hal - 1) + '"' + (hal === 1 ? ' disabled' : '') + ' aria-label="Sebelumnya">' + icon('chl', 'sm') + '</button>';
      const set = new Set([1, halMax, hal - 1, hal, hal + 1].filter((n) => n >= 1 && n <= halMax));
      let prev = 0;
      [...set].sort((a, b) => a - b).forEach((n) => { if (n - prev > 1) pg += '<span>…</span>'; pg += tombol(n); prev = n; });
      pg += '<button data-tbl-pg="' + id + '|' + (hal + 1) + '"' + (hal === halMax ? ' disabled' : '') + ' aria-label="Berikutnya">' + icon('chr', 'sm') + '</button>';
    }
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="pager"><span>Menampilkan <b>' + ((hal - 1) * pp + 1) + '–' + Math.min(total, hal * pp) + '</b> dari <b>' + angka(total) + '</b> ' + esc(o.satuan || 'data') +
      '</span><div class="row" style="gap:12px"><label class="row" style="gap:6px">Baris <select class="select" style="height:32px;width:72px" data-tbl-pp="' + id + '">' +
      [10, 25, 50, 100].map((n) => '<option' + (n === pp ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></label><div class="pg">' + pg + '</div></div></div>';
  }
  function tabelSegarkan(id) { const el = document.querySelector('[data-tbl="' + id + '"]'); if (el && _tbl[id]) el.innerHTML = tabelIsi(id); }
  function tabelData(id, data) { if (_tbl[id]) { _tbl[id].data = data; tabelSegarkan(id); } }
  function tabelReset(id) { if (_st[id]) _st[id].hal = 1; }
  document.addEventListener('click', (e) => {
    const pg = e.target.closest('[data-tbl-pg]');
    if (pg && !pg.disabled) { const [id, n] = pg.dataset.tblPg.split('|'); _st[id].hal = +n; tabelSegarkan(id); return; }
    const so = e.target.closest('[data-tbl-sort]');
    if (so) { const [id, k] = so.dataset.tblSort.split('|'); const st = _st[id]; st.dir = st.sort === k ? -st.dir : 1; st.sort = k; tabelSegarkan(id); return; }
    const row = e.target.closest('[data-tbl-row]');
    if (row && !e.target.closest('button, a, input, select, label')) {
      const i = row.dataset.tblRow.indexOf('|'); const id = row.dataset.tblRow.slice(0, i);
      if (_tbl[id] && _tbl[id].klik) _tbl[id].klik(row.dataset.tblRow.slice(i + 1));
    }
  });
  document.addEventListener('change', (e) => {
    const s = e.target.closest('[data-tbl-pp]');
    if (s) { const id = s.dataset.tblPp; _st[id].pp = +s.value; _st[id].hal = 1; tabelSegarkan(id); }
  });

  /* ---------- Pemuatan pustaka malas (lazy) ---------- */
  const _scripts = {};
  function muatScript(src, cekGlobal) {
    if (cekGlobal && window[cekGlobal]) return Promise.resolve();
    if (_scripts[src]) return _scripts[src];
    _scripts[src] = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      if (!/^https:\/\/accounts\.google\.com\//.test(src)) s.crossOrigin = 'anonymous'; // skrip Google Sign-In dimuat tanpa mode CORS
      const t = setTimeout(() => { rej(new Error('Waktu memuat pustaka habis')); }, 20000);
      s.onload = () => { clearTimeout(t); res(); };
      s.onerror = () => { clearTimeout(t); delete _scripts[src]; rej(new Error('Gagal memuat ' + src.split('/').pop())); };
      document.head.appendChild(s);
    });
    return _scripts[src];
  }
  function muatCss(href) {
    if (document.querySelector('link[href="' + href + '"]')) return;
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l);
  }
  const debounce = (fn, ms) => { let t; return function () { clearTimeout(t); const a = arguments; t = setTimeout(() => fn.apply(this, a), ms); }; };
  const idle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 300));

  /* ---------- Ekspor Excel & PDF (dengan cadangan CSV / cetak) ---------- */
  const LIB = {
    xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    autotable: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
  };
  function unduhBlob(blob, nama) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nama;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  async function eksporExcel(nama, kolom, rows, judulSheet) {
    const data = rows.map((r) => { const o = {}; kolom.forEach((c) => { o[c.l] = c.v ? c.v(r) : r[c.k]; }); return o; });
    try {
      await muatScript(LIB.xlsx, 'XLSX');
      const ws = window.XLSX.utils.json_to_sheet(data);
      ws['!cols'] = kolom.map((c) => ({ wch: Math.max(10, Math.min(48, c.l.length + 6)) }));
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, (judulSheet || 'Data').slice(0, 30));
      window.XLSX.writeFile(wb, nama + '.xlsx');
      toast('File ' + nama + '.xlsx diunduh (' + rows.length + ' baris).', 'ok');
    } catch (e) {
      const csv = [kolom.map((c) => '"' + c.l + '"').join(';')].concat(data.map((o) => kolom.map((c) => '"' + String(o[c.l] == null ? '' : o[c.l]).replace(/"/g, '""') + '"').join(';'))).join('\r\n');
      unduhBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), nama + '.csv');
      toast('Pustaka Excel tidak termuat, data diunduh sebagai CSV (bisa dibuka di Excel).', 'warn');
    }
  }
  async function eksporPdf(nama, judul, sub, kolom, rows) {
    const body = rows.map((r) => kolom.map((c) => String(c.v ? c.v(r) : (r[c.k] == null ? '' : r[c.k]))));
    try {
      await muatScript(LIB.jspdf, 'jspdf');
      await muatScript(LIB.autotable);
      const doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text(judul, 40, 44);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(100); doc.text(sub, 40, 62);
      doc.autoTable({ head: [kolom.map((c) => c.l)], body, startY: 76, styles: { fontSize: 8.5, cellPadding: 5 },
        headStyles: { fillColor: [31, 79, 216], textColor: 255 }, alternateRowStyles: { fillColor: [244, 247, 252] }, margin: { left: 40, right: 40 } });
      doc.save(nama + '.pdf');
      toast('File ' + nama + '.pdf diunduh.', 'ok');
    } catch (e) {
      const w = window.open('', '_blank');
      if (!w) { toast('Izinkan pop-up untuk mencetak PDF.', 'warn'); return; }
      w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>' + esc(judul) + '</title><style>body{font:12px Arial,sans-serif;color:#0F1B3D;margin:24px}h1{font-size:18px;margin:0}p{color:#64748B;margin:4px 0 14px}table{width:100%;border-collapse:collapse}th{background:#1F4FD8;color:#fff;text-align:left}th,td{padding:6px 8px;border:1px solid #E2E8F0;font-size:11px}tr:nth-child(even) td{background:#F4F7FC}@page{size:A4 landscape;margin:14mm}</style></head><body><h1>' + esc(judul) + '</h1><p>' + esc(sub) + '</p><table><thead><tr>' +
        kolom.map((c) => '<th>' + esc(c.l) + '</th>').join('') + '</tr></thead><tbody>' + body.map((r) => '<tr>' + r.map((x) => '<td>' + esc(x) + '</td>').join('') + '</tr>').join('') + '</tbody></table></body></html>');
      w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
      toast('Gunakan "Simpan sebagai PDF" pada dialog cetak.', 'info');
    }
  }

  /* ---------- Kompres gambar → JPEG dataURL ---------- */
  function kompres(sumber, lebarMaks, kualitas) {
    const w0 = sumber.videoWidth || sumber.naturalWidth || sumber.width, h0 = sumber.videoHeight || sumber.naturalHeight || sumber.height;
    const s = Math.min(1, (lebarMaks || 640) / w0);
    const c = document.createElement('canvas');
    c.width = Math.round(w0 * s); c.height = Math.round(h0 * s);
    c.getContext('2d').drawImage(sumber, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', kualitas || 0.8);
  }
  function bacaFileGambar(file) {
    return new Promise((res, rej) => {
      if (!file || !/^image\//.test(file.type)) return rej(new Error('Pilih file gambar (JPG/PNG).'));
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('Gambar tidak dapat dibaca.'));
      img.src = URL.createObjectURL(file);
    });
  }

  window.UI = {
    TZ, esc, $, $$, icon, P, wib, tgl, periode, tglParse, hariKe, selisihHari, tambahHari, menit, jamDariMenit, angka, rupiah, rupiahPendek, pct,
    BULAN, BLN, HARI, avatar, badge, STATUS_KELAS, empty, skel, progress, toast, drawer, modal, konfirmasi, sheet, adaOverlay, tutupSemua, sibuk,
    tabel, tabelSegarkan, tabelData, tabelReset, _tbl, muatScript, muatCss, debounce, idle, eksporExcel, eksporPdf, unduhBlob, kompres, bacaFileGambar
  };
})();
