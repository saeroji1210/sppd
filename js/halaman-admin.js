/* =========================================================
   halaman-admin.js — Dashboard, Kelola Pegawai (+ foto wajah),
   Kelola Penugasan (+ peta geofence), Pemantauan Presensi real-time
   (+ tinjauan), Rekap SPPD, Notifikasi WA/Email, Info Sistem
   (kuota, cache, rahasia, migrasi, log), Pengaturan.
   ========================================================= */
(function () {
  'use strict';
  const { esc, icon, badge, tgl, angka, rupiah, rupiahPendek } = UI;
  const { Store, Sesi, Jam } = API;
  const kpi = (...a) => window.K.kpi(...a), quick = (...a) => window.K.quick(...a);
  const bulanLalu = (b) => { const d = new Date(Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 2, 1)); return d.toISOString().slice(0, 7); };
  const tren = (a, b, kebalik) => {
    if (!b) return '<span class="trend flat">baru</span>';
    const p = Math.round(((a - b) / b) * 100), naik = p >= 0, baik = kebalik ? !naik : naik;
    return '<span class="trend ' + (p === 0 ? 'flat' : baik ? 'up' : 'down') + '">' + icon(naik ? 'up' : 'down', 'sm') + Math.abs(p) + '%</span>';
  };
  const valid = (r) => r.Verifikasi !== 'Ditolak';

  /* ---------- Polling presensi baru (dashboard & pemantauan) ---------- */
  function pantauLangsung() {
    const stop = API.poll(async () => {
      const d = Store.d;
      const sejak = App.st.sejak || (d.presensi[0] ? d.presensi.reduce((m, r) => (r.Waktu_Server > m ? r.Waktu_Server : r.Ditinjau_Pada > m ? r.Ditinjau_Pada : m), '') : d.server.waktu);
      const pack = await API.api('presensi.sejak', { sejak });
      App.st.sejak = pack.waktu;
      const rows = Store.presensiKompak(pack);
      if (rows.length) {
        const baru = rows.filter((r) => !Store.idx.presensi[r.ID_Presensi]).length;
        Store.upsert('presensi', rows, 'ID_Presensi');
        if (baru) UI.toast(baru + ' presensi baru masuk.', 'info');
        App.segarkan();
      }
    }, 15000);
    App.bersih.push(stop);
  }

  /* =================== DASHBOARD =================== */
  App.halaman('dashboard', {
    judul: 'Portal SPPD Online', sub: 'Aparatur sipil & manajemen tugas dinas', peran: 'ADMIN',
    render() {
      const d = Store.d, t = App.hariIni(), u = Sesi.user, bln = t.slice(0, 7), lalu = bulanLalu(bln);
      const aktif = d.penugasan.filter((p) => p.Status === 'Aktif');
      const berjalan = aktif.filter((p) => p.Tgl_Mulai <= t && p.Tgl_Selesai >= t);
      const stAktif = new Set(aktif.filter((p) => p.Tgl_Selesai >= t).map((p) => p.No_Surat_Tugas)).size;
      const pegDinas = new Set(berjalan.map((p) => p.ID_Pegawai)).size, kota = new Set(berjalan.map((p) => p.Nama_Lokasi)).size;
      const pv = d.presensi.filter(valid);
      const pB = pv.filter((r) => r.Tanggal.slice(0, 7) === bln), pL = pv.filter((r) => r.Tanggal.slice(0, 7) === lalu);
      const tepat = (a) => a.filter((r) => r.Status === 'Tepat Waktu').length, masalah = (a) => a.filter((r) => r.Status !== 'Tepat Waktu').length;
      const otom = UI.pct(pv.filter((r) => r.Verifikasi === 'Otomatis' || r.Verifikasi === 'Disetujui').length, d.presensi.length, 1);
      const hariIni = pv.filter((r) => r.Tanggal === t);
      const tinjau = d.presensi.filter((r) => r.Verifikasi === 'Perlu Tinjauan');
      const next = d.penugasan.filter((p) => p.Status !== 'Batal' && p.Tgl_Selesai >= t).sort((a, b) => a.Tgl_Mulai.localeCompare(b.Tgl_Mulai));
      const ku = d.kuota || { batas: 100, sisa: 100, terpakai: 0, kapasitasPegawai: 50 };
      const stApp = new Set(d.penugasan.filter((p) => p.Tgl_Mulai.slice(0, 7) === bln && p.Status !== 'Batal').map((p) => p.No_Surat_Tugas)).size;
      const stLalu = new Set(d.penugasan.filter((p) => p.Tgl_Mulai.slice(0, 7) === lalu && p.Status !== 'Batal').map((p) => p.No_Surat_Tugas)).size;
      return '<div class="dash"><div class="stack">' +
        '<section class="banner"><div style="position:relative;z-index:1"><span class="pill"><i class="live-dot"></i>Server terhubung · Toleransi geofence ' + esc(App.s('RADIUS_DEFAULT', 100)) + ' m</span>' +
        '<h1>Selamat Datang Kembali, ' + esc(u.nama.split(',')[0]) + '! 👋</h1><p>Kelola penugasan dinas, validasi presensi GPS & wajah biometrik, serta pantau kelengkapan SPPD hari ini secara real-time.</p>' +
        '<div class="actions"><button class="btn btn-white" data-nav="#/penugasan/baru">' + icon('plus') + 'Buat Penugasan Baru' + icon('right', 'sm') + '</button><button class="btn btn-glass" data-nav="#/rekap">' + icon('history') + 'Rekap SPPD</button></div></div>' +
        '<div class="glass-row"><div class="glass"><small>Waktu server WIB ' + icon('clock', 'sm') + '</small><b class="tnum" data-jam>' + Jam.wib().jam + '</b><span>' + tgl(t, 'hari') + '</span><span style="margin-top:6px;display:flex;gap:6px;align-items:center">' + icon('shieldok', 'sm') + 'Sinkronisasi otomatis</span></div>' +
        '<div class="glass"><small>Validasi otomatis ' + icon('target', 'sm') + '</small><b>' + angka(otom, 1) + '%</b><span>GPS + wajah terverifikasi</span><span style="margin-top:6px">' + d.presensi.length + ' presensi · ' + d.jendela.hari + ' hari</span></div></div></section>' +
        '<div class="grid g4 qa">' + quick('blue', 'clipboard', 'Kelola Penugasan', 'Buat surat tugas, tentukan radius GPS & jadwal.', 'Buka Penugasan', '#/penugasan', 'btn-primary') +
        quick('green', 'radar', 'Pantau Presensi', 'Verifikasi kedatangan & swafoto di lokasi dinas.', 'Pantau Langsung', '#/pemantauan', 'btn-success') +
        quick('violet', 'money', 'Rekap SPPD', 'Hitung otomatis hari dinas & unduh lampiran.', 'Lihat Rekap', '#/rekap', 'btn-violet') +
        quick('orange', 'db', 'Info Sistem & Kuota', 'Status cache, kuota email & audit log.', 'Cek Kapasitas', '#/sistem', 'btn-orange') + '</div>' +
        '<div class="grid g4">' +
        kpi('clipboard', '', stAktif + '<small>surat tugas</small>', 'Penugasan aktif berjalan', 'Dibanding bulan lalu (terbit)', tren(stApp, stLalu)) +
        kpi('users', 'green', pegDinas + '<small>pegawai</small>', 'Sedang dinas di ' + kota + ' lokasi', icon('pin', 'sm') + 'Total ' + d.pegawai.filter((p) => p.Status === 'Aktif').length + ' pegawai aktif') +
        kpi('okc', 'violet', angka(UI.pct(tepat(pB), pB.length, 1), 1) + '<small>%</small>', 'Presensi tepat waktu', pB.length + ' presensi bulan ini', tren(UI.pct(tepat(pB), pB.length), UI.pct(tepat(pL), pL.length))) +
        kpi('alert', 'orange', masalah(pB) + '<small>presensi</small>', 'Terlambat / pulang cepat', tinjau.length + ' menunggu tinjauan', tren(masalah(pB), masalah(pL), true)) + '</div>' +
        '<div class="chart-row"><div class="card"><div class="card-h" style="flex-wrap:wrap"><div><h2>Tren Presensi Harian</h2><div class="sub">Jumlah presensi sah per hari · 30 hari terakhir</div></div><div class="legend"><span><i style="background:#1F4FD8"></i>Tepat waktu</span><span><i style="background:#F59E0B"></i>Terlambat / pulang cepat</span></div></div><div id="chTren" style="min-height:240px"></div></div>' +
        '<div class="card"><div class="card-h"><div><h2>Komposisi Presensi</h2><div class="sub">Status ' + d.jendela.hari + ' hari terakhir</div></div></div><div id="chDonat"></div></div></div>' +
        '<div class="card pad-0"><div class="row between wrap" style="padding:18px 20px"><div class="row"><span class="ic-tile">' + icon('scan') + '</span><div><h2>Presensi Masuk Hari Ini (Live WIB)</h2><div class="sub muted" style="font-size:12.5px">Aktivitas kehadiran dengan verifikasi GPS & pengenalan wajah</div></div></div>' +
        badge(hariIni.filter((r) => r.Jenis === 'Datang').length + ' datang hari ini', 'ok') + '</div>' + tabelPresensi('dashHariIni', hariIni, { pp: 5, ringkas: true }) +
        '<div class="row between" style="padding:0 20px 16px"><span></span><button class="link" data-nav="#/pemantauan">Buka seluruh presensi ' + icon('right', 'sm') + '</button></div></div>' +
        '</div><aside class="dash-aside">' +
        (tinjau.length ? '<div class="alert warn"><div class="ic-tile">' + icon('alert') + '</div><div class="grow"><b>' + tinjau.length + ' presensi perlu tinjauan</b><div style="font-size:12.5px">Skor wajah mendekati ambang atau GPS lemah.</div></div><button class="btn btn-dark btn-sm" data-nav="#/pemantauan?f=tinjau">Tinjau</button></div>' : '') +
        '<div class="card"><div class="card-h"><h2>Penugasan Mendatang</h2><button class="link" data-nav="#/penugasan">Lihat semua</button></div>' +
        (next.length ? '<div class="list">' + next.slice(0, 4).map((p) => window.K.liPenugasan(p, true)).join('') + '</div>' : '<p class="muted">Belum ada penugasan.</p>') + '</div>' +
        '<div class="card"><div class="card-h"><h2>Info Sistem & Kuota</h2>' + icon('cloud') + '</div><div class="li" style="flex-direction:column;align-items:stretch;gap:8px;background:var(--primary-50);border-color:var(--primary-100)">' +
        '<div class="row between"><b style="font-size:13px">Kuota email notifikasi GAS</b><b class="tnum" style="color:var(--primary-ink)">' + angka(ku.terpakai) + ' / ' + angka(ku.batas) + '</b></div>' + UI.progress(UI.pct(ku.terpakai, ku.batas), ku.sisa < ku.batas * 0.1 ? 'red' : ku.sisa < ku.batas * 0.3 ? 'warn' : '') +
        '<div class="row between" style="font-size:12px"><span class="muted">Tersisa ' + angka(ku.sisa) + ' email hari ini</span><b style="color:var(--success-ink)">±' + angka(ku.kapasitasPegawai) + ' pegawai</b></div></div>' +
        '<div class="li" style="margin-top:10px;align-items:flex-start"><span class="ic-tile" style="width:34px;height:34px">' + icon('sync', 'sm') + '</span><div><b style="font-size:13px">Sinkronisasi SPPD otomatis</b><div class="cell-sub">Rekap hari dinas dihitung ulang tiap 00:30 WIB; pengingat presensi tiap 10 menit lewat trigger GAS.</div></div></div></div>' +
        '<div class="card"><div class="card-h"><h2>Pengumuman</h2>' + icon('mega') + '</div><p style="font-size:13px">' + esc(App.s('PENGUMUMAN', '')) + '</p><button class="link" style="margin-top:10px" data-nav="#/pengaturan">Ubah pengumuman ' + icon('right', 'sm') + '</button></div>' +
        '</aside></div>';
    },
    mount() {
      const d = Store.d, t = App.hariIni(), labels = [], tl = [], a = [], b = [];
      const per = {};
      d.presensi.filter(valid).forEach((r) => { const x = per[r.Tanggal] = per[r.Tanggal] || [0, 0]; x[r.Status === 'Tepat Waktu' ? 0 : 1]++; });
      for (let i = 29; i >= 0; i--) { const k = UI.tambahHari(t, -i); labels.push(tgl(k, 'pendek')); tl.push(tgl(k, 'hari')); a.push((per[k] || [0])[0]); b.push((per[k] || [0, 0])[1]); }
      Charts.batang(UI.$('#chTren'), { labels, tipLabel: tl, tumpuk: true, aria: 'Presensi per hari 30 hari terakhir', seri: [{ nama: 'Tepat waktu', warna: '#1F4FD8', data: a }, { nama: 'Terlambat / pulang cepat', warna: '#F59E0B', data: b }] });
      const pv = d.presensi.filter(valid), c = (s) => pv.filter((r) => r.Status === s).length;
      Charts.donat(UI.$('#chDonat'), { data: [{ label: 'Tepat waktu (radius valid)', nilai: c('Tepat Waktu'), warna: '#16A34A' }, { label: 'Terlambat masuk', nilai: c('Terlambat'), warna: '#F59E0B' }, { label: 'Pulang cepat', nilai: c('Pulang Cepat'), warna: '#DC2626' }],
        tengah: { nilai: UI.pct(c('Tepat Waktu'), pv.length) + '%', label: 'Kepatuhan total' } });
      pantauLangsung();
    }
  });

  /* Tabel presensi bersama (dashboard & pemantauan) */
  function tabelPresensi(id, rows, o) {
    o = o || {};
    return UI.tabel(id, {
      data: rows, kunci: 'ID_Presensi', satuan: 'presensi', sortAwal: 'Waktu_Server', dirAwal: -1, perHalaman: o.pp || 10,
      kelasBaris: (r) => (r.Verifikasi === 'Perlu Tinjauan' ? 'flag' : ''), klik: (k) => detailPresensi(k),
      kosong: UI.empty('scan', 'Belum ada presensi', o.kosong || 'Presensi pegawai akan tampil di sini secara real-time.'),
      kolom: [
        { k: 'Waktu_Server', l: 'Waktu Server (WIB)', r: (r) => '<div class="cell-main mono" style="font-size:13px;color:' + (r.Status === 'Tepat Waktu' ? 'var(--ink)' : r.Status === 'Terlambat' ? 'var(--warning-ink)' : 'var(--danger)') + '">' + esc(String(r.Waktu_Server).slice(11, 19)) + '</div><div class="cell-sub">' + (o.ringkas ? esc(r.Jenis) : tgl(r.Tanggal)) + '</div>' },
        { k: 'ID_Pegawai', l: 'Pegawai Bertugas', nilai: (r) => App.peg(r.ID_Pegawai).Nama, r: (r) => { const g = App.peg(r.ID_Pegawai); return '<div class="who">' + UI.avatar(g.Nama, 'sm') + '<div style="min-width:0"><div class="cell-main" style="max-width:190px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(g.Nama) + '</div><div class="cell-sub nw">NIP ' + esc(g.NIP || '—') + '</div></div></div>'; } },
        { k: 'ID_Penugasan', l: 'Penugasan & Lokasi', nilai: (r) => (Store.penugasan(r.ID_Penugasan) || {}).Nama_Lokasi, r: (r) => { const p = Store.penugasan(r.ID_Penugasan) || {}; return '<div class="cell-main" style="color:var(--primary-ink)">' + esc(p.No_Surat_Tugas || '—') + '</div><div class="cell-sub" style="max-width:220px">' + icon('pin', 'sm').replace('class="ic sm"', 'class="ic sm" style="display:inline;width:12px;height:12px;vertical-align:-2px"') + ' ' + esc(p.Nama_Lokasi || '') + '</div>'; } },
        o.ringkas ? null : { k: 'Jenis', l: 'Jenis', r: (r) => badge(r.Jenis, r.Jenis === 'Datang' ? 'info' : 'violet', false) },
        { k: 'Jarak_Meter', l: 'Jarak GPS & Radius', nilai: (r) => +r.Jarak_Meter, r: (r) => { const p = Store.penugasan(r.ID_Penugasan) || {}; const ok = +r.Jarak_Meter <= (+p.Radius_Meter || 100); return '<div class="cell-main" style="color:' + (ok ? 'var(--success-ink)' : 'var(--danger)') + '">' + icon(ok ? 'okc' : 'alert', 'sm').replace('class="ic sm"', 'class="ic sm" style="display:inline;width:14px;height:14px;vertical-align:-2px"') + ' ' + r.Jarak_Meter + ' meter</div><div class="cell-sub">Akurasi ±' + r.Akurasi_GPS + ' m · maks ' + (p.Radius_Meter || '—') + ' m</div>'; } },
        { k: 'Skor_Wajah', l: 'Biometrik', nilai: (r) => +r.Skor_Wajah, r: (r) => badge(r.Skor_Wajah + '% cocok', +r.Skor_Wajah >= +App.s('AMBANG_WAJAH', 75) + 5 ? 'ok' : 'warn', false) + '<div class="cell-sub">Ambang ' + App.s('AMBANG_WAJAH', 75) + '%</div>' },
        { k: 'Status', l: 'Status & Verifikasi', r: (r) => '<div class="nw">' + badge(r.Status) + '</div>' + (r.Selisih_Menit ? '<div class="cell-sub" style="color:' + (r.Selisih_Menit > 0 ? 'var(--warning-ink)' : 'var(--danger-ink)') + '">' + (r.Selisih_Menit > 0 ? '+' : '') + r.Selisih_Menit + ' menit</div>' : '') +
          '<div style="margin-top:4px" class="nw">' + (r.Verifikasi === 'Otomatis' ? '<span class="cell-sub">' + icon('shieldok', 'sm').replace('class="ic sm"', 'class="ic sm" style="display:inline;width:12px;height:12px;vertical-align:-2px"') + ' Otomatis</span>' : badge(r.Verifikasi, null, false)) + '</div>' },
        o.ringkas ? null : { k: '', l: 'Aksi', sort: false, r: (r) => '<div class="acts"><button class="btn btn-sm ' + (r.Verifikasi === 'Perlu Tinjauan' ? 'btn-orange' : 'btn-ghost') + '" data-aksi="detailPresensi" data-id="' + esc(r.ID_Presensi) + '">' + (r.Verifikasi === 'Perlu Tinjauan' ? 'Tinjau' : 'Detail') + '</button></div>' }
      ].filter(Boolean)
    });
  }
  App.aksi('detailPresensi', (b) => detailPresensi(b.dataset.id));

  function detailPresensi(id) {
    const r = Store.idx.presensi[id] || (App.st.pantauLama && App.st.pantauLama.rows.find((x) => x.ID_Presensi === id));
    if (!r) return UI.toast('Data presensi tidak ditemukan.', 'warn');
    const p = Store.penugasan(r.ID_Penugasan) || {}, g = App.peg(r.ID_Pegawai);
    const tinjau = r.Verifikasi === 'Perlu Tinjauan';
    const dw = UI.drawer({
      judul: 'Detail Presensi ' + r.Jenis, sub: r.ID_Presensi + ' · ' + tgl(r.Tanggal, 'panjang'), wide: true,
      isi: '<div class="stack"><div class="row between wrap"><div class="who">' + UI.avatar(g.Nama) + '<div><div class="cell-main">' + esc(g.Nama) + '</div><div class="cell-sub">' + esc(g.Jabatan || '') + ' · NIP ' + esc(g.NIP || '—') + '</div></div></div><div class="row">' + badge(r.Status) + badge(r.Verifikasi) + '</div></div>' +
        '<div class="grid g2"><div><div class="lbl-up" style="margin-bottom:6px">Foto bukti presensi</div><div class="sk" id="fotoBukti" style="aspect-ratio:3/4;border-radius:14px"></div></div>' +
        '<div><div class="lbl-up" style="margin-bottom:6px">Foto referensi wajah</div><div class="sk" id="fotoRef" style="aspect-ratio:3/4;border-radius:14px"></div></div></div>' +
        '<div class="map sm" id="petaPres"></div>' +
        '<dl class="kv"><dt>Waktu server</dt><dd class="tnum">' + esc(r.Waktu_Server) + ' WIB</dd><dt>Penugasan</dt><dd>' + esc(p.No_Surat_Tugas || '') + '<div class="cell-sub" style="font-weight:400">' + esc(p.Tujuan || '') + '</div></dd>' +
        '<dt>Lokasi</dt><dd>' + esc(p.Nama_Lokasi || '') + '</dd><dt>Jarak / radius</dt><dd>' + r.Jarak_Meter + ' m / ' + (p.Radius_Meter || '—') + ' m</dd><dt>Akurasi GPS</dt><dd>±' + r.Akurasi_GPS + ' m</dd>' +
        '<dt>Koordinat</dt><dd class="mono">' + esc(r.Latitude) + ', ' + esc(r.Longitude) + '</dd><dt>Skor wajah</dt><dd>' + r.Skor_Wajah + '% (ambang ' + App.s('AMBANG_WAJAH', 75) + '%)</dd>' +
        '<dt>Jadwal</dt><dd>' + esc(p.Jam_Masuk || '') + '–' + esc(p.Jam_Pulang || '') + ' WIB' + (r.Selisih_Menit ? ' · selisih ' + (r.Selisih_Menit > 0 ? '+' : '') + r.Selisih_Menit + ' mnt' : '') + '</dd>' +
        (r.Catatan ? '<dt>Catatan sistem</dt><dd style="color:var(--warning-ink)">' + esc(r.Catatan) + '</dd>' : '') + (r.Ditinjau_Oleh ? '<dt>Ditinjau</dt><dd>' + esc(r.Ditinjau_Oleh) + '<div class="cell-sub">' + esc(r.Ditinjau_Pada) + '</div></dd>' : '') + '</dl>' +
        (tinjau ? '<div class="field"><label for="catTinjau">Catatan tinjauan (opsional)</label><textarea class="textarea" id="catTinjau" placeholder="Contoh: wajah sesuai, pencahayaan kurang"></textarea></div>' : '') + '</div>',
      kaki: tinjau ? '<button class="btn btn-ghost" style="color:var(--danger)" data-aksi="tinjau" data-k="Ditolak" data-id="' + esc(id) + '">' + icon('xc') + 'Tolak presensi</button><button class="btn btn-success" data-aksi="tinjau" data-k="Disetujui" data-id="' + esc(id) + '">' + icon('okc') + 'Setujui</button>' : '<button class="btn btn-ghost" data-tutup>Tutup</button>'
    });
    const ids = [r.ID_Foto_Bukti, (Store.pegawai(r.ID_Pegawai) || {}).ID_Foto_Referensi].filter(Boolean);
    const isi = (el, data) => { if (!el) return; el.classList.remove('sk'); el.innerHTML = data ? '<img src="' + data + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:14px">' : '<div class="map-fallback" style="position:static;height:100%;border-radius:14px">' + icon('cam', 'lg') + 'Tidak tersedia</div>'; };
    if (ids.length) {
      API.api('batch', { calls: ids.map((x) => ({ action: 'foto.get', data: { id: x } })) }).then((res) => {
        const ambil = (x) => { const i = ids.indexOf(x); const o = Array.isArray(res) ? res[i] : null; return o && o.success ? o.data.dataUrl : o && o.dataUrl ? o.dataUrl : null; };
        isi(dw.el.querySelector('#fotoBukti'), ambil(r.ID_Foto_Bukti)); isi(dw.el.querySelector('#fotoRef'), ambil((Store.pegawai(r.ID_Pegawai) || {}).ID_Foto_Referensi));
      }).catch(() => { isi(dw.el.querySelector('#fotoBukti')); isi(dw.el.querySelector('#fotoRef')); });
    } else { isi(dw.el.querySelector('#fotoBukti')); isi(dw.el.querySelector('#fotoRef')); }
    Geo.peta(dw.el.querySelector('#petaPres'), { lat: +p.Latitude, lng: +p.Longitude, radius: +p.Radius_Meter, interaktif: true, zoom: 16 }).then((m) => { if (m) m.setUser(+r.Latitude, +r.Longitude, +r.Akurasi_GPS); });
    App.st.drawerPres = dw;
  }
  App.aksi('tinjau', (b) => UI.sibuk(b, async () => {
    const id = b.dataset.id, k = b.dataset.k;
    if (k === 'Ditolak' && !(await UI.konfirmasi('Tolak presensi ini?', 'Presensi yang ditolak tidak dihitung dalam hari hadir lengkap SPPD. Pegawai dapat melakukan presensi ulang bila masih dalam jadwal.', { bahaya: true, ya: 'Tolak presensi' }))) return;
    try {
      const res = await API.api('presensi.tinjau', { id, keputusan: k, catatan: (UI.$('#catTinjau') || {}).value || '' });
      const row = {}; res.h.forEach((x, i) => { row[x] = res.presensi[i]; });
      Store.upsert('presensi', [row], 'ID_Presensi');
      if (res.rekap) Store.upsert('rekap', [res.rekap], 'ID_Penugasan');
      if (App.st.drawerPres) App.st.drawerPres.tutup();
      UI.toast('Presensi ' + k.toLowerCase() + '.', 'ok');
      App.segarkan(true);
    } catch (e) { UI.toast(e.message, 'bad'); }
  }));

  /* =================== KELOLA PEGAWAI =================== */
  App.halaman('pegawai', {
    judul: 'Kelola Pegawai', sub: 'Data pegawai, peran, kontak & foto referensi wajah', peran: 'ADMIN',
    render(pm, q) {
      const f = App.st.peg = App.st.peg || { q: '', status: '', peran: '', wajah: '' };
      if (q.q != null && App.st.pegQ !== q.q) { f.q = q.q; App.st.pegQ = q.q; }
      const all = Store.d.pegawai, rows = filterPeg(f);
      const n = (fn) => all.filter(fn).length;
      return '<div class="stack"><div class="grid g4">' +
        kpi('users', '', all.length + '<small>orang</small>', 'Total pegawai', n((p) => p.Status === 'Aktif') + ' aktif · ' + n((p) => p.Status !== 'Aktif') + ' nonaktif') +
        kpi('face', 'green', n((p) => p.Punya_Wajah) + '<small>/ ' + all.length + '</small>', 'Foto wajah terdaftar', n((p) => !p.Punya_Wajah && p.Status === 'Aktif') ? icon('alert', 'sm') + n((p) => !p.Punya_Wajah && p.Status === 'Aktif') + ' aktif belum terdaftar' : icon('okc', 'sm') + 'Semua lengkap') +
        kpi('wa', 'violet', n((p) => p.Status_WA === 'Terdaftar') + '<small>/ ' + n((p) => p.No_WA) + '</small>', 'Nomor WA terverifikasi', 'Divalidasi via Fonnte') +
        kpi('shieldok', 'orange', n((p) => p.Peran === 'Admin') + '<small>admin</small>', 'Pengelola sistem', 'Ditambah ADMIN_EMAILS') + '</div>' +
        '<div class="card"><div class="toolbar"><div class="input-ic grow" style="min-width:220px">' + icon('search') + '<input class="input" placeholder="Cari nama, NIP, email, jabatan…" value="' + esc(f.q) + '" data-ubah="pegCari" aria-label="Cari pegawai"></div>' +
        sel('pegF', 'status', f.status, [['', 'Semua status'], ['Aktif', 'Aktif'], ['Nonaktif', 'Nonaktif']]) + sel('pegF', 'peran', f.peran, [['', 'Semua peran'], ['Admin', 'Admin'], ['Pegawai', 'Pegawai']]) +
        sel('pegF', 'wajah', f.wajah, [['', 'Semua wajah'], ['ya', 'Wajah terdaftar'], ['tidak', 'Belum terdaftar']]) +
        '<button class="btn btn-ghost" data-aksi="pegCekWA">' + icon('wa') + 'Cek WA</button><button class="btn btn-ghost" data-aksi="pegEkspor">' + icon('sheet') + 'Excel</button><button class="btn btn-primary" data-aksi="pegForm">' + icon('plus') + 'Tambah Pegawai</button></div></div>' +
        '<div class="card pad-0">' + UI.tabel('pegTbl', {
          data: rows, kunci: 'ID_Pegawai', satuan: 'pegawai', sortAwal: 'Nama', dirAwal: 1,
          kolom: [
            { k: 'Nama', l: 'Pegawai', r: (p) => '<div class="who">' + UI.avatar(p.Nama) + '<div style="min-width:0"><div class="cell-main">' + esc(p.Nama) + '</div><div class="cell-sub">NIP ' + esc(p.NIP || '—') + '</div></div></div>' },
            { k: 'Jabatan', l: 'Jabatan & Unit', r: (p) => '<div class="cell-main" style="font-weight:500">' + esc(p.Jabatan || '—') + '</div><div class="cell-sub">' + esc(p.Unit_Kerja || '') + '</div>' },
            { k: 'Email', l: 'Kontak', r: (p) => '<div style="font-size:13px">' + esc(p.Email) + '</div><div class="cell-sub">' + (p.No_WA ? esc(p.No_WA) + ' ' + (p.Status_WA ? badge(p.Status_WA, null, false) : '') : 'WA belum diisi') + '</div>' },
            { k: 'Peran', l: 'Peran', r: (p) => badge(p.Peran, null, false) },
            { k: 'Punya_Wajah', l: 'Wajah', nilai: (p) => (p.Punya_Wajah ? 1 : 0), r: (p) => (p.Punya_Wajah ? badge('Terdaftar', 'ok') : badge('Belum', 'warn')) },
            { k: 'Status', l: 'Status', r: (p) => badge(p.Status) },
            { k: '', l: 'Aksi', sort: false, r: (p) => '<div class="acts"><button class="btn btn-icon" title="Foto wajah" aria-label="Foto wajah" data-aksi="pegWajah" data-id="' + p.ID_Pegawai + '">' + icon('face', 'sm') + '</button><button class="btn btn-icon" title="Ubah" aria-label="Ubah" data-aksi="pegForm" data-id="' + p.ID_Pegawai + '">' + icon('edit', 'sm') + '</button>' +
              '<button class="btn btn-icon ' + (p.Status === 'Aktif' ? 'danger' : '') + '" title="' + (p.Status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan') + '" aria-label="Ubah status" data-aksi="pegStatus" data-id="' + p.ID_Pegawai + '">' + icon(p.Status === 'Aktif' ? 'lock' : 'okc', 'sm') + '</button></div>' }
          ],
          kosong: UI.empty('users', 'Tidak ada pegawai', f.q ? 'Tidak ada yang cocok dengan "' + f.q + '".' : 'Tambahkan pegawai pertama.', '<button class="btn btn-primary" data-aksi="pegForm">' + icon('plus') + 'Tambah pegawai</button>')
        }) + '</div></div>';
    }
  });
  const sel = (aksi, k, v, ops) => '<select class="select" style="width:auto;min-width:150px" data-ganti="' + aksi + '" data-k="' + k + '">' + ops.map((o) => '<option value="' + esc(o[0]) + '"' + (o[0] === v ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
  function filterPeg(f) {
    const q = f.q.trim().toLowerCase();
    return Store.d.pegawai.filter((p) => (!q || (p.Nama + ' ' + p.NIP + ' ' + p.Email + ' ' + p.Jabatan + ' ' + p.Unit_Kerja).toLowerCase().includes(q)) &&
      (!f.status || p.Status === f.status) && (!f.peran || p.Peran === f.peran) && (!f.wajah || (f.wajah === 'ya') === !!p.Punya_Wajah));
  }
  App.ubah('pegCari', UI.debounce((el) => { App.st.peg.q = el.value; UI.tabelReset('pegTbl'); UI.tabelData('pegTbl', filterPeg(App.st.peg)); }, 120));
  App.ubah('pegF', (el) => { App.st.peg[el.dataset.k] = el.value; UI.tabelReset('pegTbl'); UI.tabelData('pegTbl', filterPeg(App.st.peg)); });
  App.aksi('pegEkspor', () => UI.eksporExcel('Data_Pegawai', [{ l: 'ID', k: 'ID_Pegawai' }, { l: 'Nama', k: 'Nama' }, { l: 'NIP', k: 'NIP' }, { l: 'Jabatan', k: 'Jabatan' }, { l: 'Unit Kerja', k: 'Unit_Kerja' },
    { l: 'Email', k: 'Email' }, { l: 'No WA', k: 'No_WA' }, { l: 'Status WA', k: 'Status_WA' }, { l: 'Peran', k: 'Peran' }, { l: 'Status', k: 'Status' }, { l: 'Wajah Terdaftar', v: (p) => (p.Punya_Wajah ? 'Ya' : 'Belum') }], filterPeg(App.st.peg), 'Pegawai'));
  App.aksi('pegCekWA', (b) => UI.sibuk(b, async () => {
    try { const r = await API.api('notif.cekWA', {}); UI.toast(r.dicek + ' nomor WA divalidasi via Fonnte.', 'ok'); App.segarkanData(true); } catch (e) { UI.toast(e.message, 'bad'); }
  }));
  App.aksi('pegStatus', async (b) => {
    const p = Store.pegawai(b.dataset.id), baru = p.Status === 'Aktif' ? 'Nonaktif' : 'Aktif';
    if (baru === 'Nonaktif' && !(await UI.konfirmasi('Nonaktifkan ' + p.Nama + '?', 'Pegawai tidak dapat masuk dan semua sesi aktifnya langsung dicabut. Data presensi tetap tersimpan.', { bahaya: true, ya: 'Nonaktifkan' }))) return;
    const lama = p.Status;
    Store.upsert('pegawai', [Object.assign({}, p, { Status: baru })], 'ID_Pegawai'); App.segarkan(true); // optimistik
    try { Store.upsert('pegawai', [await API.api('pegawai.status', { id: p.ID_Pegawai, status: baru })], 'ID_Pegawai'); UI.toast(p.Nama + ' ' + (baru === 'Aktif' ? 'diaktifkan' : 'dinonaktifkan') + '.', 'ok'); }
    catch (e) { Store.upsert('pegawai', [Object.assign({}, p, { Status: lama })], 'ID_Pegawai'); App.segarkan(true); UI.toast(e.message, 'bad'); }
  });
  App.aksi('pegForm', (b) => {
    const p = b.dataset.id ? Store.pegawai(b.dataset.id) : {};
    const dw = UI.drawer({
      judul: p.ID_Pegawai ? 'Ubah Data Pegawai' : 'Tambah Pegawai', sub: p.ID_Pegawai ? p.ID_Pegawai : 'Pegawai dapat masuk dengan email ini (Google atau kode email).',
      isi: '<form id="fPeg" class="form-grid" novalidate>' + fld('Nama', 'Nama lengkap & gelar', p.Nama, 'full', 'required') + fld('NIP', 'NIP', p.NIP, '', 'inputmode="numeric"') + fld('Jabatan', 'Jabatan', p.Jabatan) +
        fld('Unit_Kerja', 'Unit kerja', p.Unit_Kerja, 'full') + fld('Email', 'Email login', p.Email, 'full', 'type="email" required') + fld('No_WA', 'Nomor WhatsApp', p.No_WA, '', 'inputmode="tel" placeholder="08xxxxxxxxxx"') +
        '<div class="field"><label>Peran</label><select class="select" name="Peran"><option' + (p.Peran !== 'Admin' ? ' selected' : '') + '>Pegawai</option><option' + (p.Peran === 'Admin' ? ' selected' : '') + '>Admin</option></select></div>' +
        '<div class="field"><label>Status</label><select class="select" name="Status"><option' + (p.Status !== 'Nonaktif' ? ' selected' : '') + '>Aktif</option><option' + (p.Status === 'Nonaktif' ? ' selected' : '') + '>Nonaktif</option></select></div>' +
        '<div class="full alert info" style="font-size:12.5px">' + icon('info', 'sm') + '<span>Mengubah email, peran, atau menonaktifkan akan mencabut sesi aktif pegawai tersebut.</span></div></form>',
      kaki: '<button class="btn btn-ghost" data-tutup>Batal</button><button class="btn btn-primary" id="simpanPeg">' + icon('check') + 'Simpan</button>'
    });
    dw.el.querySelector('#simpanPeg').addEventListener('click', (e) => UI.sibuk(e.currentTarget, async () => {
      const data = Object.fromEntries(new FormData(dw.el.querySelector('#fPeg')));
      if (p.ID_Pegawai) data.ID_Pegawai = p.ID_Pegawai;
      try {
        const r = await API.api('pegawai.simpan', data);
        Store.upsert('pegawai', [r], 'ID_Pegawai');
        dw.tutup(); App.segarkan(true);
        UI.toast('Data ' + r.Nama + ' disimpan.', 'ok');
        if (!p.ID_Pegawai) setTimeout(async () => { if (await UI.konfirmasi('Daftarkan foto wajah sekarang?', r.Nama + ' membutuhkan foto referensi wajah agar bisa melakukan presensi.', { ya: 'Daftarkan', ikon: 'face' })) App._aksi.pegWajah({ dataset: { id: r.ID_Pegawai } }); }, 300);
      } catch (err) { UI.toast(err.message, 'bad'); }
    }));
  });
  const fld = (n, l, v, cls, attr) => '<div class="field ' + (cls || '') + '"><label for="f_' + n + '">' + esc(l) + '</label><input class="input" id="f_' + n + '" name="' + n + '" value="' + esc(v || '') + '" ' + (attr || '') + '></div>';

  /* Foto referensi wajah */
  App.aksi('pegWajah', (b) => {
    const p = Store.pegawai(b.dataset.id);
    let stream = null, img = null, desc = null;
    const dw = UI.drawer({
      judul: 'Foto Referensi Wajah', sub: p.Nama,
      isi: '<div class="stack"><div class="alert info" style="font-size:12.5px">' + icon('info', 'sm') + '<span>Gunakan foto close-up menghadap depan, terang, tanpa masker/kacamata gelap, hanya satu orang. Deskriptor wajah dihitung di browser ini; foto disimpan privat di Google Drive.</span></div>' +
        '<div class="grid g2"><div><div class="lbl-up" style="margin-bottom:6px">Referensi saat ini</div><div id="refLama" class="' + (p.ID_Foto_Referensi ? 'sk' : '') + '" style="aspect-ratio:3/4;border-radius:14px;overflow:hidden">' + (p.ID_Foto_Referensi ? '' : '<div class="map-fallback" style="position:static;height:100%">' + icon('face', 'lg') + 'Belum ada</div>') + '</div></div>' +
        '<div><div class="lbl-up" style="margin-bottom:6px">Foto baru</div><div class="cam" style="aspect-ratio:3/4" id="wCam"><video id="wVid" class="mirror hide" playsinline muted></video><img id="wImg" class="hide" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"><div class="msg" id="wMsg"><div><div class="ic-tile">' + icon('cam') + '</div>Pilih sumber foto di bawah</div></div></div></div></div>' +
        '<div class="row wrap"><label class="btn btn-ghost">' + icon('ul') + 'Unggah foto<input type="file" accept="image/*" capture="user" id="wFile" hidden></label><button class="btn btn-ghost" id="wKam">' + icon('cam') + 'Ambil dari kamera</button><button class="btn btn-primary hide" id="wJepret">' + icon('scan') + 'Jepret</button></div>' +
        '<div id="wStatus"></div></div>',
      kaki: '<button class="btn btn-ghost" data-tutup>Batal</button><button class="btn btn-primary" id="wSimpan" disabled>' + icon('check') + 'Simpan Referensi</button>',
      onClose: () => Wajah.hentikan(stream)
    });
    const $d = (s) => dw.el.querySelector(s), status = (h) => { $d('#wStatus').innerHTML = h; };
    if (p.ID_Foto_Referensi) API.api('foto.get', { id: p.ID_Foto_Referensi }).then((r) => { const el = $d('#refLama'); if (el) { el.classList.remove('sk'); el.innerHTML = '<img src="' + r.dataUrl + '" alt="" style="width:100%;height:100%;object-fit:cover">'; } }).catch(() => { const el = $d('#refLama'); if (el) { el.classList.remove('sk'); el.innerHTML = '<div class="map-fallback" style="position:static;height:100%">Gagal memuat</div>'; } });
    const proses = async (sumber) => {
      desc = null; $d('#wSimpan').disabled = true;
      status('<div class="alert info" style="font-size:13px"><span class="btn is-loading btn-ghost btn-sm" style="width:30px;border:0"></span>Mendeteksi wajah & menghitung deskriptor…</div>');
      try {
        desc = await Wajah.deskriptorGambar(sumber);
        status('<div class="alert ok" style="font-size:13px">' + icon('okc') + '<span><b>Wajah terdeteksi.</b> Deskriptor 128 titik siap disimpan.</span></div>');
      } catch (e) {
        if (API.DEMO && /gagal dimuat/i.test(e.message)) {
          desc = Array.from({ length: 128 }, () => Math.round((Math.random() - 0.5) * 0.2 * 1e5) / 1e5);
          status('<div class="alert yellow" style="font-size:13px">' + icon('alert') + '<span><b>Mode demo:</b> model wajah tidak dapat dimuat (offline), deskriptor disimulasikan.</span></div>');
        } else status('<div class="alert bad" style="font-size:13px">' + icon('alert') + '<span>' + esc(e.message) + '</span></div>');
      }
      $d('#wSimpan').disabled = !desc;
    };
    $d('#wFile').addEventListener('change', async (e) => {
      try {
        Wajah.hentikan(stream); $d('#wVid').classList.add('hide'); $d('#wJepret').classList.add('hide');
        img = await UI.bacaFileGambar(e.target.files[0]);
        $d('#wImg').src = img.src; $d('#wImg').classList.remove('hide'); $d('#wMsg').classList.add('hide');
        proses(img);
      } catch (err) { UI.toast(err.message, 'bad'); }
    });
    $d('#wKam').addEventListener('click', async () => {
      try {
        $d('#wImg').classList.add('hide'); $d('#wMsg').classList.add('hide');
        const v = $d('#wVid'); v.classList.remove('hide');
        stream = await Wajah.kamera(v, true);
        $d('#wJepret').classList.remove('hide');
      } catch (err) { $d('#wMsg').classList.remove('hide'); $d('#wMsg').innerHTML = '<div>' + esc(err.message) + '</div>'; }
    });
    $d('#wJepret').addEventListener('click', () => {
      const v = $d('#wVid'), data = UI.kompres(v, 720, 0.9);
      Wajah.hentikan(stream); v.classList.add('hide'); $d('#wJepret').classList.add('hide');
      img = new Image(); img.onload = () => proses(img); img.src = data;
      $d('#wImg').src = data; $d('#wImg').classList.remove('hide');
    });
    $d('#wSimpan').addEventListener('click', (e) => UI.sibuk(e.currentTarget, async () => {
      try {
        const r = await API.api('pegawai.wajah', { id: p.ID_Pegawai, foto: UI.kompres(img, 640, 0.85), deskriptor: desc });
        Store.upsert('pegawai', [r], 'ID_Pegawai'); dw.tutup(); App.segarkan(true);
        UI.toast('Foto referensi ' + p.Nama + ' tersimpan.', 'ok');
      } catch (err) { UI.toast(err.message, 'bad'); }
    }));
  });

  /* =================== KELOLA PENUGASAN =================== */
  App.halaman('penugasan', {
    judul: 'Kelola Penugasan', sub: 'Surat tugas, lokasi geofence & jadwal kerja', peran: 'ADMIN',
    render() {
      const f = App.st.png = App.st.png || { q: '', st: 'Semua', bulan: '' };
      const all = Store.d.penugasan, n = (s) => all.filter((p) => kat(p) === s).length;
      const chip = (s) => '<button class="chip' + (f.st === s ? ' on' : '') + '" data-aksi="pngChip" data-s="' + s + '">' + s + '<span class="n">' + (s === 'Semua' ? all.length : n(s)) + '</span></button>';
      const bulan = [...new Set(all.map((p) => p.Tgl_Mulai.slice(0, 7)))].sort().reverse();
      return '<div class="stack"><div class="card"><div class="toolbar"><div class="input-ic grow" style="min-width:220px">' + icon('search') + '<input class="input" placeholder="Cari no. surat, tujuan, lokasi, pegawai…" value="' + esc(f.q) + '" data-ubah="pngCari"></div>' +
        sel('pngF', 'bulan', f.bulan, [['', 'Semua bulan']].concat(bulan.map((b) => [b, UI.tgl(b + '-01', 'bulan')]))) +
        '<button class="btn btn-ghost" data-aksi="pngEkspor">' + icon('sheet') + 'Excel</button><button class="btn btn-primary" data-nav="#/penugasan/baru">' + icon('plus') + 'Buat Penugasan</button></div>' +
        '<div class="chips" style="margin-top:14px">' + ['Semua', 'Berjalan', 'Terjadwal', 'Draft', 'Selesai', 'Batal'].map(chip).join('') + '</div></div>' +
        '<div class="card pad-0">' + UI.tabel('pngTbl', {
          data: filterPng(f), kunci: 'ID_Penugasan', satuan: 'penugasan', sortAwal: 'Tgl_Mulai', dirAwal: -1, klik: (id) => App.go('#/penugasan/' + id),
          kolom: [
            { k: 'No_Surat_Tugas', l: 'Surat Tugas & Tujuan', r: (p) => '<div class="cell-main" style="color:var(--primary-ink)">' + esc(p.No_Surat_Tugas) + '</div><div class="cell-sub" style="max-width:260px">' + esc(p.Tujuan) + '</div>' },
            { k: 'ID_Pegawai', l: 'Pegawai', nilai: (p) => App.peg(p.ID_Pegawai).Nama, r: (p) => { const g = App.peg(p.ID_Pegawai); return '<div class="who">' + UI.avatar(g.Nama, 'sm') + '<div><div class="cell-main" style="font-size:13px">' + esc(g.Nama) + '</div><div class="cell-sub">' + esc(g.Jabatan || '') + '</div></div></div>'; } },
            { k: 'Nama_Lokasi', l: 'Lokasi', r: (p) => '<div style="font-size:13px">' + esc(p.Nama_Lokasi) + '</div><div class="cell-sub">Radius ' + p.Radius_Meter + ' m</div>' },
            { k: 'Tgl_Mulai', l: 'Tanggal', r: (p) => '<div class="cell-main nowrap" style="font-size:13px">' + UI.periode(p.Tgl_Mulai, p.Tgl_Selesai) + '</div><div class="cell-sub">' + App.hariDinas(p) + ' hari</div>' },
            { k: 'Jam_Masuk', l: 'Jam Kerja', r: (p) => '<span class="tnum">' + esc(p.Jam_Masuk) + '–' + esc(p.Jam_Pulang) + '</span><div class="cell-sub">tol. ' + p.Toleransi_Menit + ' mnt</div>' },
            { k: 'Status', l: 'Status', nilai: kat, r: (p) => badge(kat(p)) },
            { k: '', l: 'Aksi', sort: false, r: (p) => '<div class="acts"><button class="btn btn-icon" title="Detail" aria-label="Detail" data-nav="#/penugasan/' + p.ID_Penugasan + '">' + icon('eye', 'sm') + '</button><button class="btn btn-icon" title="Ubah" aria-label="Ubah" data-nav="#/penugasan/' + p.ID_Penugasan + '/ubah">' + icon('edit', 'sm') + '</button></div>' }
          ],
          kosong: UI.empty('clipboard', 'Belum ada penugasan', 'Buat surat tugas pertama dan tentukan titik geofence lokasi.', '<button class="btn btn-primary" data-nav="#/penugasan/baru">' + icon('plus') + 'Buat penugasan</button>')
        }) + '</div></div>';
    }
  });
  const kat = (p) => { const s = App.statusPng(p); return s; };
  function filterPng(f) {
    const q = f.q.trim().toLowerCase();
    return Store.d.penugasan.filter((p) => (f.st === 'Semua' || kat(p) === f.st) && (!f.bulan || p.Tgl_Mulai.slice(0, 7) === f.bulan) &&
      (!q || (p.No_Surat_Tugas + ' ' + p.Tujuan + ' ' + p.Nama_Lokasi + ' ' + App.peg(p.ID_Pegawai).Nama).toLowerCase().includes(q)));
  }
  App.aksi('pngChip', (b) => { App.st.png.st = b.dataset.s; UI.tabelReset('pngTbl'); App.segarkan(true); });
  App.ubah('pngCari', UI.debounce((el) => { App.st.png.q = el.value; UI.tabelReset('pngTbl'); UI.tabelData('pngTbl', filterPng(App.st.png)); }, 120));
  App.ubah('pngF', (el) => { App.st.png[el.dataset.k] = el.value; UI.tabelReset('pngTbl'); UI.tabelData('pngTbl', filterPng(App.st.png)); });
  App.aksi('pngEkspor', () => UI.eksporExcel('Data_Penugasan', [{ l: 'ID', k: 'ID_Penugasan' }, { l: 'No Surat Tugas', k: 'No_Surat_Tugas' }, { l: 'Pegawai', v: (p) => App.peg(p.ID_Pegawai).Nama },
    { l: 'NIP', v: (p) => App.peg(p.ID_Pegawai).NIP }, { l: 'Tujuan', k: 'Tujuan' }, { l: 'Lokasi', k: 'Nama_Lokasi' }, { l: 'Latitude', k: 'Latitude' }, { l: 'Longitude', k: 'Longitude' }, { l: 'Radius (m)', k: 'Radius_Meter' },
    { l: 'Tgl Mulai', k: 'Tgl_Mulai' }, { l: 'Tgl Selesai', k: 'Tgl_Selesai' }, { l: 'Hari', v: (p) => App.hariDinas(p) }, { l: 'Jam Masuk', k: 'Jam_Masuk' }, { l: 'Jam Pulang', k: 'Jam_Pulang' }, { l: 'Tarif Harian', k: 'Tarif_Harian' }, { l: 'Status', v: kat }], filterPng(App.st.png), 'Penugasan'));
  App.aksi('pngStatus', async (b) => {
    const p = Store.penugasan(b.dataset.id), s = b.dataset.status;
    const teks = { Aktif: 'Penugasan aktif dan notifikasi dikirim ke pegawai.', Selesai: 'Penugasan ditandai selesai; presensi tidak dapat dilakukan lagi.', Batal: 'Penugasan dibatalkan; tidak dihitung dalam rekap SPPD.' }[s];
    if (!(await UI.konfirmasi('Ubah status menjadi ' + s + '?', teks, { bahaya: s === 'Batal', ya: 'Ya, ' + s.toLowerCase() }))) return;
    UI.sibuk(b, async () => {
      try {
        const r = await API.api('penugasan.status', { id: p.ID_Penugasan, status: s });
        Store.upsert('penugasan', r.penugasan, 'ID_Penugasan'); Store.upsert('rekap', r.rekap, 'ID_Penugasan');
        UI.toast('Status penugasan: ' + s + '.', 'ok'); App.segarkan(true);
      } catch (e) { UI.toast(e.message, 'bad'); }
    });
  });

  /* Form penugasan (baru / ubah) */
  App.halaman('penugasan-form', {
    judul: (pm) => (pm[0] === 'baru' ? 'Buat Penugasan Baru' : 'Ubah Penugasan'), sub: 'Surat tugas, titik geofence & jadwal kerja', peran: 'ADMIN', segarkan: false,
    render(pm) {
      const baru = pm[0] === 'baru', p = baru ? null : Store.penugasan(pm[0]);
      if (!baru && !p) return '<div class="card">' + UI.empty('search', 'Penugasan tidak ditemukan', '') + '</div>';
      const t = App.hariIni();
      const F = App.st.form = baru ? (App.st.formBaru && App.st.formBaru._ok ? App.st.formBaru : {
        pegawaiIds: [], No_Surat_Tugas: '', Pemberi_Perintah: '', Tujuan: '', Nama_Lokasi: '', Alamat: '', Latitude: '', Longitude: '',
        Radius_Meter: +App.s('RADIUS_DEFAULT', 100), Tgl_Mulai: t, Tgl_Selesai: UI.tambahHari(t, 2), Jam_Masuk: App.s('JAM_MASUK_DEFAULT', '08:00'), Jam_Pulang: App.s('JAM_PULANG_DEFAULT', '17:00'),
        Toleransi_Menit: +App.s('TOLERANSI_DEFAULT', 15), Tarif_Harian: 0, Status: 'Aktif', Catatan: '', _ok: true
      }) : Object.assign({}, p);
      if (baru) App.st.formBaru = F;
      const inp = (k, l, attr, cls) => '<div class="field ' + (cls || '') + '"><label for="p_' + k + '">' + esc(l) + '</label><input class="input" id="p_' + k + '" value="' + esc(F[k]) + '" data-ubah="frm" data-k="' + k + '" ' + (attr || '') + '></div>';
      return '<div class="stack"><div class="row between wrap"><button class="link" data-nav="' + (baru ? '#/penugasan' : '#/penugasan/' + p.ID_Penugasan) + '">' + icon('left', 'sm') + 'Kembali</button>' + (baru ? '' : badge(App.statusPng(p))) + '</div>' +
        '<div class="split"><div class="card"><div class="card-h"><div class="row"><span class="ic-tile">' + icon('clipboard') + '</span><div><h2>Data Surat Tugas</h2><div class="sub">Satu surat tugas bisa untuk beberapa pegawai</div></div></div></div><div class="form-grid">' +
        (baru ? '<div class="field full"><label>Pegawai yang ditugaskan</label><div class="pick" id="pickPeg">' + pickTags(F.pegawaiIds) + '<input placeholder="Ketik nama pegawai…" data-ubah="pickCari" aria-label="Cari pegawai"></div><div id="pickList"></div></div>'
          : '<div class="field full"><label>Pegawai</label><div class="li">' + UI.avatar(App.peg(p.ID_Pegawai).Nama, 'sm') + '<b>' + esc(App.peg(p.ID_Pegawai).Nama) + '</b></div></div>') +
        inp('No_Surat_Tugas', 'Nomor surat tugas', 'placeholder="ST-' + t.slice(0, 4) + '/XI/0001"') + inp('Pemberi_Perintah', 'Pemberi perintah', 'placeholder="Kepala Biro…"') +
        '<div class="field full"><label for="p_Tujuan">Tujuan / kegiatan</label><textarea class="textarea" style="min-height:64px" id="p_Tujuan" data-ubah="frm" data-k="Tujuan" placeholder="Contoh: Audit & Koordinasi Lapangan">' + esc(F.Tujuan) + '</textarea></div>' +
        inp('Tgl_Mulai', 'Tanggal mulai', 'type="date"') + inp('Tgl_Selesai', 'Tanggal selesai', 'type="date"') +
        '<div class="full" id="infoHari"></div>' +
        inp('Jam_Masuk', 'Jam masuk', 'type="time"') + inp('Jam_Pulang', 'Jam pulang', 'type="time"') +
        inp('Toleransi_Menit', 'Toleransi terlambat (menit)', 'type="number" min="0" max="240"') + inp('Tarif_Harian', 'Tarif uang harian (Rp)', 'type="number" min="0" step="1000"') +
        '<div class="field full"><label>Status</label><div class="chips">' + (baru ? ['Aktif', 'Draft'] : ['Aktif', 'Draft', 'Selesai', 'Batal']).map((s) => '<button type="button" class="chip' + (F.Status === s ? ' on' : '') + '" data-aksi="frmStatus" data-s="' + s + '">' + s + '</button>').join('') + '</div>' +
        '<span class="hint">Aktif = pegawai menerima notifikasi & bisa presensi. Draft = disimpan tanpa notifikasi.</span></div>' +
        '<div class="field full"><label for="p_Catatan">Catatan (opsional)</label><input class="input" id="p_Catatan" value="' + esc(F.Catatan) + '" data-ubah="frm" data-k="Catatan"></div></div></div>' +
        '<div class="stack"><div class="card"><div class="card-h"><div class="row"><span class="ic-tile green">' + icon('pin') + '</span><div><h2>Titik Lokasi & Geofence</h2><div class="sub">Klik peta atau geser pin untuk menentukan titik</div></div></div></div>' +
        '<div class="form-grid" style="margin-bottom:12px">' + inp('Nama_Lokasi', 'Nama lokasi', 'placeholder="Kantor Gubernur …"', 'full') + inp('Alamat', 'Alamat', '', 'full') + '</div>' +
        '<div class="row" style="gap:8px;margin-bottom:12px"><div class="input-ic grow">' + icon('search') + '<input class="input" id="cariAlamat" placeholder="Cari alamat di peta…"></div><button class="btn btn-ghost" data-aksi="cariAlamat">Cari</button><button class="btn btn-soft" data-aksi="lokasiSaya" title="Gunakan lokasi saya">' + icon('cross') + '<span class="hide-m">Lokasi saya</span></button></div><div id="hasilAlamat"></div>' +
        '<div class="map" id="petaForm"></div>' +
        '<div class="form-grid" style="margin-top:12px">' + inp('Latitude', 'Lintang (latitude)', 'inputmode="decimal" placeholder="-6.99306"') + inp('Longitude', 'Bujur (longitude)', 'inputmode="decimal" placeholder="110.42083"') +
        '<div class="field full"><label for="p_Radius_Meter">Radius geofence: <b id="radVal" style="color:var(--primary-ink)">' + F.Radius_Meter + ' m</b></label><input type="range" class="range" min="20" max="1000" step="10" id="p_Radius_Meter" value="' + F.Radius_Meter + '" data-ubah="frm" data-k="Radius_Meter"><span class="hint">Pegawai hanya bisa presensi di dalam radius ini. Disarankan 50–150 m untuk gedung.</span></div></div></div>' +
        '<div class="card" style="background:var(--primary-50);border-color:var(--primary-100)" id="ringkasForm"></div>' +
        '<div class="row" style="gap:10px;justify-content:flex-end;flex-wrap:wrap"><button class="btn btn-ghost" data-nav="' + (baru ? '#/penugasan' : '#/penugasan/' + p.ID_Penugasan) + '">Batal</button>' +
        (baru ? '<button class="btn btn-ghost" data-aksi="simpanPng" data-draft="1">' + icon('file') + 'Simpan Draft</button><button class="btn btn-primary btn-lg" data-aksi="simpanPng">' + icon('send') + 'Terbitkan Penugasan</button>'
          : '<button class="btn btn-primary btn-lg" data-aksi="simpanPng">' + icon('check') + 'Simpan Perubahan</button>') + '</div></div></div></div>';
    },
    mount() {
      const F = App.st.form;
      ringkas();
      Geo.peta(UI.$('#petaForm'), { lat: +F.Latitude, lng: +F.Longitude, radius: +F.Radius_Meter, pilih: true, onPilih: (lat, lng) => setKoord(lat, lng, false) }).then((m) => { App.st.petaForm = m; });
    }
  });
  const pickTags = (ids) => ids.map((id) => '<span class="tag">' + esc(App.peg(id).Nama.split(',')[0]) + '<button type="button" data-aksi="pickHapus" data-id="' + id + '" aria-label="Hapus">' + icon('x', 'sm') + '</button></span>').join('');
  function setKoord(lat, lng, geser) {
    const F = App.st.form;
    F.Latitude = Math.round(lat * 1e6) / 1e6; F.Longitude = Math.round(lng * 1e6) / 1e6;
    UI.$('#p_Latitude').value = F.Latitude; UI.$('#p_Longitude').value = F.Longitude;
    if (App.st.petaForm) App.st.petaForm.setPos(F.Latitude, F.Longitude, geser);
    ringkas();
  }
  function ringkas() {
    const F = App.st.form, el = UI.$('#ringkasForm'), info = UI.$('#infoHari');
    if (!F || !el) return;
    const ok = F.Tgl_Mulai && F.Tgl_Selesai && F.Tgl_Selesai >= F.Tgl_Mulai, n = ok ? UI.selisihHari(F.Tgl_Mulai, F.Tgl_Selesai) + 1 : 0;
    const peg = F.pegawaiIds ? F.pegawaiIds.length : 1;
    info.innerHTML = ok ? '<span class="badge info">' + icon('cal', 'sm') + 'Jumlah hari dinas: ' + n + ' hari</span> <span class="formula">(' + F.Tgl_Selesai + ' − ' + F.Tgl_Mulai + ') + 1</span>' : '<span class="badge bad">Tanggal selesai harus ≥ tanggal mulai</span>';
    el.innerHTML = '<b class="row" style="gap:8px">' + icon('money', 'sm') + 'Ringkasan</b><dl class="kv" style="margin-top:10px"><dt>Pegawai</dt><dd>' + peg + ' orang</dd><dt>Hari dinas</dt><dd>' + n + ' hari</dd><dt>Batas datang</dt><dd>' + esc(UI.jamDariMenit(UI.menit(F.Jam_Masuk) + (+F.Toleransi_Menit || 0))) + ' WIB</dd>' +
      '<dt>Titik</dt><dd class="mono">' + (F.Latitude !== '' && F.Longitude !== '' ? esc(F.Latitude) + ', ' + esc(F.Longitude) : '<span style="color:var(--danger)">belum dipilih</span>') + '</dd><dt>Estimasi uang harian</dt><dd style="color:var(--primary-ink)">' + rupiah(n * (+F.Tarif_Harian || 0) * peg) + '</dd></dl>';
  }
  App.ubah('frm', (el) => {
    const F = App.st.form, k = el.dataset.k;
    F[k] = el.type === 'number' || el.type === 'range' ? (el.value === '' ? '' : +el.value) : el.value;
    if (k === 'Radius_Meter') { UI.$('#radVal').textContent = el.value + ' m'; if (App.st.petaForm) App.st.petaForm.setRadius(+el.value); }
    if ((k === 'Latitude' || k === 'Longitude') && isFinite(+F.Latitude) && isFinite(+F.Longitude) && F.Latitude !== '' && F.Longitude !== '' && App.st.petaForm) App.st.petaForm.setPos(+F.Latitude, +F.Longitude, true);
    ringkas();
  });
  App.aksi('frmStatus', (b) => { App.st.form.Status = b.dataset.s; UI.$$('[data-aksi="frmStatus"]').forEach((x) => x.classList.toggle('on', x === b)); });
  App.ubah('pickCari', (el) => {
    const q = el.value.trim().toLowerCase(), F = App.st.form, box = UI.$('#pickList');
    if (!q) { box.innerHTML = ''; return; }
    const hasil = Store.d.pegawai.filter((p) => p.Status === 'Aktif' && !F.pegawaiIds.includes(p.ID_Pegawai) && (p.Nama + ' ' + p.NIP + ' ' + p.Jabatan).toLowerCase().includes(q)).slice(0, 8);
    box.innerHTML = '<div class="pick-list">' + (hasil.length ? hasil.map((p) => '<button type="button" data-aksi="pickTambah" data-id="' + p.ID_Pegawai + '">' + UI.avatar(p.Nama, 'sm') + '<span><b style="font-size:13px;display:block">' + esc(p.Nama) + '</b><small class="muted">' + esc(p.Jabatan) + (p.Punya_Wajah ? '' : ' · <span style="color:var(--warning-ink)">wajah belum terdaftar</span>') + '</small></span></button>').join('') : '<div class="muted" style="padding:10px">Tidak ditemukan.</div>') + '</div>';
  });
  App.aksi('pickTambah', (b) => { const F = App.st.form; F.pegawaiIds.push(b.dataset.id); UI.$('#pickPeg').innerHTML = pickTags(F.pegawaiIds) + '<input placeholder="Ketik nama pegawai…" data-ubah="pickCari" aria-label="Cari pegawai">'; UI.$('#pickList').innerHTML = ''; UI.$('#pickPeg input').focus(); ringkas(); });
  App.aksi('pickHapus', (b) => { const F = App.st.form; F.pegawaiIds = F.pegawaiIds.filter((x) => x !== b.dataset.id); UI.$('#pickPeg').innerHTML = pickTags(F.pegawaiIds) + '<input placeholder="Ketik nama pegawai…" data-ubah="pickCari" aria-label="Cari pegawai">'; ringkas(); });
  App.aksi('lokasiSaya', (b) => UI.sibuk(b, async () => {
    try { const g = await Geo.sekali(); setKoord(g.lat, g.lng, true); UI.toast('Titik diatur ke lokasi Anda (±' + g.akurasi + ' m).', 'ok'); } catch (e) { UI.toast(Geo.pesan(e), 'bad'); }
  }));
  App.aksi('cariAlamat', (b) => UI.sibuk(b, async () => {
    const q = UI.$('#cariAlamat').value.trim(), box = UI.$('#hasilAlamat');
    if (q.length < 3) return UI.toast('Ketik minimal 3 huruf.', 'warn');
    try {
      const r = await Geo.cariAlamat(q);
      App.st.alamat = r;
      box.innerHTML = '<div class="pick-list" style="margin:0 0 12px">' + (r.length ? r.map((x, i) => '<button type="button" data-aksi="pilihAlamat" data-i="' + i + '">' + icon('pin', 'sm') + '<span style="font-size:13px">' + esc(x.nama) + '</span></button>').join('') : '<div class="muted" style="padding:10px">Alamat tidak ditemukan.</div>') + '</div>';
    } catch (e) { UI.toast(e.message + ' Isi koordinat manual.', 'bad'); }
  }));
  App.aksi('pilihAlamat', (b) => {
    const x = App.st.alamat[+b.dataset.i], F = App.st.form;
    setKoord(x.lat, x.lng, true);
    if (!F.Alamat) { F.Alamat = x.nama.split(',').slice(0, 3).join(','); UI.$('#p_Alamat').value = F.Alamat; }
    UI.$('#hasilAlamat').innerHTML = '';
  });
  App.aksi('simpanPng', (b) => UI.sibuk(b, async () => {
    const F = Object.assign({}, App.st.form);
    if (b.dataset.draft) F.Status = 'Draft';
    if (F.pegawaiIds && !F.pegawaiIds.length) return UI.toast('Pilih minimal satu pegawai.', 'warn');
    if (F.Latitude === '' || F.Longitude === '') return UI.toast('Tentukan titik lokasi di peta atau isi lintang/bujur.', 'warn');
    if (F.pegawaiIds) { const tanpaWajah = F.pegawaiIds.filter((id) => !App.peg(id).Punya_Wajah); if (tanpaWajah.length && F.Status === 'Aktif') UI.toast(tanpaWajah.length + ' pegawai belum punya foto wajah — mereka belum bisa presensi.', 'warn'); }
    delete F._ok;
    try {
      const r = await API.api('penugasan.simpan', F);
      Store.upsert('penugasan', r.penugasan, 'ID_Penugasan'); Store.upsert('rekap', r.rekap, 'ID_Penugasan');
      App.st.formBaru = null;
      UI.toast(F.ID_Penugasan ? 'Perubahan disimpan.' : r.penugasan.length + ' penugasan ' + (F.Status === 'Aktif' ? 'diterbitkan, notifikasi masuk antrean.' : 'disimpan sebagai draft.'), 'ok');
      App.go(r.penugasan.length === 1 ? '#/penugasan/' + r.penugasan[0].ID_Penugasan : '#/penugasan');
    } catch (e) { UI.toast(e.message, 'bad', 'Belum tersimpan'); }
  }));

  /* =================== PEMANTAUAN PRESENSI =================== */
  App.halaman('pemantauan', {
    judul: 'Pemantauan Presensi', sub: 'Verifikasi kehadiran dinas secara real-time', peran: 'ADMIN',
    render(pm, q) {
      const t = App.hariIni(), jd = Store.d.jendela;
      const f = App.st.pan = App.st.pan || { dari: UI.tambahHari(t, -6), sampai: t, lokasi: '', ver: '', q: '', chip: 'Semua' };
      if (q.f === 'tinjau' && !App.st.panQ) { f.chip = 'Perlu Tinjauan'; f.dari = jd.dari; App.st.panQ = 1; }
      const sumber = App.st.pantauLama && App.st.pantauLama.kunci === f.dari + f.sampai ? App.st.pantauLama.rows : Store.d.presensi;
      const dasar = sumber.filter((r) => r.Tanggal >= f.dari && r.Tanggal <= f.sampai && (!f.lokasi || (Store.penugasan(r.ID_Penugasan) || {}).Nama_Lokasi === f.lokasi) && (!f.ver || r.Verifikasi === f.ver) &&
        (!f.q || (App.peg(r.ID_Pegawai).Nama + ' ' + App.peg(r.ID_Pegawai).NIP + ' ' + (Store.penugasan(r.ID_Penugasan) || {}).No_Surat_Tugas).toLowerCase().includes(f.q.toLowerCase())));
      const cnt = (s) => dasar.filter((r) => (s === 'Perlu Tinjauan' ? r.Verifikasi === s : r.Status === s)).length;
      const rows = f.chip === 'Semua' ? dasar : dasar.filter((r) => (f.chip === 'Perlu Tinjauan' ? r.Verifikasi === f.chip : r.Status === f.chip));
      App.st.panRows = rows;
      const lokasi = [...new Set(Store.d.penugasan.map((p) => p.Nama_Lokasi))].sort();
      const tinjau = Store.d.presensi.filter((r) => r.Verifikasi === 'Perlu Tinjauan').length;
      const pv = dasar.filter(valid), rerataSkor = pv.length ? pv.reduce((s, r) => s + +r.Skor_Wajah, 0) / pv.length : 0;
      const dekat = pv.filter((r) => +r.Jarak_Meter <= (+(Store.penugasan(r.ID_Penugasan) || {}).Radius_Meter || 100) / 2).length;
      const luar = f.dari < jd.dari && !(App.st.pantauLama && App.st.pantauLama.kunci === f.dari + f.sampai);
      const chip = (s, warna) => '<button class="chip' + (f.chip === s ? (s === 'Perlu Tinjauan' ? ' warnchip' : ' on') : '') + '" data-aksi="panChip" data-s="' + s + '">' + (warna ? '<i class="bd" style="background:' + warna + '"></i>' : '') + s + '<span class="n">' + (s === 'Semua' ? dasar.length : cnt(s)) + '</span></button>';
      return '<div class="stack"><div class="page-h"><div><div class="crumbs">' + esc(App.s('NAMA_APLIKASI', 'SIPERDIN')) + ' ' + icon('chr', 'sm') + ' Pemantauan Lapangan ' + icon('chr', 'sm') + ' <b>Pemantauan Presensi</b></div></div>' +
        '<div class="row wrap" style="gap:8px"><span class="badge ok"><i class="live-dot"></i>Live GPS & Biometrik</span><span class="badge gray">Server <b class="mono" data-jam style="margin-left:4px">' + Jam.wib().jam + '</b>&nbsp;WIB</span></div></div>' +
        '<div class="page-h"><div class="title"><span class="ic-tile">' + icon('radar') + '</span><div><h1>Pemantauan Presensi Real-Time</h1><p>Verifikasi kehadiran dinas berdasarkan geofencing GPS, skor kecocokan wajah, dan stempel waktu server WIB.</p></div></div>' +
        '<div class="actions"><button class="btn btn-ghost" data-aksi="panEkspor" data-t="xlsx">' + icon('sheet') + 'Unduh Excel</button><button class="btn btn-ghost" data-aksi="panEkspor" data-t="pdf">' + icon('printer') + 'Unduh PDF</button><button class="btn btn-primary" data-aksi="muatUlang">' + icon('refresh') + 'Muat Ulang</button></div></div>' +
        '<div class="card"><div class="grid g4" style="gap:14px"><div class="field"><label>Rentang tanggal</label><div class="row" style="gap:6px"><input type="date" class="input" value="' + f.dari + '" data-ganti="panF" data-k="dari" aria-label="Dari"><input type="date" class="input" value="' + f.sampai + '" data-ganti="panF" data-k="sampai" aria-label="Sampai"></div></div>' +
        '<div class="field"><label>Lokasi penugasan</label>' + sel('panF', 'lokasi', f.lokasi, [['', 'Semua lokasi']].concat(lokasi.map((l) => [l, l]))).replace('width:auto;min-width:150px', 'width:100%') + '</div>' +
        '<div class="field"><label>Status validasi</label>' + sel('panF', 'ver', f.ver, [['', 'Semua status'], ['Otomatis', 'Otomatis'], ['Perlu Tinjauan', 'Perlu tinjauan'], ['Disetujui', 'Disetujui'], ['Ditolak', 'Ditolak']]).replace('width:auto;min-width:150px', 'width:100%') + '</div>' +
        '<div class="field"><label>Pencarian data</label><div class="input-ic">' + icon('search') + '<input class="input" placeholder="Nama, NIP, atau No. ST…" value="' + esc(f.q) + '" data-ubah="panCari"></div></div></div>' +
        '<div class="row between wrap" style="margin-top:14px;gap:10px"><div class="chips">' + chip('Semua') + chip('Tepat Waktu', '#16A34A') + chip('Terlambat', '#F59E0B') + chip('Pulang Cepat', '#DC2626') + chip('Perlu Tinjauan') + '</div><button class="link" data-aksi="panReset">Reset filter</button></div>' +
        (luar ? '<div class="alert info" style="margin-top:12px;font-size:13px">' + icon('info') + '<span class="grow">Rentang melewati ' + jd.hari + ' hari data otomatis (' + tgl(jd.dari) + ').</span><button class="btn btn-sm btn-primary" data-aksi="panMuatLama">Muat dari server</button></div>' : '') + '</div>' +
        (tinjau ? '<div class="alert warn"><div class="ic-tile">' + icon('alert') + '</div><div class="grow"><b>Peringatan: ' + tinjau + ' presensi memerlukan verifikasi manual</b><div style="font-size:12.5px;color:var(--muted)">Skor wajah mendekati ambang (' + App.s('AMBANG_WAJAH', 75) + '%), akurasi GPS rendah, atau pulang tanpa datang.</div></div><button class="btn btn-dark" data-aksi="panChip" data-s="Perlu Tinjauan" data-semua="1">Buka antrean verifikasi ' + icon('right', 'sm') + '</button></div>' : '') +
        '<div class="card pad-0"><div class="row between wrap" style="padding:18px 20px"><div><h2>Catatan Presensi Terkini</h2><div class="muted" style="font-size:12.5px">Sinkron otomatis tiap 15 detik selama halaman terbuka</div></div><span class="row muted" style="font-size:12.5px;gap:6px">Status geofence: ' + badge('Radius aktif', 'ok') + '</span></div>' +
        tabelPresensi('panTbl', rows, { kosong: 'Tidak ada presensi untuk filter ini.' }) + '</div>' +
        '<div class="grid g3">' +
        '<div class="card stat-card"><div class="row"><span class="ic-tile green">' + icon('pin') + '</span><div class="grow"><b>Kepatuhan geofence</b><div class="cell-sub">Dalam setengah radius lokasi</div></div><span class="big" style="color:var(--success-ink)">' + UI.pct(dekat, pv.length, 1) + '%</span></div>' + UI.progress(UI.pct(dekat, pv.length), 'green') + '<p class="muted" style="font-size:12.5px;margin-top:10px">' + dekat + ' dari ' + pv.length + ' presensi berada dekat titik penugasan.</p></div>' +
        '<div class="card stat-card"><div class="row"><span class="ic-tile">' + icon('face') + '</span><div class="grow"><b>Rerata skor biometrik</b><div class="cell-sub">Ambang minimal ' + App.s('AMBANG_WAJAH', 75) + '%</div></div><span class="big">' + angka(rerataSkor, 1) + '%</span></div>' + UI.progress(rerataSkor) + '<p class="muted" style="font-size:12.5px;margin-top:10px">Skor dihitung ulang di server dari deskriptor wajah 128 titik.</p></div>' +
        '<div class="card stat-card"><div class="row"><span class="ic-tile violet">' + icon('clock') + '</span><div class="grow"><b>Integritas jam server</b><div class="cell-sub">Zona Asia/Jakarta</div></div>' + badge('Sinkron', 'ok') + '</div><dl class="kv"><dt>Selisih jam perangkat</dt><dd>' + angka(Math.abs(Jam.offset) / 1000, 1) + ' dtk</dd><dt>Latensi API terakhir</dt><dd>' + (API.stat.terakhir || '—') + ' ms</dd></dl>' +
        '<p class="muted" style="font-size:12.5px;margin-top:10px">Semua presensi memakai jam server, bukan jam ponsel pegawai.</p></div></div></div>';
    },
    mount(pm, q) {
      pantauLangsung();
      if (q.tinjau && Store.idx.presensi[q.tinjau]) setTimeout(() => detailPresensi(q.tinjau), 50);
    }
  });
  App.aksi('panChip', (b) => { App.st.pan.chip = b.dataset.s; if (b.dataset.semua) { App.st.pan.dari = Store.d.jendela.dari; App.st.pan.ver = ''; } UI.tabelReset('panTbl'); App.segarkan(true); });
  App.ubah('panF', (el) => { App.st.pan[el.dataset.k] = el.value; UI.tabelReset('panTbl'); App.segarkan(true); });
  App.ubah('panCari', UI.debounce((el) => { App.st.pan.q = el.value; UI.tabelReset('panTbl'); App.segarkan(true); setTimeout(() => { const i = UI.$('[data-ubah="panCari"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 0); }, 250));
  App.aksi('panReset', () => { App.st.pan = null; UI.tabelReset('panTbl'); App.segarkan(true); });
  App.aksi('panMuatLama', (b) => UI.sibuk(b, async () => {
    const f = App.st.pan;
    try { const pack = await API.api('presensi.list', { dari: f.dari, sampai: f.sampai }); App.st.pantauLama = { kunci: f.dari + f.sampai, rows: Store.presensiKompak(pack) }; App.segarkan(true); }
    catch (e) { UI.toast(e.message, 'bad'); }
  }));
  App.aksi('panEkspor', (b) => {
    const f = App.st.pan, rows = App.st.panRows || [], nama = 'Presensi_' + f.dari + '_sd_' + f.sampai;
    if (b.dataset.t === 'xlsx') UI.eksporExcel(nama, window.K.kolomEksporPresensi(), rows, 'Presensi');
    else UI.eksporPdf(nama, 'Laporan Pemantauan Presensi', UI.periode(f.dari, f.sampai) + ' · ' + rows.length + ' presensi · filter: ' + f.chip + (f.lokasi ? ' · ' + f.lokasi : ''), window.K.kolomEksporPresensi().filter((c) => !/Catatan|NIP/.test(c.l)), rows);
  });

  /* =================== REKAP SPPD =================== */
  App.halaman('rekap', {
    judul: 'Rekap SPPD', sub: 'Hari dinas & dasar pembayaran SPPD', peran: 'ADMIN',
    render() {
      const f = App.st.rek = App.st.rek || { bulan: '', unit: '', status: '', q: '' };
      const semua = Store.d.rekap.filter((r) => { const p = Store.penugasan(r.ID_Penugasan); return p && p.Status !== 'Draft'; });
      const rows = semua.filter((r) => {
        const p = Store.penugasan(r.ID_Penugasan), g = App.peg(r.ID_Pegawai);
        return (!f.bulan || r.Tgl_Mulai.slice(0, 7) === f.bulan || r.Tgl_Selesai.slice(0, 7) === f.bulan) && (!f.unit || g.Unit_Kerja === f.unit) && (!f.status || window.K.statusSppd(r, p) === f.status) &&
          (!f.q || (r.No_Surat_Tugas + ' ' + g.Nama + ' ' + g.NIP + ' ' + p.Tujuan).toLowerCase().includes(f.q.toLowerCase()));
      });
      App.st.rekRows = rows;
      const sum = (k) => rows.reduce((s, r) => s + (+r[k] || 0), 0);
      const lewat = rows.filter((r) => r.Tgl_Selesai < App.hariIni());
      const hariLewat = lewat.reduce((s, r) => s + +r.Jumlah_Hari_Dinas, 0), lengkapLewat = lewat.reduce((s, r) => s + +r.Hari_Hadir_Lengkap, 0);
      const perlu = rows.filter((r) => window.K.statusSppd(r, Store.penugasan(r.ID_Penugasan)) === 'Perlu Verifikasi').length;
      const bulan = [...new Set(semua.map((r) => r.Tgl_Mulai.slice(0, 7)))].sort().reverse();
      const unit = [...new Set(Store.d.pegawai.map((g) => g.Unit_Kerja).filter(Boolean))].sort();
      const chip = (s) => '<button class="chip' + ((f.status || 'Semua') === s ? ' on' : '') + '" data-aksi="rekChip" data-s="' + s + '">' + s + '<span class="n">' + (s === 'Semua' ? semua.length : semua.filter((r) => window.K.statusSppd(r, Store.penugasan(r.ID_Penugasan)) === s).length) + '</span></button>';
      return '<div class="stack"><div class="page-h"><div class="title"><span class="ic-tile">' + icon('money') + '</span><div><h1>Rekapitulasi SPPD & Hari Dinas</h1><p>Jumlah hari dinas dihitung otomatis dengan rumus <span class="formula">(Tgl Selesai − Tgl Mulai) + 1</span> dan divalidasi presensi lengkap sebagai dasar pencairan SPPD.</p></div></div>' +
        '<div class="actions"><button class="btn btn-ghost" data-aksi="rekUlang">' + icon('refresh') + 'Hitung Ulang SPPD</button><button class="btn btn-ghost" data-aksi="rekEkspor" data-t="pdf">' + icon('printer') + 'Cetak SPPD Kolektif (PDF)</button><button class="btn btn-success" data-aksi="rekEkspor" data-t="xlsx">' + icon('sheet') + 'Ekspor Excel (.xlsx)</button></div></div>' +
        '<div class="grid g4">' + kpi('okc', '', rows.length + '<small>penugasan</small>', 'Total penugasan', icon('info', 'sm') + 'Sesuai filter, tanpa draft') +
        kpi('cal', 'green', '<span style="color:var(--primary-ink)">' + sum('Jumlah_Hari_Dinas') + '</span><small>hari</small>', 'Hari dinas terhitung', badge('Dasar SPPD', 'ok', false)) +
        kpi('shieldok', 'violet', angka(UI.pct(lengkapLewat, hariLewat, 1), 1) + '<small>%</small>', 'Presensi lengkap (datang & pulang)', lengkapLewat + ' dari ' + hariLewat + ' hari yang sudah lewat') +
        kpi('money', 'orange', '<span style="color:var(--primary-ink)">' + rupiahPendek(sum('Estimasi_Uang_Harian')) + '</span>', 'Estimasi uang harian', perlu ? icon('alert', 'sm') + perlu + ' perlu verifikasi' : icon('okc', 'sm') + 'Tidak ada anomali') + '</div>' +
        '<div class="card"><div class="grid g4" style="gap:14px"><div class="field"><label>Periode bulan</label>' + sel('rekF', 'bulan', f.bulan, [['', 'Semua periode']].concat(bulan.map((b) => [b, UI.tgl(b + '-01', 'bulan')]))).replace('width:auto;min-width:150px', 'width:100%') + '</div>' +
        '<div class="field"><label>Unit kerja</label>' + sel('rekF', 'unit', f.unit, [['', 'Semua unit']].concat(unit.map((u) => [u, u]))).replace('width:auto;min-width:150px', 'width:100%') + '</div>' +
        '<div class="field"><label>Status SPPD</label>' + sel('rekF', 'status', f.status, [['', 'Semua status'], ['Siap Dibayar', 'Siap dibayar'], ['Perlu Verifikasi', 'Perlu verifikasi'], ['Berjalan', 'Berjalan'], ['Terjadwal', 'Terjadwal'], ['Batal', 'Batal']]).replace('width:auto;min-width:150px', 'width:100%') + '</div>' +
        '<div class="field"><label>Pencarian cepat</label><div class="input-ic">' + icon('search') + '<input class="input" placeholder="No. ST, nama, NIP…" value="' + esc(f.q) + '" data-ubah="rekCari"></div></div></div>' +
        '<div class="row wrap" style="margin-top:14px;gap:8px"><span class="lbl-up">Ringkasan saringan:</span><div class="chips">' + ['Semua', 'Siap Dibayar', 'Berjalan', 'Perlu Verifikasi', 'Terjadwal'].map(chip).join('') + '</div></div></div>' +
        '<div class="card pad-0"><div style="padding:18px 20px"><h2>Daftar SPPD per penugasan</h2><div class="muted" style="font-size:12.5px">Klik baris untuk melihat validasi harian presensi & biometrik</div></div>' + window.K.tabelRekap('rekTbl', rows, true) + '</div>' +
        '<div class="card"><div class="row top"><span class="ic-tile">' + icon('info') + '</span><div><b>Catatan verifikator & ketentuan perhitungan hari dinas</b><p class="muted" style="font-size:13px;margin-top:4px">Jumlah hari dinas = <span class="formula">(Tgl Selesai − Tgl Mulai) + 1</span> hari kalender, termasuk hari pertama dan terakhir. ' +
        'Kolom <b>Hadir Lengkap</b> menghitung tanggal yang memiliki presensi datang dan pulang yang sah (tidak ditolak) sebagai pembanding bagi verifikator keuangan. Estimasi uang harian = hari dinas × tarif harian pada surat tugas. ' +
        'Filter yang aktif ikut diterapkan pada unduhan Excel & PDF. Rekap dihitung ulang otomatis setiap presensi dan setiap hari pukul 00:30 WIB.</p></div></div></div></div>';
    }
  });
  App.ubah('rekF', (el) => { App.st.rek[el.dataset.k] = el.value; UI.tabelReset('rekTbl'); App.segarkan(true); });
  App.aksi('rekChip', (b) => { App.st.rek.status = b.dataset.s === 'Semua' ? '' : b.dataset.s; UI.tabelReset('rekTbl'); App.segarkan(true); });
  App.ubah('rekCari', UI.debounce((el) => { App.st.rek.q = el.value; UI.tabelReset('rekTbl'); App.segarkan(true); setTimeout(() => { const i = UI.$('[data-ubah="rekCari"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 0); }, 250));
  App.aksi('rekUlang', (b) => UI.sibuk(b, async () => {
    try { const r = await API.api('rekap.hitungUlang', {}); Store.d.rekap = r.rekap; Store.reindex(); Store.simpanSnap(); App.segarkan(true); UI.toast(r.jumlah + ' rekap penugasan dihitung ulang (' + r.ms + ' ms).', 'ok'); }
    catch (e) { UI.toast(e.message, 'bad'); }
  }));
  App.aksi('rekEkspor', (b) => {
    const rows = App.st.rekRows || [], f = App.st.rek, nama = 'Rekap_SPPD' + (f.bulan ? '_' + f.bulan : '');
    if (b.dataset.t === 'xlsx') UI.eksporExcel(nama, window.K.kolomEksporRekap(), rows, 'Rekap SPPD');
    else UI.eksporPdf(nama, 'Rekap SPPD Kolektif — ' + App.s('NAMA_INSTANSI', ''), (f.bulan ? UI.tgl(f.bulan + '-01', 'bulan') : 'Semua periode') + ' · ' + rows.length + ' penugasan · total estimasi ' + rupiah(rows.reduce((s, r) => s + +r.Estimasi_Uang_Harian, 0)), window.K.kolomEksporRekap().filter((c) => !/Lokasi|Tarif|Tgl Selesai/.test(c.l)), rows);
  });

  /* =================== NOTIFIKASI WA & EMAIL =================== */
  App.halaman('notifikasi', {
    judul: 'Notifikasi WhatsApp & Email', sub: 'Fonnte API + MailApp · antrean non-blocking', peran: 'ADMIN',
    render() {
      const tab = App.st.notifTab = App.st.notifTab || 'atur', N = App.st.notif;
      const tabs = [['atur', 'sliders', 'Pengaturan'], ['antri', 'layers', 'Antrean'], ['blast', 'mega', 'Blast WA'], ['tes', 'send', 'Uji Kirim']];
      return '<div class="stack"><div class="tabs" role="tablist">' + tabs.map((t) => '<button role="tab" class="' + (tab === t[0] ? 'on' : '') + '" data-aksi="notifTab" data-t="' + t[0] + '">' + icon(t[1], 'sm') + t[2] + '</button>').join('') + '</div>' +
        (!N ? '<div class="stack">' + UI.skel(120) + UI.skel(300) + '</div>' : tab === 'atur' ? tabAtur(N) : tab === 'antri' ? tabAntri(N) : tab === 'blast' ? tabBlast(N) : tabTes()) + '</div>';
    },
    mount() { if (!App.st.notif || Date.now() - (App.st.notifT || 0) > 60e3) muatNotif(); }
  });
  async function muatNotif() {
    try { App.st.notif = await API.api('notif.info', {}); App.st.notifT = Date.now(); if (App.rute === 'notifikasi') App.segarkan(true); }
    catch (e) { UI.toast(e.message, 'bad'); }
  }
  App.aksi('notifTab', (b) => { App.st.notifTab = b.dataset.t; App.segarkan(true); });
  const sw = (aksi, k, on, dis) => '<label class="switch"><input type="checkbox" data-ganti="' + aksi + '" data-k="' + k + '"' + (on ? ' checked' : '') + (dis ? ' disabled' : '') + '><span></span></label>';
  function tabAtur(N) {
    const s = N.saklar;
    return '<div class="split"><div class="stack"><div class="card"><h2>Saklar kanal</h2><p class="muted" style="font-size:12.5px;margin-top:4px">Lapis pertama: mematikan kanal menghentikan semua notifikasi kanal tersebut.</p><div class="list" style="margin-top:14px">' +
      '<div class="li"><span class="ic-tile">' + icon('mail') + '</span><div class="grow"><b>Email (MailApp)</b><div class="cell-sub">Kuota ' + N.kuota.batas + '/hari · tersisa ' + N.kuota.sisa + '</div></div>' + sw('notifSak', 'NOTIF_EMAIL_AKTIF', s.NOTIF_EMAIL_AKTIF) + '</div>' +
      '<div class="li"><span class="ic-tile green">' + icon('wa') + '</span><div class="grow"><b>WhatsApp (Fonnte)</b><div class="cell-sub">' + (N.fonnte.ada ? 'Token: <span class="mono">' + esc(N.fonnte.samar) + '</span>' : '<span style="color:var(--danger)">Token belum diatur</span> — <button class="link" data-nav="#/sistem">atur di Info Sistem</button>') + '</div></div>' + sw('notifSak', 'NOTIF_WA_AKTIF', s.NOTIF_WA_AKTIF, !N.fonnte.ada) + '</div></div>' +
      '<div class="form-grid" style="margin-top:16px"><div class="field"><label>Jeda antar pesan WA (detik)</label><input class="input" type="number" min="1" max="30" value="' + s.WA_JEDA_DETIK + '" data-ganti="notifSak" data-k="WA_JEDA_DETIK"></div>' +
      '<div class="field"><label>Pesan WA per putaran</label><input class="input" type="number" min="1" max="50" value="' + s.WA_UKURAN_BATCH + '" data-ganti="notifSak" data-k="WA_UKURAN_BATCH"></div></div>' +
      '<p class="hint muted" style="font-size:12px;margin-top:8px">Trigger memproses antrean tiap 1 menit. Jeda acak melindungi nomor dari pemblokiran WhatsApp.</p></div>' +
      '<div class="card"><h3>Cara kerja (non-blocking)</h3><ol style="margin:10px 0 0;padding-left:18px;color:var(--ink-2);font-size:13px;display:flex;flex-direction:column;gap:6px"><li>Transaksi (presensi, penugasan) hanya menulis 1 baris ke sheet <span class="mono">AntrianNotif</span> — respons tetap instan.</li><li>Trigger <span class="mono">prosesAntrianNotif</span> mengirim WA ber-batch & email (cek kuota dulu).</li><li>Gagal dicoba ulang hingga 3 kali; kuota email habis → ditunda & admin diperingatkan via WA.</li></ol></div></div>' +
      '<div class="card pad-0"><div style="padding:18px 20px"><h2>Matriks kejadian</h2><p class="muted" style="font-size:12.5px">Lapis kedua: atur kanal per kejadian & ubah templat pesan.</p></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kejadian</th><th>WA</th><th>Email</th><th></th></tr></thead><tbody>' +
      N.events.map((e) => '<tr><td><div class="cell-main">' + esc(e.label) + '</div><div class="cell-sub mono">' + esc(e.kode) + '</div></td><td>' + sw('notifMat', e.kode + '|wa', e.wa) + '</td><td>' + sw('notifMat', e.kode + '|email', e.email) + '</td><td class="right"><button class="btn btn-sm btn-ghost" data-aksi="notifTpl" data-k="' + e.kode + '">' + icon('edit', 'sm') + 'Templat</button></td></tr>').join('') +
      '</tbody></table></div><div class="row" style="padding:16px 20px;justify-content:flex-end"><button class="btn btn-primary" data-aksi="notifSimpan">' + icon('check') + 'Simpan pengaturan notifikasi</button></div></div></div>';
  }
  App.ubah('notifSak', (el) => { const s = App.st.notif.saklar; s[el.dataset.k] = el.type === 'checkbox' ? el.checked : +el.value; });
  App.ubah('notifMat', (el) => { const [k, c] = el.dataset.k.split('|'); App.st.notif.events.find((e) => e.kode === k)[c] = el.checked; });
  App.aksi('notifTpl', (b) => {
    const e = App.st.notif.events.find((x) => x.kode === b.dataset.k);
    const dw = UI.drawer({ judul: 'Templat: ' + e.label, sub: 'Placeholder: {nama} {tanggal} {waktu} {lokasi} {tujuan} {periode} {noSurat} {jamMasuk} {jamPulang} {batasMasuk} {selisih} {institusi} {link}',
      isi: '<div class="stack"><div class="field"><label>Subjek email</label><input class="input" id="tplSub" value="' + esc(e.subjek) + '"></div><div class="field"><label>Isi pesan (WA & email)</label><textarea class="textarea" id="tplIsi" style="min-height:220px">' + esc(e.pesan) + '</textarea><span class="hint">Teks di antara *bintang* menjadi tebal di WhatsApp dan email.</span></div></div>',
      kaki: '<button class="btn btn-ghost" data-tutup>Batal</button><button class="btn btn-primary" id="tplOk">' + icon('check') + 'Terapkan</button>' });
    dw.el.querySelector('#tplOk').addEventListener('click', () => { e.subjek = dw.el.querySelector('#tplSub').value; e.pesan = dw.el.querySelector('#tplIsi').value; dw.tutup(); UI.toast('Templat diterapkan. Klik "Simpan pengaturan notifikasi".', 'info'); });
  });
  App.aksi('notifSimpan', (b) => UI.sibuk(b, async () => {
    const N = App.st.notif, matriks = {};
    N.events.forEach((e) => { matriks[e.kode] = { wa: e.wa, email: e.email, pesan: e.pesan, subjek: e.subjek }; });
    try { App.st.notif = await API.api('notif.simpan', { saklar: N.saklar, matriks }); Store.d.settings.NOTIF_EMAIL_AKTIF = String(N.saklar.NOTIF_EMAIL_AKTIF); Store.d.settings.NOTIF_WA_AKTIF = String(N.saklar.NOTIF_WA_AKTIF); UI.toast('Pengaturan notifikasi disimpan.', 'ok'); App.segarkan(true); }
    catch (e) { UI.toast(e.message, 'bad'); }
  }));
  function tabAntri(N) {
    const a = N.antrian, c = (s) => a.filter((r) => r.status === s).length;
    return '<div class="stack"><div class="grid g4">' + kpi('layers', '', c('Antri') + '<small>pesan</small>', 'Menunggu dikirim', N.antreanAktif ? badge('Antrean aktif', 'info') : badge('Kosong', 'gray')) +
      kpi('okc', 'green', c('Terkirim'), 'Terkirim (150 terakhir)', 'WA + email') + kpi('xc', 'red', c('Gagal'), 'Gagal (≥3 percobaan)', 'Lihat kolom respon') +
      kpi('mail', 'orange', N.kuota.sisa + '<small>/ ' + N.kuota.batas + '</small>', 'Sisa kuota email', '±' + N.kuota.kapasitasPegawai + ' pegawai hari ini') + '</div>' +
      '<div class="card pad-0"><div class="row between wrap" style="padding:18px 20px"><h2>Antrean notifikasi</h2><div class="row"><button class="btn btn-ghost btn-sm" data-aksi="notifMuat">' + icon('refresh', 'sm') + 'Segarkan</button><button class="btn btn-primary btn-sm" data-aksi="notifProses">' + icon('zap', 'sm') + 'Proses sekarang</button></div></div>' +
      UI.tabel('antriTbl', { data: a, kunci: 'id', satuan: 'pesan', sortAwal: 'dibuat', dirAwal: -1, kolom: [
        { k: 'dibuat', l: 'Dibuat', r: (r) => '<span class="mono">' + esc(r.dibuat) + '</span>' }, { k: 'kanal', l: 'Kanal', r: (r) => badge(r.kanal, r.kanal === 'WA' ? 'ok' : 'info', false) },
        { k: 'nama', l: 'Penerima', r: (r) => '<div class="cell-main" style="font-size:13px">' + esc(r.nama) + '</div><div class="cell-sub">' + esc(r.tujuan) + '</div>' }, { k: 'event', l: 'Kejadian', r: (r) => '<span class="mono" style="font-size:12px">' + esc(r.event) + '</span>' },
        { k: 'status', l: 'Status', r: (r) => badge(r.status) }, { k: 'percobaan', l: 'Coba' }, { k: 'respon', l: 'Respon', r: (r) => '<span class="cell-sub">' + esc(r.respon || '') + '</span>' }],
      kosong: UI.empty('layers', 'Antrean kosong', 'Notifikasi akan muncul saat ada penugasan, presensi, atau pengingat.') }) + '</div></div>';
  }
  App.aksi('notifMuat', (b) => UI.sibuk(b, muatNotif));
  App.aksi('notifProses', (b) => UI.sibuk(b, async () => {
    try { const r = await API.api('notif.proses', {}); UI.toast('Diproses: ' + (r.wa || 0) + ' WA, ' + (r.email || 0) + ' email' + (r.ditunda ? ', ' + r.ditunda + ' email ditunda (kuota)' : '') + (r.pesan ? ' — ' + r.pesan : '') + '.', 'ok'); await muatNotif(); }
    catch (e) { UI.toast(e.message, 'bad'); }
  }));
  function tabBlast(N) {
    const B = App.st.blast = App.st.blast || { judul: '', pesan: 'Yth. {nama},\n\n', sasaran: 'semua', ids: [] };
    const aktif = Store.d.pegawai.filter((p) => p.Status === 'Aktif' && p.No_WA);
    return '<div class="split"><div class="card"><h2>Kirim blast WhatsApp</h2><p class="muted" style="font-size:12.5px;margin-top:4px">Dikirim ber-batch dengan jeda ' + N.saklar.WA_JEDA_DETIK + ' detik melalui antrean. Nomor berstatus "Tidak Terdaftar" dilewati.</p>' +
      '<div class="stack" style="margin-top:16px;gap:14px"><div class="field"><label>Judul (internal)</label><input class="input" value="' + esc(B.judul) + '" data-ubah="blast" data-k="judul" placeholder="Contoh: Info rapat koordinasi"></div>' +
      '<div class="field"><label>Sasaran</label><div class="chips">' + [['semua', 'Semua pegawai aktif (' + aktif.length + ')'], ['bertugas', 'Sedang bertugas hari ini'], ['terpilih', 'Pilih pegawai']].map((x) => '<button class="chip' + (B.sasaran === x[0] ? ' on' : '') + '" data-aksi="blastSas" data-s="' + x[0] + '">' + x[1] + '</button>').join('') + '</div></div>' +
      (B.sasaran === 'terpilih' ? '<div class="pick-list" style="max-height:200px">' + aktif.map((p) => '<label class="row" style="padding:8px 10px;gap:10px;cursor:pointer"><input type="checkbox" data-ganti="blastPilih" value="' + p.ID_Pegawai + '"' + (B.ids.includes(p.ID_Pegawai) ? ' checked' : '') + '>' + UI.avatar(p.Nama, 'sm') + '<span style="font-size:13px">' + esc(p.Nama) + '</span></label>').join('') + '</div>' : '') +
      '<div class="field"><label>Isi pesan</label><textarea class="textarea" style="min-height:160px" data-ubah="blast" data-k="pesan">' + esc(B.pesan) + '</textarea><span class="hint">Placeholder: {nama} {jabatan} {institusi} {link}. *teks* = tebal.</span></div>' +
      '<button class="btn btn-success btn-lg" data-aksi="blastKirim" ' + (N.fonnte.ada ? '' : 'disabled') + '>' + icon('send') + 'Masukkan ke antrean blast</button>' + (N.fonnte.ada ? '' : '<p class="hint" style="color:var(--danger);font-size:12px">Atur token Fonnte di Info Sistem terlebih dahulu.</p>') + '</div></div>' +
      '<div class="stack"><div class="card"><div class="card-h"><h2>Riwayat blast</h2><button class="btn btn-ghost btn-sm" data-aksi="pegCekWA">' + icon('wa', 'sm') + 'Cek nomor WA</button></div>' +
      (N.blast.length ? '<div class="list">' + N.blast.map((b) => { const p = UI.pct(+b.Terkirim + +b.Gagal, +b.Total); return '<div class="li" style="flex-direction:column;align-items:stretch;gap:8px"><div class="row between"><b style="font-size:13.5px">' + esc(b.Judul) + '</b>' + badge(b.Status, b.Status === 'Selesai' ? 'ok' : 'info') + '</div><div class="cell-sub" style="margin:0">' + esc(b.Tanggal) + ' · ' + b.Terkirim + ' terkirim · ' + b.Gagal + ' gagal dari ' + b.Total + '</div>' + UI.progress(p, b.Gagal ? 'warn' : 'green') + '</div>'; }).join('') + '</div>' : '<p class="muted" style="font-size:13px">Belum ada blast.</p>') + '</div>' +
      '<div class="card"><h3>Pratinjau</h3><div style="margin-top:10px;background:#E7FFDB;color:#0F1B3D;border-radius:12px 12px 12px 2px;padding:12px 14px;font-size:13.5px;white-space:pre-wrap;max-width:340px" id="blastPrev">' + pratinjau(B.pesan) + '</div></div></div></div>';
  }
  const pratinjau = (s) => esc(String(s).replace(/\{nama\}/g, 'Rian Pratama').replace(/\{jabatan\}/g, 'Analis').replace(/\{institusi\}/g, App.s('NAMA_INSTANSI', '')).replace(/\{link\}/g, App.s('APP_URL', location.origin + location.pathname))).replace(/\*([^*\n]+)\*/g, '<b>$1</b>');
  App.ubah('blast', (el) => { App.st.blast[el.dataset.k] = el.value; const p = UI.$('#blastPrev'); if (p && el.dataset.k === 'pesan') p.innerHTML = pratinjau(el.value); });
  App.ubah('blastPilih', (el) => { const B = App.st.blast; B.ids = el.checked ? B.ids.concat(el.value) : B.ids.filter((x) => x !== el.value); });
  App.aksi('blastSas', (b) => { App.st.blast.sasaran = b.dataset.s; App.segarkan(true); });
  App.aksi('blastKirim', async (b) => {
    const B = App.st.blast;
    if (!B.pesan.trim()) return UI.toast('Isi pesan wajib diisi.', 'warn');
    if (B.sasaran === 'terpilih' && !B.ids.length) return UI.toast('Pilih minimal satu pegawai.', 'warn');
    if (!(await UI.konfirmasi('Kirim blast WhatsApp?', 'Pesan akan masuk antrean dan dikirim bertahap oleh trigger dengan jeda acak.', { ya: 'Kirim blast', ikon: 'send' }))) return;
    UI.sibuk(b, async () => {
      try { const r = await API.api('notif.blast', B); UI.toast('Blast ' + r.blastId + ' untuk ' + r.total + ' penerima masuk antrean.', 'ok'); App.st.blast = null; await muatNotif(); }
      catch (e) { UI.toast(e.message, 'bad'); }
    });
  });
  function tabTes() {
    return '<div class="card" style="max-width:560px"><h2>Uji kirim notifikasi</h2><p class="muted" style="font-size:12.5px;margin-top:4px">Dikirim langsung (tidak lewat antrean) untuk memastikan token Fonnte & email berfungsi.</p>' +
      '<div class="stack" style="margin-top:16px;gap:14px"><div class="field"><label>Kanal</label><select class="select" id="tesKanal"><option value="WA">WhatsApp (Fonnte)</option><option value="EMAIL">Email (MailApp)</option></select></div>' +
      '<div class="field"><label>Tujuan</label><input class="input" id="tesTujuan" placeholder="08xxxxxxxxxx atau email"></div><button class="btn btn-primary" data-aksi="notifTes">' + icon('send') + 'Kirim pesan tes</button><div id="tesHasil"></div></div></div>';
  }
  App.aksi('notifTes', (b) => UI.sibuk(b, async () => {
    try { const r = await API.api('notif.tes', { kanal: UI.$('#tesKanal').value, tujuan: UI.$('#tesTujuan').value.trim() }); UI.$('#tesHasil').innerHTML = '<div class="alert ' + (r.ok ? 'ok' : 'bad') + '" style="font-size:13px">' + icon(r.ok ? 'okc' : 'alert') + esc(r.respon) + '</div>'; }
    catch (e) { UI.$('#tesHasil').innerHTML = '<div class="alert bad" style="font-size:13px">' + icon('alert') + esc(e.message) + '</div>'; }
  }));

  /* =================== INFO SISTEM =================== */
  App.halaman('sistem', {
    judul: 'Info Sistem & Kuota', sub: 'Cache, kuota email, kapasitas, rahasia, migrasi & log', peran: 'ADMIN',
    render() {
      const I = App.st.info;
      if (!I) return '<div class="stack"><div class="grid g3">' + UI.skel(200) + UI.skel(200) + UI.skel(200) + '</div>' + UI.skel(260) + '</div>';
      const k = I.kuota, pk = UI.pct(k.terpakai, k.batas), warn = k.sisa < k.batas * 0.1 ? 'red' : k.sisa < k.batas * 0.3 ? 'warn' : '';
      let snapKb = 0; try { snapKb = Math.round(((API.ls.get('snap_' + Sesi.user.email) || '').length * 2) / 1024); } catch (e) { snapKb = 0; }
      const trig = ['prosesAntrianNotif', 'jalankanPengingat', 'tugasHarian'];
      return '<div class="stack"><div class="page-h"><div class="title"><span class="ic-tile orange">' + icon('db') + '</span><div><h1>Info Sistem & Kuota</h1><p>Backend Google Apps Script v' + esc(I.versi) + ' · zona waktu ' + esc(I.zonaWaktu) + ' · diperbarui ' + esc(I.waktu) + ' WIB</p></div></div>' +
        '<div class="actions"><button class="btn btn-ghost" data-aksi="infoMuat">' + icon('refresh') + 'Muat ulang info</button><button class="btn btn-ghost" data-aksi="infoCache">' + icon('trash') + 'Bersihkan cache server</button>' + (I.spreadsheetUrl && I.spreadsheetUrl !== '#' ? '<a class="btn btn-primary" href="' + esc(I.spreadsheetUrl) + '" target="_blank" rel="noopener">' + icon('sheet') + 'Buka Spreadsheet</a>' : '') + '</div></div>' +
        '<div class="grid g3">' +
        '<div class="card"><div class="card-h"><div class="row"><span class="ic-tile">' + icon('zap') + '</span><h3>Pembacaan data</h3></div>' + badge('Cache aktif', 'ok') + '</div><p style="font-size:13px;color:var(--ink-2)">Data dibaca dari Google Sheets <b>secara batch</b> (sekali <span class="mono">getValues</span> per sheet), lalu disimpan sementara di <b>CacheService</b> (dipecah per 50 KB). Setiap penulisan hanya menaikkan versi cache sheet terkait, sehingga perpindahan menu di aplikasi tidak memanggil server.</p>' +
        '<dl class="kv" style="margin-top:12px"><dt>Waktu proses info</dt><dd>' + I.ms + ' ms</dd><dt>Latensi API terakhir</dt><dd>' + (API.stat.terakhir || '—') + ' ms</dd><dt>Snapshot di perangkat</dt><dd>±' + snapKb + ' KB</dd><dt>Jendela data presensi</dt><dd>' + I.jendelaHari + ' hari</dd></dl></div>' +
        '<div class="card"><div class="card-h"><div class="row"><span class="ic-tile violet">' + icon('mail') + '</span><h3>Kuota email hari ini</h3></div>' + badge(k.jenis === 'WORKSPACE' ? 'Google Workspace' : 'Gmail biasa', 'violet', false) + '</div>' +
        '<div class="row" style="gap:18px"><div style="width:110px;flex:none">' + Charts.cincin(pk, warn === 'red' ? '#DC2626' : warn === 'warn' ? '#F59E0B' : '#1F4FD8', 110, pk + '%').replace('rgba(255,255,255,.18)', 'var(--surface-3)').replace('fill:#fff', 'fill:var(--ink)') + '</div>' +
        '<dl class="kv grow"><dt>Batas harian</dt><dd>' + angka(k.batas) + '</dd><dt>Terpakai</dt><dd>' + angka(k.terpakai) + '</dd><dt>Sisa</dt><dd style="color:' + (warn ? 'var(--danger-ink)' : 'var(--success-ink)') + '">' + angka(k.sisa) + '</dd></dl></div>' +
        '<p class="muted" style="font-size:12px;margin-top:10px">Sebelum mengirim, sistem memeriksa sisa kuota. Jika habis, email ditunda ke hari berikutnya dan admin diperingatkan via WA.</p></div>' +
        '<div class="card stat-card"><div class="card-h"><div class="row"><span class="ic-tile green">' + icon('users') + '</span><h3>Estimasi kapasitas</h3></div></div><div class="big">±' + angka(k.kapasitasPegawai) + ' <span style="font-size:15px;color:var(--muted)">pegawai lagi hari ini</span></div>' +
        '<p style="font-size:13px;margin-top:6px">Kapasitas penuh: <b>±' + angka(k.kapasitasPenuh) + ' pegawai/hari</b> <span class="formula">batas ÷ 2</span> karena tiap pegawai menerima minimal 2 email (pengingat datang & pulang).</p>' +
        '<div class="li" style="margin-top:12px;font-size:12.5px">' + icon('wa', 'sm') + '<span>WhatsApp via Fonnte <b>tidak memakai kuota email</b>. Aktifkan WA untuk menugaskan lebih banyak pegawai.</span></div>' +
        '<dl class="kv" style="margin-top:12px"><dt>Gmail biasa</dt><dd>100/hari → ±50 pegawai</dd><dt>Workspace</dt><dd>1.500/hari → ±750 pegawai</dd></dl></div></div>' +
        '<div class="grid g2"><div class="card pad-0"><div style="padding:18px 20px" class="row between"><h3>Sheet database</h3><span class="muted" style="font-size:12.5px">jumlah baris · versi cache</span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Sheet</th><th class="right">Baris</th><th>Cache diperbarui</th></tr></thead><tbody>' +
        Object.keys(I.lembar).map((n) => '<tr><td class="mono">' + esc(n) + '</td><td class="right tnum">' + (I.lembar[n] == null ? '<span style="color:var(--danger)">tidak ada</span>' : angka(I.lembar[n])) + '</td><td class="cell-sub">' + esc(I.cache[n] || '—') + '</td></tr>').join('') + '</tbody></table></div></div>' +
        '<div class="stack"><div class="card"><h3>Antrean & trigger</h3><div class="grid g3" style="gap:10px;margin-top:12px">' + ['antri', 'terkirim', 'gagal'].map((x) => '<div class="li" style="flex-direction:column;align-items:flex-start;gap:2px"><span class="lbl-up">' + x + '</span><b style="font:800 22px var(--font-head)">' + angka(I.antrian[x]) + '</b></div>').join('') + '</div>' +
        '<div class="cell-sub" style="margin:10px 0">Hari ini: ' + I.antrian.emailHariIni + ' email · ' + I.antrian.waHariIni + ' WA terkirim</div><div class="list">' + trig.map((t) => '<div class="li" style="padding:10px 12px">' + icon(I.triggers.indexOf(t) > -1 ? 'okc' : 'alert', 'sm') + '<span class="mono grow" style="font-size:12.5px">' + t + '</span>' + (I.triggers.indexOf(t) > -1 ? badge('Aktif', 'ok') : badge('Belum dipasang', 'bad')) + '</div>').join('') + '</div>' +
        (trig.some((t) => I.triggers.indexOf(t) < 0) ? '<p class="hint" style="font-size:12px;color:var(--danger);margin-top:8px">Jalankan fungsi <span class="mono">pasangTrigger</span> di editor Apps Script.</p>' : '') + '</div></div></div>' +
        '<div class="card"><div class="card-h"><div class="row"><span class="ic-tile red">' + icon('key') + '</span><div><h2>Rahasia & konfigurasi (Script Properties)</h2><div class="sub">Nilai rahasia tidak pernah dikirim ke browser — hanya versi tersamar. Kosong = tidak berubah, ketik <span class="mono">__HAPUS__</span> untuk menghapus.</div></div></div></div>' +
        '<div class="form-grid">' + [['FONNTE_TOKEN', 'Token Fonnte (WhatsApp)', 'password'], ['GOOGLE_CLIENT_ID', 'Google OAuth Client ID', 'text'], ['ADMIN_EMAILS', 'Email admin (pisahkan koma)', 'text'], ['DOMAIN_IZIN', 'Domain email yang diizinkan (opsional)', 'text']].map((x) =>
          '<div class="field"><label>' + esc(x[1]) + '</label><input class="input" type="' + x[2] + '" data-rhs="' + x[0] + '" placeholder="' + esc(I.rahasia[x[0]] && I.rahasia[x[0]].ada ? I.rahasia[x[0]].samar : 'belum diatur') + '" autocomplete="off"><span class="hint">' + (I.rahasia[x[0]] && I.rahasia[x[0]].ada ? badge('Terisi', 'ok', false) : badge('Kosong', 'gray', false)) + '</span></div>').join('') +
        '<div class="field"><label>SESSION_SECRET</label><input class="input" disabled value="' + esc(I.rahasia.SESSION_SECRET.samar) + '"><span class="hint">Dibangkitkan otomatis. Rotasi: jalankan <span class="mono">rotasiSecretSesi</span> di editor.</span></div>' +
        '<div class="field"><label>Akses darurat</label><input class="input" disabled value="' + esc(I.rahasia.EMERGENCY_PASS_HASH.samar) + '"><span class="hint">Hash + salt. Reset: jalankan <span class="mono">resetAksesDarurat</span> di editor.</span></div></div>' +
        '<div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn btn-primary" data-aksi="simpanRahasia">' + icon('lock') + 'Simpan rahasia</button></div></div>' +
        '<div class="card"><div class="card-h"><div class="row"><span class="ic-tile">' + icon('layers') + '</span><div><h2>Migrasi & sinkron data dari spreadsheet lama</h2><div class="sub">Sumber hanya dibaca. Cocok berdasarkan nama kolom, upsert idempoten (aman diulang untuk delta-sync sebelum cutover).</div></div></div></div>' +
        '<div class="form-grid"><div class="field full"><label>ID atau URL spreadsheet lama</label><input class="input" id="migSumber" placeholder="https://docs.google.com/spreadsheets/d/…/edit" value="' + esc(App.st.migSumber || '') + '"></div>' +
        '<div class="field full"><label>Tabel</label><div class="chips">' + ['Pegawai', 'Penugasan', 'Presensi'].map((t) => '<label class="chip"><input type="checkbox" data-mig="' + t + '" checked style="accent-color:var(--primary)">' + t + '</label>').join('') + '</div></div></div>' +
        '<div class="row wrap" style="margin-top:14px;gap:8px"><button class="btn btn-ghost" data-aksi="migrasi" data-dry="1">' + icon('search') + 'Pindai (dry-run)</button><button class="btn btn-primary" data-aksi="migrasi">' + icon('dl') + 'Impor / sinkron</button></div><div id="migHasil" style="margin-top:14px">' + (App.st.migHasil || '') + '</div></div>' +
        '<div class="card pad-0"><div class="row between" style="padding:18px 20px"><div><h2>Log aktivitas</h2><div class="muted" style="font-size:12.5px">Data rahasia otomatis disamarkan</div></div><button class="btn btn-ghost btn-sm" data-aksi="muatLog">' + icon('refresh', 'sm') + 'Muat log</button></div><div id="logBox">' + (App.st.log ? tabelLog(App.st.log) : '<div class="empty"><p>Klik "Muat log" untuk melihat 150 aktivitas terakhir.</p></div>') + '</div></div></div>';
    },
    mount() { if (!App.st.info || Date.now() - (App.st.infoT || 0) > 60e3) muatInfo(); }
  });
  const tabelLog = (rows) => UI.tabel('logTbl', { data: rows, kunci: 'Waktu', satuan: 'aktivitas', sortAwal: 'Waktu', dirAwal: -1, kolom: [
    { k: 'Waktu', l: 'Waktu', r: (r) => '<span class="mono">' + esc(r.Waktu) + '</span>' }, { k: 'Email', l: 'Pengguna' }, { k: 'Aksi', l: 'Aksi', r: (r) => badge(r.Aksi, /DITOLAK|GAGAL/.test(r.Aksi) ? 'bad' : /LOGIN/.test(r.Aksi) ? 'info' : 'gray', false) },
    { k: 'Detail', l: 'Detail', r: (r) => '<span class="cell-sub mono" style="word-break:break-all">' + esc(String(r.Detail).slice(0, 160)) + '</span>' }, { k: 'RefID', l: 'Ref', r: (r) => '<span class="mono cell-sub">' + esc(r.RefID) + '</span>' }] });
  async function muatInfo() {
    try { App.st.info = await API.api('sistem.info', {}); App.st.infoT = Date.now(); if (Store.d) Store.d.kuota = App.st.info.kuota; if (App.rute === 'sistem') App.segarkan(true); }
    catch (e) { UI.toast(e.message, 'bad'); }
  }
  App.aksi('infoMuat', (b) => UI.sibuk(b, muatInfo));
  App.aksi('infoCache', (b) => UI.sibuk(b, async () => { try { await API.api('sistem.cache', {}); UI.toast('Cache server dibersihkan; data berikutnya dibaca ulang dari Sheets.', 'ok'); } catch (e) { UI.toast(e.message, 'bad'); } }));
  App.aksi('muatLog', (b) => UI.sibuk(b, async () => { try { App.st.log = await API.api('sistem.log', { n: 150 }); UI.$('#logBox').innerHTML = tabelLog(App.st.log); } catch (e) { UI.toast(e.message, 'bad'); } }));
  App.aksi('simpanRahasia', (b) => UI.sibuk(b, async () => {
    const rahasia = {};
    UI.$$('[data-rhs]').forEach((el) => { if (el.value.trim()) rahasia[el.dataset.rhs] = el.value.trim(); });
    if (!Object.keys(rahasia).length) return UI.toast('Tidak ada nilai yang diubah.', 'info');
    try { const r = await API.api('sistem.rahasia', { rahasia }); App.st.info.rahasia = r.status; UI.toast('Diperbarui: ' + Object.keys(r.hasil).join(', ') + '.', 'ok'); App.segarkan(true); }
    catch (e) { UI.toast(e.message, 'bad'); }
  }));
  App.aksi('migrasi', async (b) => {
    const sumber = UI.$('#migSumber').value.trim(), tabel = UI.$$('[data-mig]').filter((x) => x.checked).map((x) => x.dataset.mig), dry = !!b.dataset.dry;
    App.st.migSumber = sumber;
    if (!sumber) return UI.toast('Isi ID/URL spreadsheet lama.', 'warn');
    if (!dry && !(await UI.konfirmasi('Impor data sekarang?', 'Baris baru ditambahkan dan kolom yang diizinkan diperbarui. Peran, status, dan foto wajah di aplikasi ini tidak ditimpa. Disarankan menjalankan Pindai dulu.', { ya: 'Impor' }))) return;
    UI.sibuk(b, async () => {
      try {
        const r = await API.api(dry ? 'migrasi.pindai' : 'migrasi.impor', { sumber, tabel }, { timeout: 330000 });
        App.st.migHasil = '<div class="alert ' + (dry ? 'info' : 'ok') + '" style="font-size:13px;margin-bottom:10px">' + icon(dry ? 'search' : 'okc') + '<span><b>' + (dry ? 'Hasil pindai (belum ada yang ditulis)' : 'Impor selesai') + '</b> — sumber: ' + esc(r.sumber) + '</span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tabel</th><th class="right">Baris sumber</th><th class="right">Tambah</th><th class="right">Perbarui</th><th class="right">Lewati</th><th>Kolom cocok / hilang</th></tr></thead><tbody>' +
          Object.keys(r.tabel).map((t) => { const x = r.tabel[t]; return x.error ? '<tr><td>' + t + '</td><td colspan="5" style="color:var(--danger)">' + esc(x.error) + '</td></tr>' : '<tr><td><b>' + t + '</b></td><td class="right">' + x.baris + '</td><td class="right" style="color:var(--success-ink)">' + x.tambah + '</td><td class="right" style="color:var(--primary-ink)">' + x.perbarui + '</td><td class="right">' + x.lewati + '</td><td class="cell-sub">' + esc((x.kolomCocok || []).join(', ')) + (x.kolomHilang && x.kolomHilang.length ? '<br><span style="color:var(--warning-ink)">hilang: ' + esc(x.kolomHilang.slice(0, 8).join(', ')) + '</span>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>';
        UI.$('#migHasil').innerHTML = App.st.migHasil;
        if (!dry) App.segarkanData(true);
      } catch (e) { UI.toast(e.message, 'bad'); }
    });
  });

  /* =================== PENGATURAN =================== */
  App.halaman('pengaturan', {
    judul: 'Pengaturan', sub: 'Identitas, aturan presensi & default penugasan', peran: 'ADMIN', segarkan: false,
    render() {
      const s = Store.d.settings, inp = (k, l, attr, hint, cls) => '<div class="field ' + (cls || '') + '"><label for="s_' + k + '">' + esc(l) + '</label><input class="input" id="s_' + k + '" data-set="' + k + '" value="' + esc(s[k]) + '" ' + (attr || '') + '>' + (hint ? '<span class="hint">' + hint + '</span>' : '') + '</div>';
      const pil = (k, l, ops, hint) => '<div class="field"><label>' + esc(l) + '</label><select class="select" data-set="' + k + '">' + ops.map((o) => '<option value="' + o[0] + '"' + (s[k] === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>' + (hint ? '<span class="hint">' + hint + '</span>' : '') + '</div>';
      const kartu = (ic, warna, judul, isi) => '<div class="card"><div class="card-h"><div class="row"><span class="ic-tile ' + warna + '">' + icon(ic) + '</span><h2>' + judul + '</h2></div></div><div class="form-grid">' + isi + '</div></div>';
      return '<div class="stack">' +
        kartu('building', '', 'Identitas & kontak', inp('NAMA_APLIKASI', 'Nama aplikasi') + inp('NAMA_INSTANSI', 'Nama instansi') + inp('KONTAK_HELPDESK', 'Kontak helpdesk') + inp('WA_HELPDESK', 'Nomor WA helpdesk', 'inputmode="tel" placeholder="08…"') +
          inp('APP_URL', 'URL aplikasi (GitHub Pages)', 'placeholder="https://username.github.io/siperdin/"', 'Dipakai sebagai tautan di notifikasi.', 'full') +
          '<div class="field full"><label for="s_PENGUMUMAN">Pengumuman beranda</label><textarea class="textarea" id="s_PENGUMUMAN" data-set="PENGUMUMAN">' + esc(s.PENGUMUMAN) + '</textarea></div>') +
        '<div class="grid g2">' + kartu('shieldok', 'green', 'Aturan presensi',
          inp('AMBANG_WAJAH', 'Ambang skor wajah (%)', 'type="number" min="40" max="99"', 'Disarankan 75 (jarak deskriptor ≤ 0,5).') + inp('BATAS_AKURASI_GPS', 'Batas akurasi GPS (m)', 'type="number" min="5" max="1000"', 'Akurasi lebih buruk ditolak.') +
          inp('BUKA_PRESENSI_MENIT', 'Presensi datang dibuka (menit sebelum jam masuk)', 'type="number" min="0" max="720"') +
          pil('PULANG_TANPA_DATANG', 'Pulang tanpa presensi datang', [['TOLAK', 'Tolak'], ['TANDAI', 'Terima, tandai perlu tinjauan']])) +
        kartu('clipboard', 'violet', 'Default penugasan baru',
          inp('RADIUS_DEFAULT', 'Radius geofence (m)', 'type="number" min="10" max="5000"') + inp('TOLERANSI_DEFAULT', 'Toleransi terlambat (menit)', 'type="number" min="0" max="240"') +
          inp('JAM_MASUK_DEFAULT', 'Jam masuk', 'type="time"') + inp('JAM_PULANG_DEFAULT', 'Jam pulang', 'type="time"')) + '</div>' +
        '<div class="grid g2">' + kartu('mail', 'orange', 'Email & pengingat',
          pil('JENIS_AKUN', 'Jenis akun Google pemilik script', [['GMAIL', 'Gmail biasa (100 email/hari)'], ['WORKSPACE', 'Google Workspace (1.500 email/hari)']], 'Menentukan perhitungan kapasitas.') +
          inp('MENIT_PENGINGAT', 'Pengingat dikirim (menit sebelum jadwal)', 'type="number" min="5" max="180"')) +
        kartu('db', '', 'Data & performa', inp('JENDELA_PRESENSI_HARI', 'Jendela data presensi dimuat (hari)', 'type="number" min="7" max="180"', 'Data lebih lama diambil saat diminta. Nilai kecil = aplikasi lebih ringan.') +
          '<div class="field"><label>Tema tampilan</label><button class="btn btn-ghost" data-aksi="tema">' + icon('moon') + 'Terang / gelap</button></div>') + '</div>' +
        '<div class="row" style="justify-content:flex-end;gap:10px;position:sticky;bottom:12px"><button class="btn btn-ghost" data-aksi="batalSet">Batalkan perubahan</button><button class="btn btn-primary btn-lg" data-aksi="simpanSet" style="box-shadow:var(--shadow-3)">' + icon('check') + 'Simpan pengaturan</button></div></div>';
    }
  });
  App.aksi('batalSet', () => App.segarkan(true));
  App.aksi('simpanSet', (b) => UI.sibuk(b, async () => {
    const s = Store.d.settings, ubah = {};
    UI.$$('[data-set]').forEach((el) => { if (String(el.value) !== String(s[el.dataset.set])) ubah[el.dataset.set] = el.value; });
    if (!Object.keys(ubah).length) return UI.toast('Tidak ada perubahan.', 'info');
    try {
      Store.d.settings = await API.api('sistem.pengaturan', { pengaturan: ubah }); Store.simpanSnap();
      UI.toast(Object.keys(ubah).length + ' pengaturan disimpan.', 'ok');
      if (ubah.NAMA_APLIKASI || ubah.NAMA_INSTANSI || ubah.KONTAK_HELPDESK) { UI.$('.shell').remove(); }
      App.render();
    } catch (e) { UI.toast(e.message, 'bad'); }
  }));
})();
