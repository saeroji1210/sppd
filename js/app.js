/* =========================================================
   app.js — kerangka aplikasi: shell (sidebar, topbar, bottom nav),
   router hash, delegasi event, boot instan dari snapshot.
   Perpindahan menu tidak memanggil server: semua data sudah di Store.
   ========================================================= */
(function () {
  'use strict';
  const { esc, icon } = UI;
  const { Store, Sesi, Jam } = API;

  const App = {
    hal: {}, _aksi: {}, _ubah: {}, bersih: [], rute: null, param: [], st: {}, hasil: null,

    /** Daftarkan halaman. o: {judul, sub, peran:'ADMIN'|'PEGAWAI'|'SEMUA', render(param,q), mount(param,q), segarkan:false} */
    halaman(nama, o) { App.hal[nama] = o; },
    aksi(nama, fn) { App._aksi[nama] = fn; },
    ubah(nama, fn) { App._ubah[nama] = fn; },
    go(hash) { if (location.hash === hash) App.render(); else location.hash = hash; },

    get d() { return Store.d; },
    get admin() { return Sesi.user && Sesi.user.role === 'ADMIN'; },
    s(k, def) { const v = Store.d && Store.d.settings ? Store.d.settings[k] : undefined; return v == null || v === '' ? def : v; },
    hariIni() { return Jam.wib().tgl; },

    /* ---------- helper domain ---------- */
    peg(id) { return Store.pegawai(id) || { Nama: id === (Sesi.user || {}).idPegawai ? Sesi.user.nama : 'Pegawai', NIP: '', Jabatan: '' }; },
    statusPng(p) {
      const t = App.hariIni();
      if (p.Status !== 'Aktif') return p.Status;
      if (t < p.Tgl_Mulai) return 'Terjadwal';
      if (t > p.Tgl_Selesai) return 'Selesai';
      return 'Berjalan';
    },
    presensiHari(idPng, tgl) {
      const o = { datang: null, pulang: null };
      Store.presensiPenugasan(idPng).forEach((r) => {
        if (r.Tanggal !== tgl || r.Verifikasi === 'Ditolak') return;
        if (r.Jenis === 'Datang' && !o.datang) o.datang = r;
        if (r.Jenis === 'Pulang' && !o.pulang) o.pulang = r;
      });
      return o;
    },
    hariDinas: (p) => UI.selisihHari(p.Tgl_Mulai, p.Tgl_Selesai) + 1,

    /* ---------- render ---------- */
    render() {
      const raw = (location.hash || '').replace(/^#\/?/, '');
      const [path, qs] = raw.split('?');
      const seg = path.split('/').filter(Boolean);
      const q = Object.fromEntries(new URLSearchParams(qs || ''));
      if (!Sesi.token) return Halaman.login();
      const awal = App.admin ? 'dashboard' : 'beranda';
      let nama = seg[0] || awal;
      if (seg[0] === 'penugasan' && seg[1]) nama = seg[2] === 'ubah' ? 'penugasan-form' : seg[1] === 'baru' ? 'penugasan-form' : 'penugasan-detail';
      let h = App.hal[nama];
      if (!h || (h.peran === 'ADMIN' && !App.admin) || (h.peran === 'PEGAWAI' && App.admin)) { nama = awal; h = App.hal[nama]; history.replaceState(null, '', '#/' + awal); }
      App.bersihkan();
      App.rute = nama; App.param = seg.slice(1); App.q = q;
      if (!document.querySelector('.shell')) App.shell();
      App.tandaiMenu(nama);
      const judul = typeof h.judul === 'function' ? h.judul(App.param, q) : h.judul, sub = typeof h.sub === 'function' ? h.sub(App.param, q) : h.sub;
      UI.$('#tbJudul').textContent = judul || '';
      UI.$('#tbSub').textContent = sub || '';
      document.title = (judul ? judul + ' · ' : '') + App.s('NAMA_APLIKASI', 'SIPERDIN');
      const k = UI.$('#konten');
      k.innerHTML = Store.d ? h.render(App.param, q) : App.kerangka();
      if (Store.d && h.mount) h.mount(App.param, q);
      window.scrollTo(0, 0);
      App.perbaruiLencana();
    },
    /** Muat ulang halaman aktif tanpa navigasi (setelah data baru tiba) bila pengguna tidak sedang mengetik/membuka dialog. */
    segarkan(paksa) {
      const h = App.hal[App.rute];
      if (!h || !Store.d) return;
      const a = document.activeElement;
      if (!paksa && (h.segarkan === false || UI.adaOverlay() || (a && a.closest && a.closest('#konten') && /INPUT|TEXTAREA|SELECT/.test(a.tagName)))) { App.perbaruiLencana(); return; }
      const y = window.scrollY;
      App.bersihkan();
      UI.$('#konten').innerHTML = h.render(App.param, App.q);
      if (h.mount) h.mount(App.param, App.q);
      window.scrollTo(0, y);
      App.perbaruiLencana();
    },
    bersihkan() { App.bersih.splice(0).forEach((f) => { try { f(); } catch (e) { /* abaikan */ } }); },
    kerangka() {
      return '<div class="stack">' + UI.skel(180) + '<div class="grid g4">' + [1, 2, 3, 4].map(() => UI.skel(130)).join('') + '</div><div class="chart-row">' + UI.skel(300) + UI.skel(300) + '</div></div>';
    },

    menu() {
      if (App.admin) {
        const tinjau = Store.d ? Store.d.presensi.filter((r) => r.Verifikasi === 'Perlu Tinjauan').length : 0;
        return [
          ['dashboard', 'grid', 'Dashboard'], ['pegawai', 'users', 'Kelola Pegawai'], ['penugasan', 'clipboard', 'Kelola Penugasan'],
          ['pemantauan', 'radar', 'Pemantauan Presensi', tinjau], ['rekap', 'money', 'Rekap SPPD'], ['notifikasi', 'wa', 'Notifikasi WA & Email'],
          ['sistem', 'info', 'Info Sistem'], ['pengaturan', 'sliders', 'Pengaturan']
        ];
      }
      return [['beranda', 'home', 'Beranda'], ['presensi', 'finger', 'Presensi'], ['penugasan-saya', 'briefcase', 'Penugasan Saya'],
        ['riwayat', 'history', 'Riwayat Presensi'], ['rekap-saya', 'money', 'Rekap SPPD'], ['profil', 'user', 'Profil']];
    },
    bawah() {
      if (App.admin) return [['dashboard', 'grid', 'Beranda'], ['pemantauan', 'radar', 'Pantau'], ['penugasan', 'clipboard', 'Penugasan'], ['rekap', 'money', 'Rekap']];
      return [['beranda', 'home', 'Beranda'], ['presensi', 'finger', 'Presensi'], ['penugasan-saya', 'briefcase', 'Penugasan'], ['riwayat', 'history', 'Riwayat'], ['profil', 'user', 'Profil']];
    },
    shell() {
      const u = Sesi.user;
      const app = App.s('NAMA_APLIKASI', 'SIPERDIN');
      document.getElementById('app').innerHTML =
        '<div class="shell"><aside class="sidebar" aria-label="Menu utama"><div class="brand"><div class="brand-logo">' + icon('shieldok', 'lg') + '</div><div><b>' + esc(app) + '</b><small>Sistem Perjalanan Dinas</small></div></div>' +
        '<nav class="nav" id="nav">' + App.menu().map((m) => '<a href="#/' + m[0] + '" data-menu="' + m[0] + '">' + icon(m[1]) + '<span>' + esc(m[2]) + '</span>' + (m[3] ? '<span class="cnt">' + m[3] + '</span>' : '') + '</a>').join('') + '</nav>' +
        '<div class="side-foot"><div class="motto"><b>' + icon('shieldok', 'sm') + 'Integritas Tugas</b><span>Hadir tepat waktu, bekerja tuntas</span></div>' +
        '<button class="nav-out" data-aksi="keluar">' + icon('logout') + 'Keluar Sistem</button></div></aside>' +
        '<div class="main"><header class="topbar"><div class="tb-title"><h1 id="tbJudul"></h1><p id="tbSub"></p></div>' +
        (u.role === 'ADMIN' ? '<div class="tb-search hide-m">' + icon('search') + '<input id="cariGlobal" placeholder="Cari pegawai, penugasan, nomor surat…" autocomplete="off" aria-label="Pencarian"><div id="hasilCari"></div></div>' : '') +
        '<div class="tb-actions"><button class="icon-btn" data-aksi="tema" aria-label="Ganti tema" title="Tema terang/gelap">' + icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon') + '</button>' +
        '<div style="position:relative"><button class="icon-btn" data-aksi="lonceng" aria-label="Notifikasi">' + icon('bell') + '<span class="dot hide" id="lonceng"></span></button></div>' +
        '<div style="position:relative"><button class="me" data-aksi="akun">' + UI.avatar(u.nama) + '<span class="me-text"><b>' + esc(u.nama) + '</b><small>' + esc(u.darurat ? 'Akses Darurat' : u.role === 'ADMIN' ? 'Admin · ' + (u.jabatan || 'Kepegawaian') : u.jabatan || 'Pegawai') + '</small></span>' + '<span class="hide-m">' + icon('chd', 'sm') + '</span></button></div></div></header>' +
        '<main class="content" id="konten" tabindex="-1"></main>' +
        '<footer class="footer"><span>' + esc(App.s('NAMA_INSTANSI', '')) + ' · Hubungi Helpdesk: ' + esc(App.s('KONTAK_HELPDESK', '')) + '</span><span>Hak Cipta ' + new Date().getFullYear() + ' ' + esc(app) + (API.DEMO ? ' · MODE DEMO' : '') + '</span></footer></div>' +
        '<nav class="bottomnav" aria-label="Navigasi bawah">' + App.bawah().map((m) => '<a href="#/' + m[0] + '" data-menu="' + m[0] + '">' + icon(m[1]) + '<span>' + esc(m[2]) + '</span></a>').join('') +
        (u.role === 'ADMIN' ? '<button data-aksi="menuLain">' + icon('menu') + '<span>Menu</span></button>' : '') + '</nav></div>';
      const cari = UI.$('#cariGlobal');
      if (cari) cari.addEventListener('input', UI.debounce(() => App.cariGlobal(cari.value), 120));
    },
    tandaiMenu(nama) {
      const alias = { 'penugasan-form': 'penugasan', 'penugasan-detail': App.admin ? 'penugasan' : 'penugasan-saya', hasil: 'presensi' };
      const n = alias[nama] || nama;
      UI.$$('[data-menu]').forEach((a) => a.classList.toggle('on', a.dataset.menu === n));
    },
    perbaruiLencana() {
      if (!Store.d) return;
      const el = UI.$('#lonceng');
      let n = 0;
      if (App.admin) n = Store.d.presensi.filter((r) => r.Verifikasi === 'Perlu Tinjauan').length;
      else n = App.pengingat().length;
      if (el) { el.textContent = n; el.classList.toggle('hide', !n); }
      const navCnt = UI.$('[data-menu="pemantauan"] .cnt');
      if (App.admin) {
        const a = UI.$('#nav [data-menu="pemantauan"]');
        if (a) { if (n && !navCnt) a.insertAdjacentHTML('beforeend', '<span class="cnt">' + n + '</span>'); else if (navCnt) { navCnt.textContent = n; if (!n) navCnt.remove(); } }
      }
    },
    /** Pengingat untuk pegawai: presensi hari ini yang belum dilakukan. */
    pengingat() {
      if (!Store.d || App.admin) return [];
      const t = App.hariIni(), m = UI.menit(Jam.wib().hm), out = [];
      Store.d.penugasan.filter((p) => p.Status === 'Aktif' && p.Tgl_Mulai <= t && p.Tgl_Selesai >= t).forEach((p) => {
        const h = App.presensiHari(p.ID_Penugasan, t);
        if (!h.datang) out.push({ p, jenis: 'Datang', teks: 'Presensi datang belum dilakukan · batas ' + UI.jamDariMenit(UI.menit(p.Jam_Masuk) + (+p.Toleransi_Menit || 0)) + ' WIB' });
        else if (!h.pulang && m >= UI.menit(p.Jam_Pulang) - 30) out.push({ p, jenis: 'Pulang', teks: 'Presensi pulang dibuka ' + p.Jam_Pulang + ' WIB' });
      });
      return out;
    },

    /* ---------- pencarian global (admin) ---------- */
    cariGlobal(qs) {
      const box = UI.$('#hasilCari');
      qs = qs.trim().toLowerCase();
      if (!qs || !Store.d) { box.innerHTML = ''; return; }
      const peg = Store.d.pegawai.filter((p) => (p.Nama + ' ' + p.NIP + ' ' + p.Email).toLowerCase().includes(qs)).slice(0, 5);
      const png = Store.d.penugasan.filter((p) => (p.No_Surat_Tugas + ' ' + p.Tujuan + ' ' + p.Nama_Lokasi + ' ' + App.peg(p.ID_Pegawai).Nama).toLowerCase().includes(qs)).slice(0, 6);
      if (!peg.length && !png.length) { box.innerHTML = '<div class="tb-results"><div class="muted" style="padding:10px">Tidak ditemukan.</div></div>'; return; }
      box.innerHTML = '<div class="tb-results">' + peg.map((p) => '<button data-nav="#/pegawai?q=' + encodeURIComponent(p.Email) + '">' + UI.avatar(p.Nama, 'sm') + '<span><b style="display:block;font-size:13px">' + esc(p.Nama) + '</b><small class="muted">' + esc(p.Jabatan || p.Email) + '</small></span></button>').join('') +
        png.map((p) => '<button data-nav="#/penugasan/' + p.ID_Penugasan + '"><span class="ic-tile" style="width:30px;height:30px;border-radius:9px">' + icon('file', 'sm') + '</span><span><b style="display:block;font-size:13px">' + esc(p.No_Surat_Tugas) + ' · ' + esc(App.peg(p.ID_Pegawai).Nama) + '</b><small class="muted">' + esc(p.Tujuan) + '</small></span></button>').join('') + '</div>';
    },

    /* ---------- boot ---------- */
    async masuk(hasil) {
      Sesi.simpan(hasil.token, hasil.user, hasil.exp);
      document.getElementById('app').innerHTML = '<div class="splash"><div><div class="brand-logo">' + icon('shieldok', 'xl') + '</div><b style="color:var(--ink);font:800 18px var(--font-head)">Menyiapkan data…</b><p>Memuat penugasan dan presensi Anda</p></div></div>';
      try {
        Store.muat(await API.api('boot'));
        if (!location.hash || location.hash === '#/' || location.hash === '#/login') history.replaceState(null, '', App.admin ? '#/dashboard' : '#/beranda');
        App.render();
        UI.toast('Selamat datang, ' + hasil.user.nama.split(',')[0] + '.', 'ok');
      } catch (e) { Sesi.hapus(); Halaman.login(e.message); }
    },
    async segarkanData(diam) {
      try {
        Store.muat(await API.api('boot'));
        App.segarkan();
        if (!diam) UI.toast('Data diperbarui.', 'ok');
      } catch (e) { if (!diam) UI.toast(e.message, 'bad'); }
    },
    async mulai() {
      const tema = API.ls.get('tema');
      if (tema) document.documentElement.dataset.theme = tema;
      API.onSesiHabis = (m) => {
        if (!Sesi.token) return;
        Sesi.hapus(); Store.d = null;
        document.getElementById('app').innerHTML = '';
        Halaman.login(m || 'Sesi berakhir. Silakan masuk kembali.');
      };
      window.addEventListener('hashchange', () => App.render());
      if (Sesi.muat()) {
        const umurSnap = Store.muatSnap(Sesi.user.email);
        if (umurSnap) {
          App.render(); // tampil instan dari snapshot
          App.segarkanData(true); // revalidasi di belakang layar
        } else {
          App.render();
          try { Store.muat(await API.api('boot')); App.render(); } catch (e) { if (Sesi.token) { UI.$('#konten').innerHTML = UI.empty('alert', 'Gagal memuat data', e.message, '<button class="btn btn-primary" data-aksi="muatUlang">' + icon('refresh') + 'Coba lagi</button>'); } }
        }
      } else {
        Halaman.login();
      }
      // jam global: semua [data-jam] mengikuti waktu server
      setInterval(() => {
        const w = Jam.wib();
        UI.$$('[data-jam]').forEach((el) => { el.textContent = el.dataset.jam === 'hm' ? w.hm : w.jam; });
      }, 1000);
      // revalidasi saat kembali ke tab setelah lama
      let terakhir = Date.now();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && Sesi.token && Store.d && Date.now() - terakhir > 120e3) App.segarkanData(true);
        if (document.visibilityState === 'hidden') terakhir = Date.now();
      });
      if ('serviceWorker' in navigator && /^https:|localhost|127\.0\.0\.1/.test(location.href)) {
        navigator.serviceWorker.register('sw.js').catch(() => { /* opsional */ });
      }
      window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); App.pasang = e; });
    }
  };

  /* ---------- Delegasi event global ---------- */
  document.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]');
    if (nav) { e.preventDefault(); UI.$$('.dropdown').forEach((d) => d.remove()); const b = UI.$('#hasilCari'); if (b) b.innerHTML = ''; UI.tutupSemua(); App.go(nav.dataset.nav); return; }
    const a = e.target.closest('[data-aksi]');
    if (a && App._aksi[a.dataset.aksi]) { App._aksi[a.dataset.aksi](a, e); return; }
    if (!e.target.closest('.dropdown')) UI.$$('.dropdown').forEach((d) => d.remove());
    if (!e.target.closest('.tb-search')) { const b = UI.$('#hasilCari'); if (b) b.innerHTML = ''; }
  });
  document.addEventListener('input', (e) => { const el = e.target.closest('[data-ubah]'); if (el && App._ubah[el.dataset.ubah]) App._ubah[el.dataset.ubah](el, e); });
  document.addEventListener('change', (e) => { const el = e.target.closest('[data-ganti]'); if (el && App._ubah[el.dataset.ganti]) App._ubah[el.dataset.ganti](el, e); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.id === 'cariGlobal') { const f = UI.$('#hasilCari [data-nav]'); if (f) f.click(); }
    if (e.key === '/' && document.activeElement === document.body && UI.$('#cariGlobal')) { e.preventDefault(); UI.$('#cariGlobal').focus(); }
  });

  function dropdown(btn, html) {
    const ada = btn.parentElement.querySelector('.dropdown');
    UI.$$('.dropdown').forEach((d) => d.remove());
    if (ada) return;
    btn.parentElement.insertAdjacentHTML('beforeend', '<div class="dropdown">' + html + '</div>');
  }
  App.aksi('keluar', async () => {
    if (!(await UI.konfirmasi('Keluar dari aplikasi?', 'Sesi di perangkat ini akan diakhiri dan data tersimpan sementara dihapus.', { ya: 'Keluar', ikon: 'logout' }))) return;
    API.api('auth.logout').catch(() => { });
    Sesi.hapus(); Store.d = null; App.bersihkan();
    document.getElementById('app').innerHTML = '';
    history.replaceState(null, '', '#/login');
    Halaman.login();
  });
  App.aksi('tema', (b) => {
    const gelap = document.documentElement.dataset.theme !== 'dark';
    document.documentElement.dataset.theme = gelap ? 'dark' : 'light';
    API.ls.set('tema', gelap ? 'dark' : 'light');
    b.innerHTML = icon(gelap ? 'sun' : 'moon');
    App.segarkan(true);
  });
  App.aksi('muatUlang', () => App.segarkanData());
  App.aksi('akun', (b) => {
    const u = Sesi.user;
    dropdown(b, '<div class="dd-head"><b>' + esc(u.nama) + '</b><div class="muted" style="font-size:12px">' + esc(u.email) + '</div><div style="margin-top:6px">' + UI.badge(u.role === 'ADMIN' ? 'Admin' : 'Pegawai') + (API.DEMO ? ' ' + UI.badge('Mode Demo', 'violet', false) : '') + '</div></div>' +
      (u.role === 'ADMIN' ? '<button class="dd-item" data-nav="#/pengaturan">' + icon('sliders') + 'Pengaturan</button><button class="dd-item" data-nav="#/sistem">' + icon('info') + 'Info Sistem</button>' : '<button class="dd-item" data-nav="#/profil">' + icon('user') + 'Profil Saya</button>') +
      '<button class="dd-item" data-aksi="muatUlang">' + icon('refresh') + 'Muat ulang data</button>' +
      '<button class="dd-item" data-aksi="keluar" style="color:var(--danger)">' + icon('logout') + 'Keluar</button>');
  });
  App.aksi('lonceng', (b) => {
    let isi;
    if (App.admin) {
      const t = Store.d.presensi.filter((r) => r.Verifikasi === 'Perlu Tinjauan').slice(0, 6);
      isi = '<div class="dd-head"><b>Perlu tinjauan</b><div class="muted" style="font-size:12px">' + t.length + ' presensi menunggu verifikasi manual</div></div>' +
        (t.length ? t.map((r) => '<button class="dd-item" data-nav="#/pemantauan?tinjau=' + r.ID_Presensi + '">' + UI.avatar(App.peg(r.ID_Pegawai).Nama, 'sm') + '<span><b style="display:block;font-size:13px">' + esc(App.peg(r.ID_Pegawai).Nama) + '</b><small class="muted">' + esc(r.Jenis) + ' · ' + esc(r.Waktu_Server.slice(11, 16)) + ' · skor ' + r.Skor_Wajah + '%</small></span></button>').join('') : '<div class="muted" style="padding:10px">Tidak ada antrean verifikasi.</div>');
    } else {
      const p = App.pengingat();
      isi = '<div class="dd-head"><b>Pengingat hari ini</b></div>' + (p.length ? p.map((x) => '<button class="dd-item" data-nav="#/presensi/' + x.p.ID_Penugasan + '?jenis=' + x.jenis + '"><span class="ic-tile yellow" style="width:32px;height:32px">' + icon('clock', 'sm') + '</span><span><b style="display:block;font-size:13px">' + esc(x.p.Nama_Lokasi) + '</b><small class="muted">' + esc(x.teks) + '</small></span></button>').join('') : '<div class="muted" style="padding:10px">Tidak ada pengingat. Semua presensi hari ini lengkap.</div>');
    }
    dropdown(b, isi);
  });
  App.aksi('menuLain', () => {
    const m = UI.sheet('<nav class="nav">' + App.menu().map((x) => '<a href="#/' + x[0] + '" data-nav="#/' + x[0] + '">' + icon(x[1]) + '<span>' + esc(x[2]) + '</span>' + (x[3] ? '<span class="cnt">' + x[3] + '</span>' : '') + '</a>').join('') +
      '<button class="nav-out" data-aksi="keluar">' + icon('logout') + 'Keluar Sistem</button></nav>');
    m.el.addEventListener('click', (e) => { if (e.target.closest('[data-aksi="keluar"]')) m.tutup(); });
  });

  window.App = App;
  window.Halaman = window.Halaman || {};
  document.addEventListener('DOMContentLoaded', () => App.mulai());
})();
