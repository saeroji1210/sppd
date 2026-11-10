/* =========================================================
   halaman-auth.js — halaman masuk: Login dengan Google (GIS),
   kode email 6 digit, dan akses darurat admin.
   ========================================================= */
(function () {
  'use strict';
  const { esc, icon } = UI;
  let cfg = null;
  try { cfg = JSON.parse(API.ls.get('cfg') || 'null'); } catch (e) { cfg = null; }

  function gambar(pesanError) {
    const c = cfg || {};
    const app = c.namaAplikasi || 'SIPERDIN';
    document.title = 'Masuk · ' + app;
    document.getElementById('app').innerHTML =
      '<div class="login"><div class="login-top"><div class="row"><span class="ic-tile" style="background:var(--surface);box-shadow:var(--shadow-1)">' + icon('building') + '</span><div><div class="muted" style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase">' +
      esc(c.namaInstansi || 'Kementerian / Lembaga') + '</div><b style="font-family:var(--font-head);font-size:15px">Portal Perjalanan Dinas Aparatur</b></div></div>' +
      '<div class="row hide-m">' + UI.badge('Sistem Online & Aman', 'ok') + '<span class="muted" style="font-size:12.5px">Waktu server <b class="tnum" data-jam>--:--:--</b> WIB</span></div></div>' +
      '<div class="login-card"><section class="login-l"><div class="lg"><div class="brand-logo">' + icon('nav', 'lg') + '</div><div><b>' + esc(app) + '</b><small>Smart Duty & Attendance</small></div></div>' +
      '<p class="tagline">Sistem informasi perjalanan dinas & presensi akurat berbasis verifikasi lokasi, wajah, dan waktu server.</p>' +
      '<div class="feat-list" style="display:flex;flex-direction:column;gap:12px;margin-top:8px">' +
      fitur('target', 'Geofence GPS Real-Time', 'Radius ≤ 100 m', 'Presensi hanya diterima di dalam radius lokasi penugasan.') +
      fitur('face', 'Biometrik Wajah', 'Verifikasi', 'Wajah dicocokkan dengan foto referensi pegawai yang ditugaskan.') +
      fitur('money', 'E-SPPD & Hari Dinas', 'Otomatis', 'Jumlah hari dinas dihitung otomatis sebagai dasar pembayaran SPPD.') + '</div>' +
      '<div class="quote">“Hadir Tepat Waktu, Bekerja Tuntas.”</div></section>' +
      '<section class="login-r"><div><div class="eyebrow">Selamat datang</div><h1 style="margin-top:6px">Masuk ke Akun Anda</h1><p class="muted" style="margin-top:6px">Gunakan akun yang terdaftar di ' + esc(app) + '.</p></div>' +
      (pesanError ? '<div class="alert bad" role="alert">' + icon('alert') + '<div><b>Tidak dapat masuk</b><div style="font-size:13px">' + esc(pesanError) + '</div></div></div>' : '') +
      '<div id="jalurUtama"></div>' +
      '<div class="sep">atau masuk dengan kode email</div>' +
      '<form id="fKode" class="stack" style="gap:12px" novalidate><div class="field"><label for="emailKode">Email terdaftar</label><div class="input-ic">' + icon('mail') +
      '<input class="input" id="emailKode" type="email" inputmode="email" autocomplete="email" placeholder="nama@instansi.go.id" required></div></div>' +
      '<div id="kotakKode" class="hide"><div class="field"><label>Kode 6 digit dari email</label><div class="otp">' + [0, 1, 2, 3, 4, 5].map((i) => '<input inputmode="numeric" maxlength="1" aria-label="Digit ' + (i + 1) + '" data-otp="' + i + '">').join('') + '</div>' +
      '<span class="hint" id="infoKode"></span></div></div>' +
      '<button class="btn btn-primary btn-lg btn-block" id="btnKode" type="submit">Kirim Kode Masuk ' + icon('send') + '</button></form>' +
      '<div class="secure-note">' + icon('shield') + '<span><b>Keamanan terjamin:</b> identitas diverifikasi di server, sesi berakhir otomatis dalam 12 jam, dan setiap presensi tercatat beserta lokasi dan waktunya.</span></div>' +
      '<div class="row between wrap" style="font-size:13px"><span class="muted">Kendala akun? Hubungi <b style="color:var(--ink)">Admin Kepegawaian</b> ' + esc(c.kontak || '') + '</span>' +
      (c.waHelpdesk ? '<a href="https://wa.me/62' + esc(String(c.waHelpdesk).replace(/^0/, '')) + '" target="_blank" rel="noopener" class="link">' + icon('wa', 'sm') + 'WhatsApp Helpdesk</a>' : '') + '</div>' +
      '<details style="font-size:13px"><summary class="muted" style="cursor:pointer">Akses darurat admin</summary><form id="fDarurat" class="stack" style="gap:10px;margin-top:10px" novalidate>' +
      '<div class="form-grid"><div class="field"><label for="dUser">Username</label><input class="input" id="dUser" autocomplete="username" value="darurat"></div>' +
      '<div class="field"><label for="dPass">Sandi darurat</label><input class="input" id="dPass" type="password" autocomplete="current-password"></div></div>' +
      '<button class="btn btn-dark" type="submit">' + icon('key') + 'Masuk akses darurat</button>' + (API.DEMO ? '<span class="hint">Mode demo: sandi <b>demo12345</b></span>' : '') + '</form></details>' +
      '</section></div><p class="muted center" style="margin-top:18px;font-size:12.5px">© ' + new Date().getFullYear() + ' ' + esc(app) + ' · ' + esc(c.namaInstansi || '') + (API.DEMO ? ' · <b style="color:var(--violet)">MODE DEMO</b>' : '') + '</p></div>';
    jalurUtama();
    pasang();
  }
  const fitur = (ic, judul, tag, teks) => '<div class="feat"><div class="ic-tile">' + icon(ic) + '</div><div class="grow"><b>' + esc(judul) + '<em>' + esc(tag) + '</em></b><p>' + esc(teks) + '</p></div></div>';

  function jalurUtama() {
    const el = UI.$('#jalurUtama');
    if (!el) return;
    if (API.DEMO) {
      el.innerHTML = '<div class="stack" style="gap:10px"><div class="alert info" style="font-size:13px">' + icon('info') + '<span><b>Mode demo</b> — GAS_URL belum diisi di <span class="mono">js/config.js</span>. Data contoh disimpan di browser ini.</span></div>' +
        '<div class="grid g2" style="gap:10px"><button class="gbtn" data-aksi="demoMasuk" data-peran="ADMIN">' + icon('shieldok') + 'Masuk Demo · Admin</button>' +
        '<button class="gbtn" data-aksi="demoMasuk" data-peran="PEGAWAI">' + icon('user') + 'Masuk Demo · Pegawai</button></div></div>';
      return;
    }
    if (!cfg || !cfg.clientId) {
      el.innerHTML = '<button class="gbtn" disabled style="opacity:.6;cursor:not-allowed">' + googleG() + 'Masuk dengan Google</button><p class="hint" style="margin-top:6px;font-size:12px;color:var(--muted)">' +
        (cfg ? 'Login Google belum dikonfigurasi admin (GOOGLE_CLIENT_ID). Gunakan kode email.' : 'Menghubungkan ke server…') + '</p>';
      return;
    }
    el.innerHTML = '<div id="gBtn" style="display:flex;justify-content:center;min-height:44px"></div><p class="hint center" style="margin-top:6px;font-size:12px;color:var(--muted)">Gunakan email kedinasan atau akun Google yang terdaftar' + (cfg.domain ? ' (@' + esc(cfg.domain) + ')' : '') + '</p>';
    UI.muatScript('https://accounts.google.com/gsi/client', 'google').then(() => {
      const g = window.google && window.google.accounts && window.google.accounts.id;
      const box = UI.$('#gBtn');
      if (!g || !box) return;
      g.initialize({ client_id: cfg.clientId, callback: onGoogle, ux_mode: 'popup', auto_select: false, cancel_on_tap_outside: true, use_fedcm_for_prompt: true });
      g.renderButton(box, { theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular', logo_alignment: 'center', width: Math.min(400, box.clientWidth || 360) });
    }).catch(() => { UI.$('#gBtn').innerHTML = '<div class="alert yellow" style="font-size:13px">' + icon('alert') + '<span>Tombol Google gagal dimuat. Matikan pemblokir iklan/ekstensi privasi untuk situs ini, muat ulang halaman, atau gunakan kode email.</span></div>'; });
  }
  const googleG = () => '<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.5z"/></svg>';

  async function onGoogle(resp) {
    const box = UI.$('#gBtn');
    if (box) box.innerHTML = '<div class="btn btn-ghost btn-lg btn-block is-loading" style="color:transparent">Memverifikasi</div>';
    try { App.masuk(await API.api('auth.google', { credential: resp.credential })); }
    catch (e) { gambar(e.message); }
  }

  function pasang() {
    const f = UI.$('#fKode'), email = UI.$('#emailKode'), kotak = UI.$('#kotakKode'), btn = UI.$('#btnKode');
    const otp = UI.$$('[data-otp]');
    let tahap = 1;
    otp.forEach((el, i) => {
      el.addEventListener('input', () => { el.value = el.value.replace(/\D/g, '').slice(-1); if (el.value && otp[i + 1]) otp[i + 1].focus(); if (otp.every((o) => o.value)) f.requestSubmit(); });
      el.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !el.value && otp[i - 1]) otp[i - 1].focus(); });
      el.addEventListener('paste', (e) => { const t = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6); if (t.length === 6) { e.preventDefault(); t.split('').forEach((c, j) => { otp[j].value = c; }); f.requestSubmit(); } });
    });
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      UI.sibuk(btn, async () => {
        try {
          if (tahap === 1) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) { email.classList.add('invalid'); throw new Error('Masukkan email yang valid.'); }
            email.classList.remove('invalid');
            const r = await API.api('auth.kirimKode', { email: email.value.trim() });
            tahap = 2; kotak.classList.remove('hide'); email.readOnly = true;
            btn.innerHTML = 'Masuk ' + icon('login');
            UI.$('#infoKode').innerHTML = esc(r.pesan) + ' <button type="button" class="link" data-aksi="gantiEmail">Ganti email</button>' + (r.demoKode ? '<br><b style="color:var(--violet)">Kode demo: ' + r.demoKode + '</b>' : '');
            otp[0].focus();
          } else {
            const kode = otp.map((o) => o.value).join('');
            if (kode.length !== 6) throw new Error('Lengkapi 6 digit kode.');
            App.masuk(await API.api('auth.verifikasiKode', { email: email.value.trim(), kode }));
          }
        } catch (err) { UI.toast(err.message, 'bad'); otp.forEach((o) => { o.value = ''; }); if (tahap === 2) otp[0].focus(); }
      });
    });
    App.aksi('gantiEmail', () => { tahap = 1; kotak.classList.add('hide'); email.readOnly = false; email.focus(); btn.innerHTML = 'Kirim Kode Masuk ' + icon('send'); });
    UI.$('#fDarurat').addEventListener('submit', (e) => {
      e.preventDefault();
      const b = e.target.querySelector('button');
      UI.sibuk(b, async () => {
        try { App.masuk(await API.api('auth.darurat', { user: UI.$('#dUser').value.trim(), pass: UI.$('#dPass').value })); }
        catch (err) { UI.toast(err.message, 'bad'); }
      });
    });
  }

  App.aksi('demoMasuk', (b) => UI.sibuk(b, async () => {
    try { App.masuk(await API.api('auth.demo', { peran: b.dataset.peran })); } catch (e) { UI.toast(e.message, 'bad'); }
  }));

  Halaman.login = function (pesan) {
    App.bersihkan && App.bersihkan();
    if (location.hash && location.hash !== '#/login') history.replaceState(null, '', '#/login');
    gambar(pesan);
    // perbarui konfigurasi publik (Client ID, nama instansi) dari server
    API.api('auth.config').then((c) => {
      const lama = JSON.stringify(cfg);
      cfg = c; API.ls.set('cfg', JSON.stringify(c));
      if (lama !== JSON.stringify(c) && !API.Sesi.token && UI.$('.login')) { const e = UI.$('.alert.bad'); gambar(e ? e.textContent.replace('Tidak dapat masuk', '') : pesan); }
    }).catch((e) => { if (!API.DEMO && UI.$('#jalurUtama') && !cfg) UI.$('#jalurUtama').innerHTML = '<div class="alert bad" style="font-size:13px">' + icon('alert') + '<span>Server tidak dapat dihubungi: ' + esc(e.message) + ' Periksa GAS_URL di js/config.js.</span></div>'; });
  };
})();
