/* =========================================================
   halaman-pegawai.js — Beranda, Presensi (GPS + wajah + waktu server),
   Hasil, Penugasan Saya, Detail Penugasan (bersama admin), Riwayat,
   Rekap SPPD saya, Profil. + komponen bersama (window.K).
   ========================================================= */
(function () {
  'use strict';
  const { esc, icon, badge, tgl, angka, rupiah, rupiahPendek } = UI;
  const { Store, Sesi, Jam } = API;

  /* =================== Komponen bersama =================== */
  const K = {
    /** Presensi satu penugasan: dari Store, atau dari server bila penugasan lebih lama dari jendela data. */
    presensiDari(p) { return (App.st.presLama || {})[p.ID_Penugasan] || Store.presensiPenugasan(p.ID_Penugasan); },
    perluMuat(p) { const j = Store.d.jendela && Store.d.jendela.dari; return !!(j && p.Tgl_Mulai < j && !(App.st.presLama || {})[p.ID_Penugasan]); },
    async muatLama(p) {
      const pack = await API.api('presensi.penugasan', { id: p.ID_Penugasan });
      (App.st.presLama = App.st.presLama || {})[p.ID_Penugasan] = Store.presensiKompak(pack);
      return App.st.presLama[p.ID_Penugasan];
    },
    infoStatus(p) { const s = App.statusPng(p); return badge(s === 'Berjalan' && p.Status === 'Aktif' ? 'Berjalan' : s); },
    batasMasuk: (p) => UI.jamDariMenit(UI.menit(p.Jam_Masuk) + (+p.Toleransi_Menit || 0)),
    /** Baris log harian per tanggal penugasan. */
    hariHarian(p, rows, opsi) {
      opsi = opsi || {};
      const t = App.hariIni(), n = App.hariDinas(p), out = [];
      for (let i = 0; i < n; i++) {
        const d = UI.tambahHari(p.Tgl_Mulai, i);
        const ds = rows.filter((r) => r.Tanggal === d);
        const da = ds.find((r) => r.Jenis === 'Datang' && r.Verifikasi !== 'Ditolak'), pu = ds.find((r) => r.Jenis === 'Pulang' && r.Verifikasi !== 'Ditolak');
        const lengkap = da && pu, nanti = d > t;
        const label = lengkap ? badge('Lengkap', 'ok') : nanti ? badge('Terjadwal', 'violet', false) : d === t ? badge('Hari ini', 'info') : badge(da || pu ? 'Tidak lengkap' : 'Tidak hadir', 'warn');
        const kotak = (r, j) => '<div><small>Presensi ' + j + '</small>' + (r ? '<b class="tnum" style="color:' + (r.Status === 'Tepat Waktu' ? 'var(--success-ink)' : r.Status === 'Terlambat' ? 'var(--warning-ink)' : 'var(--danger-ink)') + '">' + esc(String(r.Waktu_Server).slice(11, 16)) + ' WIB</b><div class="cell-sub">' +
          esc(r.Status) + (r.Selisih_Menit ? ' (' + (r.Selisih_Menit > 0 ? '+' : '') + r.Selisih_Menit + ' mnt)' : '') + ' · wajah ' + r.Skor_Wajah + '% · ' + r.Jarak_Meter + ' m' + (r.Verifikasi === 'Perlu Tinjauan' ? ' · <b style="color:var(--warning-ink)">tinjau</b>' : '') + '</div>' : '<b class="faint">—</b>') + '</div>';
        out.push('<div class="day' + (lengkap ? ' full' : '') + '"><div class="row between"><div class="row" style="gap:10px"><span class="dn">' + (i + 1) + '</span><b style="font-size:13.5px">' + tgl(d, 'hari') + '</b></div>' + label + '</div>' +
          (nanti && !ds.length ? '<p class="muted" style="font-size:12.5px;margin-top:8px">Presensi dibuka mulai ' + UI.jamDariMenit(UI.menit(p.Jam_Masuk) - +App.s('BUKA_PRESENSI_MENIT', 120)) + ' WIB di radius ' + esc(p.Nama_Lokasi) + '.</p>' : '<div class="io">' + kotak(da, 'Datang') + kotak(pu, 'Pulang') + '</div>') +
          (opsi.tarif && lengkap ? '<div class="cell-sub" style="margin-top:8px">Uang harian: ' + rupiah(p.Tarif_Harian) + '</div>' : '') + '</div>');
      }
      return '<div class="' + (opsi.grid ? 'day-grid' : 'days') + '">' + out.join('') + '</div>';
    },
    rekapDari(p) {
      return Store.rekap(p.ID_Penugasan) || { Jumlah_Hari_Dinas: App.hariDinas(p), Hari_Hadir_Lengkap: 0, Jumlah_Terlambat: 0, Jumlah_Pulang_Cepat: 0, Tarif_Harian: +p.Tarif_Harian || 0, Estimasi_Uang_Harian: App.hariDinas(p) * (+p.Tarif_Harian || 0), Status_SPPD: App.statusPng(p) };
    },
    statusSppd(r, p) { // status yang bergantung tanggal dihitung ulang di klien agar selalu terkini
      if (!p) return r.Status_SPPD;
      if (p.Status === 'Batal' || p.Status === 'Draft') return p.Status;
      const t = App.hariIni();
      if (t < p.Tgl_Mulai) return 'Terjadwal';
      if (t <= p.Tgl_Selesai && p.Status === 'Aktif') return 'Berjalan';
      return +r.Hari_Hadir_Lengkap >= +r.Jumlah_Hari_Dinas ? 'Siap Dibayar' : 'Perlu Verifikasi';
    },
    liPenugasan(p, admin) {
      const d = UI.tglParse(p.Tgl_Mulai);
      return '<div class="li click" data-nav="#/penugasan/' + esc(p.ID_Penugasan) + '"><div class="datebox"><b>' + d.d + '</b><span>' + UI.BLN[d.m - 1] + '</span></div><div class="grow"><div class="row between"><b style="font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(p.Tujuan) + '</b>' + K.infoStatus(p) + '</div>' +
        '<div class="cell-sub">' + (admin ? esc(App.peg(p.ID_Pegawai).Nama) + ' · ' : '') + icon('pin', 'sm').replace('class="ic sm"', 'class="ic sm" style="display:inline;vertical-align:-3px;width:13px;height:13px"') + ' ' + esc(p.Nama_Lokasi) + '</div><div class="cell-sub">' + UI.periode(p.Tgl_Mulai, p.Tgl_Selesai) + ' · ' + App.hariDinas(p) + ' hari</div></div></div>';
    },
    /** Tabel rekap SPPD dengan baris yang bisa dibuka (validasi harian). */
    tabelRekap(id, rows, admin) {
      const st = App.st[id] = App.st[id] || { buka: null };
      return UI.tabel(id, {
        data: rows, kunci: 'ID_Penugasan', satuan: 'penugasan', sortAwal: 'Tgl_Mulai', dirAwal: -1,
        klik: (k) => {
          st.buka = st.buka === k ? null : k; UI._tbl[id].ekspansi.terbuka = st.buka; UI.tabelSegarkan(id);
          const p = st.buka && Store.penugasan(st.buka);
          if (p && K.perluMuat(p)) K.muatLama(p).then(() => UI.tabelSegarkan(id)).catch((e) => UI.toast(e.message, 'bad'));
        },
        ekspansi: { terbuka: st.buka, isi: (r) => { const p = Store.penugasan(r.ID_Penugasan); return p ? '<div class="row between wrap" style="margin-bottom:12px"><b>' + icon('clipboard', 'sm') + ' Validasi harian presensi & biometrik · ' + esc(p.No_Surat_Tugas) + '</b><button class="btn btn-sm btn-ghost" data-nav="#/penugasan/' + p.ID_Penugasan + '">Buka detail ' + icon('right', 'sm') + '</button></div>' + (K.perluMuat(p) ? '<div class="day-grid">' + UI.skel(110) + UI.skel(110) + UI.skel(110) + '</div>' : K.hariHarian(p, K.presensiDari(p), { grid: true, tarif: true })) : ''; } },
        kolom: [
          { k: 'No_Surat_Tugas', l: 'No. Surat Tugas', r: (r) => { const p = Store.penugasan(r.ID_Penugasan) || {}; return '<div class="cell-main nw" style="color:var(--primary-ink)">' + esc(r.No_Surat_Tugas) + '</div><div class="cell-sub">' + esc(p.Pemberi_Perintah || '') + '</div>'; } },
          admin ? { k: 'ID_Pegawai', l: 'Pegawai', nilai: (r) => App.peg(r.ID_Pegawai).Nama, r: (r) => { const g = App.peg(r.ID_Pegawai); return '<div class="who">' + UI.avatar(g.Nama, 'sm') + '<div style="min-width:0"><div class="cell-main" style="max-width:200px">' + esc(g.Nama) + '</div><div class="cell-sub nw">NIP ' + esc(g.NIP || '—') + '</div></div></div>'; } } : null,
          { k: 'Tujuan', l: 'Tujuan & Lokasi', nilai: (r) => (Store.penugasan(r.ID_Penugasan) || {}).Tujuan, r: (r) => { const p = Store.penugasan(r.ID_Penugasan) || {}; return '<div class="cell-main" style="font-weight:500;max-width:240px">' + esc(p.Tujuan || '') + '</div><div class="cell-sub">' + esc(p.Nama_Lokasi || '') + '</div>'; } },
          { k: 'Tgl_Mulai', l: 'Tanggal Dinas', r: (r) => '<div class="cell-main nw">' + UI.periode(r.Tgl_Mulai, r.Tgl_Selesai) + '</div><div class="nw" style="margin-top:4px">' + badge(r.Jumlah_Hari_Dinas + ' hari dinas', 'info', false) + '</div>' },
          { k: 'Hari_Hadir_Lengkap', l: 'Hadir Lengkap', r: (r) => '<span class="nw">' + badge(r.Hari_Hadir_Lengkap + '/' + r.Jumlah_Hari_Dinas + ' hari', +r.Hari_Hadir_Lengkap >= +r.Jumlah_Hari_Dinas ? 'ok' : +r.Hari_Hadir_Lengkap ? 'warn' : 'gray', false) + '</span>' },
          { k: 'Jumlah_Terlambat', l: 'Disiplin', nilai: (r) => +r.Jumlah_Terlambat + +r.Jumlah_Pulang_Cepat, r: (r) => (+r.Jumlah_Terlambat || +r.Jumlah_Pulang_Cepat ? '<div class="cell-sub nw" style="margin:0">' + (+r.Jumlah_Terlambat ? '<span style="color:var(--warning-ink)">' + r.Jumlah_Terlambat + '× terlambat</span>' : '') + (+r.Jumlah_Terlambat && +r.Jumlah_Pulang_Cepat ? '<br>' : '') + (+r.Jumlah_Pulang_Cepat ? '<span style="color:var(--danger-ink)">' + r.Jumlah_Pulang_Cepat + '× pulang cepat</span>' : '') + '</div>' : '<span class="cell-sub nw" style="color:var(--success-ink)">' + icon('okc', 'sm').replace('class="ic sm"', 'class="ic sm" style="display:inline;width:13px;height:13px;vertical-align:-2px"') + ' Bersih</span>') },
          { k: 'Estimasi_Uang_Harian', l: 'Estimasi Uang Harian', nilai: (r) => +r.Estimasi_Uang_Harian, r: (r) => '<div class="cell-main tnum nw">' + rupiah(r.Estimasi_Uang_Harian) + '</div><div class="cell-sub nw">' + rupiah(r.Tarif_Harian) + ' × ' + r.Jumlah_Hari_Dinas + '</div>' },
          { k: 'Status_SPPD', l: 'Status SPPD', nilai: (r) => K.statusSppd(r, Store.penugasan(r.ID_Penugasan)), r: (r) => '<span class="nw">' + badge(K.statusSppd(r, Store.penugasan(r.ID_Penugasan))) + '</span>' },
          { k: '', l: '', sort: false, r: (r) => '<span class="faint">' + icon(App.st[id] && App.st[id].buka === r.ID_Penugasan ? 'chu' : 'chd', 'sm') + '</span>' }
        ].filter(Boolean)
      });
    },
    kolomEksporRekap: () => [
      { l: 'No Surat Tugas', k: 'No_Surat_Tugas' }, { l: 'Pegawai', v: (r) => App.peg(r.ID_Pegawai).Nama }, { l: 'NIP', v: (r) => App.peg(r.ID_Pegawai).NIP },
      { l: 'Tujuan', v: (r) => (Store.penugasan(r.ID_Penugasan) || {}).Tujuan }, { l: 'Lokasi', v: (r) => (Store.penugasan(r.ID_Penugasan) || {}).Nama_Lokasi },
      { l: 'Tgl Mulai', k: 'Tgl_Mulai' }, { l: 'Tgl Selesai', k: 'Tgl_Selesai' }, { l: 'Jumlah Hari Dinas', k: 'Jumlah_Hari_Dinas' }, { l: 'Hari Hadir Lengkap', k: 'Hari_Hadir_Lengkap' },
      { l: 'Terlambat', k: 'Jumlah_Terlambat' }, { l: 'Pulang Cepat', k: 'Jumlah_Pulang_Cepat' }, { l: 'Tarif Harian', k: 'Tarif_Harian' }, { l: 'Estimasi Uang Harian', k: 'Estimasi_Uang_Harian' },
      { l: 'Status SPPD', v: (r) => K.statusSppd(r, Store.penugasan(r.ID_Penugasan)) }],
    kolomEksporPresensi: () => [
      { l: 'Waktu Server (WIB)', k: 'Waktu_Server' }, { l: 'Pegawai', v: (r) => App.peg(r.ID_Pegawai).Nama }, { l: 'NIP', v: (r) => App.peg(r.ID_Pegawai).NIP },
      { l: 'No Surat Tugas', v: (r) => (Store.penugasan(r.ID_Penugasan) || {}).No_Surat_Tugas }, { l: 'Lokasi', v: (r) => (Store.penugasan(r.ID_Penugasan) || {}).Nama_Lokasi },
      { l: 'Jenis', k: 'Jenis' }, { l: 'Jarak (m)', k: 'Jarak_Meter' }, { l: 'Akurasi GPS (m)', k: 'Akurasi_GPS' }, { l: 'Skor Wajah', k: 'Skor_Wajah' },
      { l: 'Status', k: 'Status' }, { l: 'Selisih (menit)', k: 'Selisih_Menit' }, { l: 'Verifikasi', k: 'Verifikasi' }, { l: 'Catatan', k: 'Catatan' }],
    tipsGps() {
      UI.modal({ judul: 'Panduan kalibrasi GPS', ikon: 'target', isi: '<ol style="padding-left:18px;margin:8px 0 0;display:flex;flex-direction:column;gap:6px;color:var(--ink-2)">' +
        '<li>Aktifkan <b>Lokasi/GPS</b> dengan mode <b>akurasi tinggi</b> di pengaturan ponsel.</li><li>Izinkan akses lokasi untuk situs ini (ikon gembok di bilah alamat → Izin → Lokasi).</li>' +
        '<li>Keluar dari basemen/ruang tertutup, menuju jendela atau area terbuka.</li><li>Buka Google Maps sejenak hingga titik biru stabil, lalu kembali ke aplikasi.</li>' +
        '<li>Matikan aplikasi pemalsu lokasi (fake GPS) — percobaan tercatat di log audit.</li></ol>', aksi: '<button class="btn btn-primary" data-tutup>Mengerti</button>' });
    }
  };
  window.K = K;
  App.aksi('tipsGps', () => K.tipsGps());

  const aktifHariIni = () => { const t = App.hariIni(); return Store.d.penugasan.filter((p) => p.Status === 'Aktif' && p.Tgl_Mulai <= t && p.Tgl_Selesai >= t); };
  const mendatang = () => { const t = App.hariIni(); return Store.d.penugasan.filter((p) => p.Status === 'Aktif' && p.Tgl_Mulai > t).sort((a, b) => a.Tgl_Mulai.localeCompare(b.Tgl_Mulai)); };

  /* =================== BERANDA =================== */
  App.halaman('beranda', {
    judul: 'Beranda', sub: () => UI.tgl(App.hariIni(), 'panjang'), peran: 'PEGAWAI',
    render() {
      const u = Sesi.user, me = Store.pegawai(u.idPegawai) || {}, t = App.hariIni();
      const akt = aktifHariIni(), p = akt[0], next = mendatang();
      const bln = t.slice(0, 7);
      const rekBln = Store.d.rekap.filter((r) => r.Tgl_Mulai.slice(0, 7) === bln || r.Tgl_Selesai.slice(0, 7) === bln).filter((r) => { const x = Store.penugasan(r.ID_Penugasan); return x && x.Status !== 'Batal'; });
      const hari = rekBln.reduce((s, r) => s + +r.Jumlah_Hari_Dinas, 0), lengkap = rekBln.reduce((s, r) => s + +r.Hari_Hadir_Lengkap, 0);
      const pres = Store.d.presensi.filter((r) => r.Tanggal.slice(0, 7) === bln && r.Verifikasi !== 'Ditolak');
      const tepat = pres.filter((r) => r.Status === 'Tepat Waktu').length, telat = pres.filter((r) => r.Status === 'Terlambat').length;
      const uang = rekBln.reduce((s, r) => s + +r.Estimasi_Uang_Harian, 0);
      let hero;
      if (p) {
        const h = App.presensiHari(p.ID_Penugasan, t), ke = UI.selisihHari(p.Tgl_Mulai, t) + 1, n = App.hariDinas(p), persen = Math.round((ke / n) * 100);
        const mNow = UI.menit(Jam.wib().hm), mP = UI.menit(p.Jam_Pulang);
        const bDatang = h.datang ? '<div class="bigbtn done">' + icon('okc') + '<span>Datang ' + esc(h.datang.Waktu_Server.slice(11, 16)) + '</span><small>' + esc(h.datang.Status) + '</small></div>'
          : '<button class="bigbtn" data-nav="#/presensi/' + p.ID_Penugasan + '?jenis=Datang">' + icon('finger', 'lg') + '<span>Presensi Datang</span><small>Batas ' + K.batasMasuk(p) + ' WIB</small></button>';
        const bPulang = h.pulang ? '<div class="bigbtn done">' + icon('okc') + '<span>Pulang ' + esc(h.pulang.Waktu_Server.slice(11, 16)) + '</span><small>' + esc(h.pulang.Status) + '</small></div>'
          : !h.datang ? '<div class="bigbtn off">' + icon('lock') + '<span>Presensi Pulang</span><small>Setelah presensi datang</small></div>'
            : '<button class="bigbtn" data-nav="#/presensi/' + p.ID_Penugasan + '?jenis=Pulang"' + (mNow < mP ? ' style="background:rgba(255,255,255,.9)"' : '') + '>' + icon('finger', 'lg') + '<span>Presensi Pulang</span><small>' + (mNow < mP ? 'Dibuka ' + p.Jam_Pulang + ' WIB (sebelumnya = pulang cepat)' : 'Sudah dibuka') + '</small></button>';
        hero = '<section class="hero"><div class="row between" style="position:relative;z-index:1"><span class="tag">' + icon('file', 'sm') + esc(p.No_Surat_Tugas) + '</span><span class="daytag">Hari ' + ke + '/' + n + '</span></div>' +
          '<h2>' + esc(p.Tujuan) + '</h2><div class="loc"><div class="row">' + icon('pin', 'sm') + '<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(p.Nama_Lokasi) + (p.Alamat ? ', ' + esc(p.Alamat) : '') + '</span></div>' +
          '<div class="row between" style="margin-top:8px;font-size:12.5px;font-weight:600"><span>Periode tugas: ' + UI.periode(p.Tgl_Mulai, p.Tgl_Selesai) + '</span><span>' + persen + '% berjalan</span></div>' + UI.progress(persen) + '</div>' +
          '<div class="sched"><div class="grid g2" style="gap:10px"><div><div class="muted" style="font-size:12px;font-weight:600">Jadwal Masuk</div><div class="t">' + esc(p.Jam_Masuk) + ' WIB</div><div style="font-size:12px;font-weight:700;color:var(--warning-ink)">Batas ' + K.batasMasuk(p) + ' WIB</div></div>' +
          '<div><div class="muted" style="font-size:12px;font-weight:600">Jadwal Pulang</div><div class="t">' + esc(p.Jam_Pulang) + ' WIB</div><div class="muted" style="font-size:12px;font-weight:600">Sesuai surat tugas</div></div></div>' +
          '<div class="divider" style="margin:12px 0"></div><div class="row" id="geoInfo" style="font-size:12.5px;font-weight:600;color:var(--muted)">' + icon('target', 'sm') + '<span>Mendeteksi posisi Anda…</span></div></div>' +
          '<div class="btns">' + bDatang + bPulang + '</div></section>';
      } else {
        hero = '<div class="card">' + UI.empty('briefcase', 'Tidak ada penugasan aktif hari ini', next[0] ? 'Penugasan berikutnya: ' + next[0].Tujuan + ' (' + UI.periode(next[0].Tgl_Mulai, next[0].Tgl_Selesai) + ').' : 'Penugasan baru akan muncul di sini setelah diterbitkan admin.', '<button class="btn btn-ghost" data-nav="#/penugasan-saya">' + icon('briefcase') + 'Lihat penugasan saya</button>') + '</div>';
      }
      const lewatBatas = p && UI.menit(Jam.wib().hm) > UI.menit(K.batasMasuk(p));
      const peringatan = p && !App.presensiHari(p.ID_Penugasan, t).datang ? '<div class="alert yellow">' + '<div class="ic-tile yellow" style="background:#FDE68A">' + icon('bell') + '</div><div><b style="color:var(--warning-ink)">Perhatian Presensi Hari Ini</b><div style="font-size:13px;color:var(--ink-2)">' +
        (lewatBatas ? 'Batas presensi datang pukul <b>' + K.batasMasuk(p) + ' WIB</b> sudah lewat. Segera lakukan presensi di lokasi — kehadiran tetap tercatat dengan status terlambat untuk verifikator.'
          : 'Lakukan presensi datang sebelum pukul <b>' + K.batasMasuk(p) + ' WIB</b> agar tidak tercatat terlambat. Keterlambatan tercatat untuk verifikator SPPD.') + '</div></div></div>' : '';
      return '<div class="dash"><div class="stack">' +
        '<div class="card"><div class="hello">' + UI.avatar(u.nama, 'lg', true) + '<div class="grow"><h2 style="font-size:19px">Halo, ' + esc(u.nama) + '</h2><div class="muted" style="font-size:12.5px">' + esc(u.jabatan || '') + (u.nip ? ' · NIP ' + esc(u.nip) : '') + '</div>' +
        '<div class="row wrap" style="margin-top:8px;gap:8px">' + (p ? badge('Sedang Berdinas Aktif (' + p.Nama_Lokasi + ')', 'ok') : badge('Tidak sedang berdinas', 'gray')) + (me.Punya_Wajah === false ? badge('Wajah belum terdaftar', 'warn') : '') + '</div>' +
        '<div class="row muted" style="font-size:12.5px;margin-top:8px;gap:6px">' + icon('clock', 'sm') + UI.tgl(t, 'panjang') + ' · <b class="tnum" style="color:var(--ink)" data-jam="hm">' + Jam.wib().hm + '</b> WIB</div></div></div></div>' +
        hero + peringatan +
        '<div><div class="row between" style="margin-bottom:12px"><h2>Capaian SPPD Bulan Ini</h2><span class="badge info">' + UI.tgl(t, 'bulan') + '</span></div><div class="grid g4">' +
        kpi('cal', '', hari + '<small>hari</small>', 'Hari dinas terhitung', icon('okc', 'sm') + lengkap + ' hari hadir lengkap') +
        kpi('okc', 'green', UI.pct(tepat, pres.length) + '<small>%</small>', 'Presensi tepat waktu', icon('up', 'sm') + tepat + ' dari ' + pres.length + ' presensi') +
        kpi('alert', 'orange', telat + '<small>kasus</small>', 'Keterlambatan', telat ? icon('alert', 'sm') + 'Perlu diperhatikan' : icon('shieldok', 'sm') + 'Catatan bersih') +
        kpi('money', 'violet', '<span style="color:var(--primary-ink)">' + rupiahPendek(uang) + '</span>', 'Estimasi uang harian', icon('info', 'sm') + 'Hari dinas × tarif harian') + '</div></div>' +
        '<div><div class="row between" style="margin-bottom:12px"><h2>Layanan Administrasi SPPD</h2><span class="muted" style="font-size:12.5px">Aksi mandiri</span></div><div class="grid g4 qa">' +
        quick('blue', 'clipboard', 'Penugasan Saya', 'Surat tugas, lokasi & jadwal', 'Lihat', '#/penugasan-saya', 'btn-primary') +
        quick('green', 'history', 'Riwayat Presensi', 'Log GPS & swafoto dinas', 'Lihat log', '#/riwayat', 'btn-success') +
        quick('violet', 'money', 'Rekap SPPD', 'Hari dinas & uang harian', 'Buka rekap', '#/rekap-saya', 'btn-violet') +
        '<div class="quick orange"><div class="ic-tile">' + icon('help') + '</div><div><h3>Pusat Bantuan</h3><p>Kontak admin kepegawaian</p></div>' +
        (App.s('WA_HELPDESK') ? '<a class="btn btn-orange btn-sm" target="_blank" rel="noopener" href="https://wa.me/62' + esc(String(App.s('WA_HELPDESK')).replace(/^0/, '')) + '">Hubungi ' + icon('right', 'sm') + '</a>' : '<span class="btn btn-orange btn-sm">' + esc(App.s('KONTAK_HELPDESK', '-')) + '</span>') + '</div></div></div>' +
        '</div><aside class="dash-aside">' +
        '<div class="card"><div class="card-h"><h2>Penugasan Mendatang</h2><button class="link" data-nav="#/penugasan-saya">Lihat semua</button></div>' +
        (next.length ? '<div class="list">' + next.slice(0, 4).map((x) => K.liPenugasan(x)).join('') + '</div>' : '<p class="muted" style="font-size:13px">Belum ada penugasan terjadwal.</p>') + '</div>' +
        '<div class="card"><div class="card-h"><h2>Pengumuman</h2>' + icon('mega') + '</div><div class="li" style="align-items:flex-start"><span class="ic-tile" style="width:36px;height:36px">' + icon('mega', 'sm') + '</span><p style="font-size:13px">' + esc(App.s('PENGUMUMAN', 'Tidak ada pengumuman.')) + '</p></div></div>' +
        (me.Punya_Wajah === false ? '<div class="alert warn">' + '<div class="ic-tile">' + icon('face') + '</div><div><b>Foto referensi wajah belum terdaftar</b><div style="font-size:12.5px">Presensi membutuhkan foto referensi. Hubungi admin kepegawaian.</div></div></div>' : '') +
        '</aside></div>';
    },
    mount() {
      const p = aktifHariIni()[0];
      if (!p) return;
      Geo.sekali().then((g) => {
        const el = UI.$('#geoInfo'); if (!el) return;
        const j = Math.round(Geo.haversine(g.lat, g.lng, +p.Latitude, +p.Longitude)), ok = j <= +p.Radius_Meter;
        el.style.color = ok ? 'var(--success-ink)' : 'var(--danger-ink)';
        el.innerHTML = icon('target', 'sm') + '<span>Titik Anda terdeteksi <b>' + angka(j) + ' m</b> dari titik lokasi (radius ' + p.Radius_Meter + ' m)' + (ok ? '' : ' — di luar area') + '</span>';
      }).catch((e) => { const el = UI.$('#geoInfo'); if (el) el.innerHTML = icon('alert', 'sm') + '<span>' + esc(Geo.pesan(e)) + '</span>'; });
      const h = App.presensiHari(p.ID_Penugasan, App.hariIni());
      const c = navigator.connection;
      if ((!h.datang || !h.pulang) && !(c && c.saveData) && !API.DEMO) UI.idle(() => Wajah.muat().catch(() => { })); // siapkan model wajah lebih awal
    }
  });
  const kpi = (ic, warna, val, lbl, foot, tren) => '<div class="card kpi"><div class="top"><span class="ic-tile ' + warna + '" style="width:38px;height:38px">' + icon(ic) + '</span>' + (tren || '') + '</div><div><div class="val">' + val + '</div><div class="lbl">' + esc(lbl) + '</div></div><div class="foot">' + foot.replace(/^(<svg[\s\S]*?<\/svg>)?([\s\S]*)$/, (m, a, b) => (a || '') + '<span>' + b + '</span>') + '</div></div>';
  const quick = (warna, ic, judul, teks, tombol, href, cls) => '<div class="quick ' + warna + '"><div class="ic-tile">' + icon(ic) + '</div><div><h3>' + esc(judul) + '</h3><p>' + esc(teks) + '</p></div><button class="btn ' + cls + ' btn-sm" data-nav="' + href + '">' + esc(tombol) + icon('right', 'sm') + '</button></div>';
  window.K.kpi = kpi; window.K.quick = quick;

  /* =================== PRESENSI =================== */
  function acakVektor(dasar, d) {
    const v = Array.from({ length: 128 }, () => Math.random() - 0.5), n = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    return dasar.map((x, i) => Math.round((x + (v[i] / n) * d) * 1e5) / 1e5);
  }
  function fotoSimulasi(nama) {
    const c = document.createElement('canvas'); c.width = 360; c.height = 480;
    const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 480);
    gr.addColorStop(0, '#DCE6FF'); gr.addColorStop(1, '#9DB4F0'); g.fillStyle = gr; g.fillRect(0, 0, 360, 480);
    g.fillStyle = '#1F4FD8'; g.globalAlpha = 0.85; g.beginPath(); g.arc(180, 190, 82, 0, 7); g.fill(); g.beginPath(); g.ellipse(180, 470, 140, 150, 0, 0, 7); g.fill();
    g.globalAlpha = 1; g.fillStyle = '#fff'; g.font = 'bold 15px Arial'; g.textAlign = 'center'; g.fillText('SIMULASI DEMO', 180, 40); g.font = '13px Arial'; g.fillText(nama, 180, 62); g.fillText(Jam.wib().tgl + ' ' + Jam.wib().jam + ' WIB', 180, 82);
    return c.toDataURL('image/jpeg', 0.75);
  }

  App.halaman('presensi', {
    judul: 'Presensi Kamera', sub: 'Validasi lokasi, wajah, dan waktu server', peran: 'PEGAWAI', segarkan: false,
    render(param, q) {
      const t = App.hariIni();
      const p = param[0] ? Store.penugasan(param[0]) : aktifHariIni()[0];
      if (!p || p.Status !== 'Aktif' || t < p.Tgl_Mulai || t > p.Tgl_Selesai) {
        return '<div class="card att">' + UI.empty('finger', 'Tidak ada presensi yang perlu dilakukan', p ? 'Penugasan ' + p.No_Surat_Tugas + ' tidak aktif hari ini (' + UI.periode(p.Tgl_Mulai, p.Tgl_Selesai) + ').' : 'Anda tidak memiliki penugasan aktif hari ini.', '<button class="btn btn-ghost" data-nav="#/penugasan-saya">' + icon('briefcase') + 'Penugasan saya</button>') + '</div>';
      }
      const h = App.presensiHari(p.ID_Penugasan, t);
      let jenis = q.jenis === 'Pulang' ? 'Pulang' : q.jenis === 'Datang' ? 'Datang' : (h.datang ? 'Pulang' : 'Datang');
      if (h.datang && h.pulang) {
        return '<div class="att"><div class="card">' + UI.empty('okc', 'Presensi hari ini sudah lengkap', 'Datang ' + h.datang.Waktu_Server.slice(11, 16) + ' WIB (' + h.datang.Status + ') · Pulang ' + h.pulang.Waktu_Server.slice(11, 16) + ' WIB (' + h.pulang.Status + ').', '<button class="btn btn-primary" data-nav="#/riwayat">' + icon('history') + 'Lihat riwayat</button>') + '</div></div>';
      }
      if (jenis === 'Datang' && h.datang) jenis = 'Pulang';
      App.st.pres = { p, jenis, geo: null, wajah: { status: 'muat', skor: 0 }, sim: API.DEMO ? (App.st.presSim || { lok: 'dalam', wajah: 'kamera' }) : null };
      const me = Store.pegawai(Sesi.user.idPegawai) || {};
      const refAda = !!Store.d.wajahRef;
      return '<div class="att-wide"><div class="stack">' +
        '<div class="card"><div class="row between wrap" style="gap:8px">' + badge('Presensi ' + jenis, 'info') + '<span class="badge gray">' + icon('shieldok', 'sm') + esc(p.No_Surat_Tugas) + '</span></div>' +
        '<h2 style="margin-top:12px;font-size:20px;line-height:27px">' + esc(p.Tujuan) + '</h2><div class="row muted" style="font-size:13px;margin-top:4px">' + icon('pin', 'sm') + esc(p.Nama_Lokasi) + '</div>' +
        '<div class="li" style="margin-top:12px;font-size:13px">' + icon('clock', 'sm') + '<span class="grow">Masuk: <b style="color:var(--primary-ink)">' + esc(p.Jam_Masuk) + ' WIB</b> <span class="muted">(Tol. ' + p.Toleransi_Menit + ' m)</span></span><span>Pulang: <b>' + esc(p.Jam_Pulang) + ' WIB</b></span></div></div>' +
        '<div class="clock-card"><span class="pill"><i class="live-dot"></i>Waktu Server Resmi Asia/Jakarta</span><div class="t"><span data-jam>' + Jam.wib().jam + '</span><small>WIB</small></div><div class="s">' + icon('lock', 'sm') + 'Waktu dicatat oleh server, bukan jam perangkat</div></div>' +
        '<div class="card"><div class="card-h"><div class="row"><span class="ic-tile green" style="width:40px;height:40px">' + icon('nav') + '</span><div><h3>Verifikasi Geofence GPS</h3><div class="sub">Titik radius lokasi penugasan</div></div></div><span id="geoChip">' + badge('Mencari…', 'gray') + '</span></div>' +
        '<div class="row" style="gap:16px;background:var(--surface-2);border-radius:14px;padding:14px"><div class="grow"><div class="lbl-up">Jarak terukur</div><div id="geoJarak" style="font:800 28px/34px var(--font-head);color:var(--primary-ink)">—</div>' +
        '<div class="row muted" style="font-size:12.5px;gap:6px">' + icon('target', 'sm') + 'Maks: <b style="color:var(--ink)">' + p.Radius_Meter + ' m</b></div><div class="row" id="geoAkurasi" style="font-size:12.5px;gap:6px;margin-top:4px;color:var(--muted)">' + icon('radar', 'sm') + 'Akurasi: —</div></div><div id="geoRadar">' + Charts.radar(null, p.Radius_Meter, false) + '</div></div>' +
        '<p class="muted" id="geoPesan" style="font-size:12.5px;margin-top:10px"></p></div>' +
        (API.DEMO ? '<div class="demo-panel"><b style="color:var(--violet)">' + icon('zap', 'sm') + ' Panel simulasi (mode demo)</b><div class="form-grid" style="margin-top:10px;gap:10px">' +
          '<div class="field"><label>Lokasi</label><select class="select" data-ganti="simLok"><option value="dalam"' + (App.st.pres.sim.lok === 'dalam' ? ' selected' : '') + '>Simulasi: dalam radius</option><option value="luar"' + (App.st.pres.sim.lok === 'luar' ? ' selected' : '') + '>Simulasi: di luar radius</option><option value="asli"' + (App.st.pres.sim.lok === 'asli' ? ' selected' : '') + '>GPS asli perangkat</option></select></div>' +
          '<div class="field"><label>Wajah</label><select class="select" data-ganti="simWajah"><option value="kamera"' + (App.st.pres.sim.wajah === 'kamera' ? ' selected' : '') + '>Kamera (simulasi cocok bila tanpa kamera)</option><option value="cocok"' + (App.st.pres.sim.wajah === 'cocok' ? ' selected' : '') + '>Simulasi: wajah cocok</option><option value="tidak"' + (App.st.pres.sim.wajah === 'tidak' ? ' selected' : '') + '>Simulasi: wajah tidak cocok</option></select></div></div></div>' : '') +
        '</div><div class="stack">' +
        '<div class="card"><div class="card-h"><div class="row"><span class="ic-tile violet" style="width:40px;height:40px">' + icon('face') + '</span><div><h3>Kamera Biometrik Wajah</h3><div class="sub">Deteksi & pencocokan dengan foto referensi</div></div></div>' +
        '<div class="row" style="gap:6px"><button class="btn-icon btn" data-aksi="kamGanti" title="Ganti kamera" aria-label="Ganti kamera">' + icon('flip', 'sm') + '</button><button class="btn-icon btn" data-aksi="kamUlang" title="Pindai ulang" aria-label="Pindai ulang">' + icon('refresh', 'sm') + '</button></div></div>' +
        '<div class="cam" id="cam"><video id="vid" class="mirror" playsinline muted></video><div class="oval" id="oval"></div><div class="scanline" id="scan"></div>' +
        '<div class="chips-top" id="camChips"><span class="cchip">' + icon('cam', 'sm') + 'Menyiapkan kamera…</span></div>' +
        '<div class="score" id="camSkor" style="display:none"></div><div class="msg hide" id="camMsg"></div></div>' +
        '<div class="li" style="margin-top:12px;font-size:12.5px;align-items:flex-start;background:var(--primary-50);border-color:var(--primary-100)">' + icon('info', 'sm') + '<span>Posisikan wajah tepat di dalam bingkai oval. Pastikan pencahayaan cukup, lepas masker dan kacamata hitam. Sistem membutuhkan 3 bingkai berturut-turut yang cocok.</span></div>' +
        (!refAda ? '<div class="alert bad" style="margin-top:12px">' + icon('alert') + '<span style="font-size:13px"><b>Foto referensi wajah belum terdaftar.</b> Presensi tidak dapat diverifikasi. Hubungi admin kepegawaian.</span></div>' : '') + '</div>' +
        '<button class="btn btn-primary btn-lg btn-block" id="btnKirim" data-aksi="kirimPresensi" disabled>' + icon('finger') + 'Kirim Presensi ' + jenis + ' (<span data-jam="hm">' + Jam.wib().hm + '</span> WIB)</button>' +
        '<p class="muted center" style="font-size:12px">' + icon('cloud', 'sm').replace('class="ic sm"', 'class="ic sm" style="display:inline;vertical-align:-3px"') + ' Foto presensi & koordinat tersimpan di Google Drive instansi (privat).</p>' +
        '<button class="li click" data-aksi="tipsGps" style="width:100%;text-align:left;border:1px solid var(--border)"><span class="ic-tile orange" style="width:36px;height:36px">' + icon('help', 'sm') + '</span><span class="grow"><b style="font-size:13.5px">Mengalami kendala titik lokasi?</b><div class="cell-sub">Panduan kalibrasi GPS & izin perangkat</div></span>' + icon('chr', 'sm') + '</button>' +
        '</div></div>';
    },
    mount() {
      const S = App.st.pres;
      if (!S) return;
      const p = S.p, ref = Store.d.wajahRef, ambang = +App.s('AMBANG_WAJAH', 75);
      const sim = S.sim;
      /* ---- Lokasi ---- */
      const terapkanGeo = (g) => {
        S.geo = g;
        const j = Math.round(Geo.haversine(g.lat, g.lng, +p.Latitude, +p.Longitude)), batasAk = +App.s('BATAS_AKURASI_GPS', 100);
        g.jarak = j; g.ok = j <= +p.Radius_Meter && !(g.akurasi > batasAk);
        UI.$('#geoJarak').textContent = angka(j) + ' meter';
        UI.$('#geoJarak').style.color = g.ok ? 'var(--primary-ink)' : 'var(--danger)';
        UI.$('#geoAkurasi').innerHTML = icon('radar', 'sm') + 'Akurasi <b style="color:' + (g.akurasi <= 20 ? 'var(--success-ink)' : g.akurasi <= batasAk ? 'var(--warning-ink)' : 'var(--danger-ink)') + '">±' + g.akurasi + ' m (' + (g.akurasi <= 20 ? 'Kuat' : g.akurasi <= batasAk ? 'Sedang' : 'Lemah') + ')</b>';
        UI.$('#geoRadar').innerHTML = Charts.radar(j, +p.Radius_Meter, g.ok);
        UI.$('#geoChip').innerHTML = g.ok ? badge('Dalam Area', 'ok') : badge(j > +p.Radius_Meter ? 'Di Luar Area' : 'Akurasi Lemah', 'bad');
        UI.$('#geoPesan').textContent = g.ok ? '' : j > +p.Radius_Meter ? 'Anda berada ' + angka(j - p.Radius_Meter) + ' m di luar radius ' + p.Nama_Lokasi + '. Mendekatlah ke titik lokasi.' : 'Akurasi GPS terlalu rendah. Pindah ke area terbuka.';
        cekSiap();
      };
      const errGeo = (e) => {
        S.geo = null;
        UI.$('#geoChip').innerHTML = badge('GPS Bermasalah', 'bad');
        UI.$('#geoPesan').innerHTML = esc(Geo.pesan(e)) + ' <button class="link" data-aksi="tipsGps">Panduan</button>';
        cekSiap();
      };
      if (sim && sim.lok !== 'asli') {
        const off = sim.lok === 'dalam' ? 0.0003 : 0.0042; // ±34 m / ±470 m
        const t = setTimeout(() => terapkanGeo({ lat: +p.Latitude + off * 0.9, lng: +p.Longitude + off * 0.45, akurasi: sim.lok === 'dalam' ? 4 : 9 }), 600);
        App.bersih.push(() => clearTimeout(t));
      } else {
        App.bersih.push(Geo.pantau(terapkanGeo, errGeo));
      }
      /* ---- Kamera & wajah ---- */
      const vid = UI.$('#vid'), chips = UI.$('#camChips'), skorEl = UI.$('#camSkor'), oval = UI.$('#oval'), msg = UI.$('#camMsg');
      let stream = null, timer = null, stabil = 0, terbaik = null, depan = true, berhenti = false;
      App.bersih.push(() => { berhenti = true; clearTimeout(timer); Wajah.hentikan(stream); });
      const tampil = (status, skor, teks) => {
        S.wajah.status = status; S.wajah.skor = skor || 0;
        const ok = status === 'cocok';
        oval.className = 'oval' + (ok ? ' ok' : status === 'tidak' || status === 'banyak' ? ' bad' : '');
        UI.$('#scan').style.display = ok || status === 'error' ? 'none' : '';
        chips.innerHTML = '<span class="cchip"><i class="live-dot" style="' + (ok ? '' : 'background:#FBBF24') + '"></i>' + esc(teks) + '</span>' + (ok ? '<span class="cchip">' + icon('shieldok', 'sm') + 'Server memverifikasi ulang</span>' : '');
        if (skor != null && status !== 'muat' && status !== 'error') {
          const w = ok ? '#4ADE80' : skor >= ambang ? '#FBBF24' : '#F87171';
          skorEl.style.display = 'flex';
          skorEl.innerHTML = Charts.cincin(skor, w) + '<div class="grow"><b>Skor Kecocokan</b><small>Ambang batas kedinasan: ' + ambang + '%</small></div>' + (ok ? '<span class="badge ok">LOLOS</span>' : status === 'tidak' ? '<span class="badge bad">BELUM COCOK</span>' : '');
        } else skorEl.style.display = 'none';
        cekSiap();
      };
      const pesan = (ic, judul, teks, tombol) => { msg.classList.remove('hide'); msg.innerHTML = '<div><div class="ic-tile">' + icon(ic) + '</div><b style="color:#fff;font-family:var(--font-head)">' + esc(judul) + '</b><p style="font-size:13px;margin-top:4px">' + esc(teks) + '</p>' + (tombol || '') + '</div>'; };
      const cekSiap = () => {
        const b = UI.$('#btnKirim');
        if (b) b.disabled = !(S.geo && S.geo.ok && S.wajah.status === 'cocok' && S.wajah.desc && !S.kirim);
      };
      const simulasi = (cocok) => {
        tampil('cari', null, 'Simulasi pemindaian wajah…');
        let n = 0;
        const langkah = () => {
          if (berhenti) return;
          n++;
          const sk = cocok ? Math.min(94, 40 + n * 14) : Math.min(58, 30 + n * 7);
          if (n < 4) { tampil(sk >= ambang ? 'cari' : 'tidak', sk, 'Mencocokkan wajah… (' + n + '/3)'); timer = setTimeout(langkah, 450); return; }
          const base = ref || (window.DemoServer && window.DemoServer.vektorRef()) || Array(128).fill(0);
          S.wajah.desc = acakVektor(base, cocok ? 0.245 : 0.65);
          S.wajah.foto = fotoSimulasi(Sesi.user.nama);
          S.wajah.skorKlien = Wajah.skor(Wajah.jarak(S.wajah.desc, base));
          tampil(cocok ? 'cocok' : 'tidak', S.wajah.skorKlien, cocok ? 'Wajah terdeteksi & cocok (simulasi)' : 'Wajah tidak cocok (simulasi)');
          if (!cocok) { S.wajah.status = 'cocok'; cekSiap(); S.wajah.status = 'tidak'; const b = UI.$('#btnKirim'); if (b && S.geo) b.disabled = false; } // demo: izinkan kirim untuk melihat layar penolakan
        };
        timer = setTimeout(langkah, 700);
      };
      const loop = async () => {
        if (berhenti || S.kirim) return;
        try {
          const r = await Wajah.deteksi(vid);
          if (berhenti) return;
          if (r.jumlah === 0) { stabil = 0; tampil('cari', null, 'Arahkan wajah ke dalam bingkai'); }
          else if (r.jumlah > 1) { stabil = 0; tampil('banyak', 0, 'Terdeteksi ' + r.jumlah + ' wajah — hanya Anda di bingkai'); }
          else {
            const sk = Wajah.skor(Wajah.jarak(r.desc, ref));
            if (sk >= ambang) {
              stabil++;
              if (!terbaik || sk >= terbaik.sk) terbaik = { sk, desc: r.desc, foto: UI.kompres(vid, 480, 0.8) };
              if (stabil >= 3) {
                Object.assign(S.wajah, { desc: terbaik.desc, foto: terbaik.foto, skorKlien: terbaik.sk });
                tampil('cocok', terbaik.sk, 'Wajah terdeteksi & cocok');
                return; // berhenti memindai; tekan "pindai ulang" bila perlu
              }
              tampil('cari', sk, 'Menahan posisi… (' + stabil + '/3)');
            } else { stabil = 0; terbaik = null; tampil('tidak', sk, 'Wajah belum cocok dengan referensi'); }
          }
        } catch (e) { /* bingkai dilewati */ }
        timer = setTimeout(loop, 380);
      };
      const mulai = async () => {
        msg.classList.add('hide'); stabil = 0; terbaik = null; S.wajah = { status: 'muat', skor: 0 };
        clearTimeout(timer); Wajah.hentikan(stream); stream = null;
        if (sim && sim.wajah !== 'kamera') { vid.style.display = 'none'; return simulasi(sim.wajah === 'cocok'); }
        if (!ref) { tampil('error', null, 'Foto referensi belum terdaftar'); return pesan('face', 'Foto referensi belum terdaftar', 'Minta admin mendaftarkan foto wajah Anda.'); }
        tampil('muat', null, 'Menyalakan kamera…');
        try {
          stream = await Wajah.kamera(vid, depan);
          if (berhenti) { Wajah.hentikan(stream); return; }
          vid.style.display = ''; vid.classList.toggle('mirror', depan);
          tampil('muat', null, 'Memuat model pengenalan wajah…');
          await Wajah.muat((t) => { if (!berhenti && S.wajah.status === 'muat') tampil('muat', null, t); });
          if (berhenti) return;
          tampil('cari', null, 'Arahkan wajah ke dalam bingkai');
          loop();
        } catch (e) {
          if (sim) { vid.style.display = 'none'; return simulasi(true); } // demo tanpa kamera → simulasi
          tampil('error', null, 'Kamera / modul wajah bermasalah');
          pesan('cam', 'Tidak dapat memindai wajah', e.message, '<button class="btn btn-white btn-sm" style="margin-top:12px" data-aksi="kamUlang">' + icon('refresh', 'sm') + 'Coba lagi</button>');
        }
      };
      App.aksi('kamUlang', () => mulai());
      App.aksi('kamGanti', () => { depan = !depan; mulai(); });
      App.ubah('simLok', (el) => { App.st.presSim = Object.assign({}, sim, { lok: el.value }); App.segarkan(true); });
      App.ubah('simWajah', (el) => { App.st.presSim = Object.assign({}, sim, { wajah: el.value }); App.segarkan(true); });
      mulai();
    }
  });

  App.aksi('kirimPresensi', (btn) => {
    const S = App.st.pres;
    if (!S || !S.geo || !S.wajah.desc) return UI.toast('Lokasi dan wajah belum terverifikasi.', 'warn');
    S.kirim = true;
    UI.sibuk(btn, async () => {
      try {
        const r = await API.api('presensi.kirim', {
          idPenugasan: S.p.ID_Penugasan, jenis: S.jenis, lat: S.geo.lat, lng: S.geo.lng, akurasi: S.geo.akurasi,
          deskriptor: S.wajah.desc, foto: S.wajah.foto, skorKlien: S.wajah.skorKlien, perangkat: (navigator.userAgent.match(/\(([^)]+)\)/) || [])[1] || 'web'
        }, { timeout: 60000 });
        if (r.diterima) {
          const row = {}; r.h.forEach((k, i) => { row[k] = r.presensi[i]; });
          Store.upsert('presensi', [row], 'ID_Presensi');
          if (r.rekap) Store.upsert('rekap', [r.rekap], 'ID_Penugasan');
        }
        App.hasil = { r, p: S.p, jenis: S.jenis, foto: S.wajah.foto };
        App.go('#/hasil');
      } catch (e) {
        S.kirim = false;
        UI.toast(e.message, 'bad', 'Presensi gagal dikirim');
      }
    });
  });

  /* =================== HASIL PRESENSI =================== */
  App.halaman('hasil', {
    judul: 'Hasil Verifikasi Kehadiran', sub: 'Divalidasi oleh server', peran: 'PEGAWAI', segarkan: false,
    render() {
      const H = App.hasil;
      if (!H) { setTimeout(() => App.go('#/beranda'), 0); return ''; }
      const { r, p, jenis } = H, c = r.cek, me = Sesi.user;
      if (r.diterima) {
        const row = {}; r.h.forEach((k, i) => { row[k] = r.presensi[i]; });
        const kls = row.Status === 'Tepat Waktu' ? 'ok' : row.Status === 'Terlambat' ? 'warn' : 'bad';
        const pr = Math.round((r.hariKe / r.totalHari) * 100);
        return '<div class="result"><div class="seal ok"><span>' + icon('check', 'xl') + '</span></div><div>' + badge('Presensi ' + jenis + ' · ' + row.Status.toUpperCase(), kls) + '</div>' +
          '<h1>Presensi Berhasil Diverifikasi!</h1><p>Data kehadiran dinas Anda telah divalidasi oleh server dan tersimpan di sistem SPPD.</p>' +
          '<div class="card"><div class="li" style="align-items:center;gap:14px">' + (H.foto ? '<div style="position:relative;flex:none"><img src="' + H.foto + '" alt="Foto presensi" style="width:84px;height:84px;object-fit:cover;border-radius:14px"><span style="position:absolute;left:0;right:0;bottom:0;background:var(--success);color:#fff;font-size:10.5px;font-weight:700;text-align:center;border-radius:0 0 14px 14px;padding:2px">VALID</span></div>' : UI.avatar(me.nama, 'lg')) +
          '<div class="grow"><div class="row" style="color:var(--success-ink);font-weight:700;font-size:13px;gap:6px">' + icon('shieldok', 'sm') + 'Biometrik terverifikasi</div><b style="font-family:var(--font-head);font-size:16px">' + esc(me.nama) + '</b><div class="row wrap" style="gap:6px;margin-top:6px">' + badge('Skor ' + row.Skor_Wajah + '% · Lolos', 'ok', false) + '<span class="cell-sub" style="margin:0">ambang ' + c.wajah.ambang + '%</span></div></div></div>' +
          '<div style="margin-top:16px"><div class="lbl-up">Surat tugas (ST)</div><div class="row" style="margin-top:4px;gap:8px">' + icon('clipboard') + '<div><b style="color:var(--primary-ink)">' + esc(p.No_Surat_Tugas) + '</b><div style="font-size:13px">' + esc(p.Tujuan) + '</div></div></div></div>' +
          '<div class="divider" style="margin:14px 0"></div><dl class="kv"><dt>' + icon('clock', 'sm') + ' Waktu server</dt><dd><span class="tnum">' + esc(row.Waktu_Server.slice(11)) + ' WIB</span><div class="cell-sub" style="font-weight:400">' + tgl(row.Tanggal, 'panjang') + '</div></dd>' +
          '<dt>' + icon('pin', 'sm') + ' Lokasi validasi</dt><dd>' + esc(p.Nama_Lokasi) + '</dd><dt>Jarak ke titik</dt><dd style="color:var(--success-ink)">' + row.Jarak_Meter + ' m (radius ' + c.lokasi.radius + ' m)</dd>' +
          '<dt>Presisi GPS</dt><dd>±' + row.Akurasi_GPS + ' m</dd>' + (row.Selisih_Menit ? '<dt>Selisih jadwal</dt><dd style="color:var(--' + (row.Selisih_Menit > 0 ? 'warning' : 'danger') + '-ink)">' + (row.Selisih_Menit > 0 ? '+' : '') + row.Selisih_Menit + ' menit</dd>' : '') + '</dl>' +
          '<div class="divider" style="margin:14px 0"></div><div class="row between"><div><div class="lbl-up">ID log presensi</div><b class="mono">' + esc(row.ID_Presensi) + '</b></div>' + badge(row.Verifikasi) + '</div>' +
          (row.Verifikasi === 'Perlu Tinjauan' ? '<p class="muted" style="font-size:12.5px;margin-top:8px">Presensi diterima dan akan ditinjau admin (' + esc(row.Catatan) + ').</p>' : '') + '</div>' +
          '<div class="card" style="background:var(--primary-50);border-color:var(--primary-100)"><div class="row between"><div class="row"><span class="ic-tile" style="background:var(--surface)">' + icon('money') + '</span><b style="color:var(--primary-ink)">DAMPAK HAK SPPD</b></div><span class="badge solid">' + (r.rekap ? r.rekap.Hari_Hadir_Lengkap + '/' + r.rekap.Jumlah_Hari_Dinas + ' lengkap' : '') + '</span></div>' +
          '<p style="margin-top:10px;font-weight:600">Akumulasi hari dinas: <span style="color:var(--primary-ink)">Hari ke-' + r.hariKe + ' dari ' + r.totalHari + ' hari</span></p>' +
          '<p class="muted" style="font-size:13px;margin:4px 0 10px">' + (jenis === 'Datang' ? 'Presensi datang tercatat. Hari dinas dihitung lengkap setelah presensi pulang.' : 'Hari ini tercatat lengkap (datang & pulang) sebagai dasar verifikasi SPPD.') + '</p>' + UI.progress(pr) +
          (jenis === 'Datang' ? '<div class="li" style="margin-top:12px;background:var(--surface)">' + icon('clock') + '<span style="font-size:13.5px">Lakukan <b style="color:var(--primary-ink)">Presensi Pulang</b> mulai pukul <b>' + esc(p.Jam_Pulang) + ' WIB</b>.</span></div>' : '') + '</div>' +
          '<button class="btn btn-primary btn-lg btn-block" data-nav="#/riwayat">' + icon('history') + 'Lihat Riwayat Presensi</button><button class="btn btn-ghost btn-lg btn-block" data-nav="#/beranda">' + icon('home') + 'Kembali ke Beranda</button>' +
          '<p class="muted" style="font-size:12px">' + icon('sync', 'sm').replace('class="ic sm"', 'class="ic sm" style="display:inline;vertical-align:-3px;color:var(--success)"') + ' Tersinkronisasi otomatis dengan Google Sheets & Drive</p></div>';
      }
      const lolos = [c.lokasi, c.wajah, c.waktu].filter((x) => x && x.ok).length;
      const blok = (ic, warna, judul, x, kiri, kanan, catatan) => '<div class="vcheck"><div class="row between"><div class="row"><span class="ic-tile ' + warna + '" style="width:36px;height:36px">' + icon(ic, 'sm') + '</span><b style="font-family:var(--font-head)">' + judul + '</b></div>' + badge(x.ok ? 'Lolos' : x.label || 'Gagal', x.ok ? 'ok' : warna === 'yellow' ? 'warn' : 'bad', false) + '</div>' +
        '<div class="two">' + kiri + kanan + '</div>' + (!x.ok ? '<div class="alert ' + (warna === 'yellow' ? 'yellow' : 'bad') + '" style="margin-top:10px;padding:10px 12px;font-size:13px">' + icon('info', 'sm') + '<span>' + esc(x.pesan) + '</span></div>' : catatan ? '<p class="muted" style="font-size:12px;margin-top:8px">' + esc(catatan) + '</p>' : '') + '</div>';
      const box = (l, v, w) => '<div class="box"><small>' + l + '</small><b style="color:' + (w || 'var(--ink)') + '">' + v + '</b></div>';
      const tips = [];
      if (!c.lokasi.ok) tips.push('Pastikan Anda sudah berada di dalam radius resmi lokasi penugasan.', 'Buka Google Maps sejenak untuk mengkalibrasi akurasi GPS.');
      if (!c.wajah.ok) tips.push('Hadapkan wajah ke sumber cahaya terang tanpa masker/topi/kacamata hitam saat pemindaian.');
      if (!c.waktu.ok) tips.push('Periksa jadwal penugasan: ' + c.waktu.pesan + '.');
      tips.push('Jika berada di basemen atau blind spot sinyal, laporkan segera ke Admin Kepegawaian.');
      return '<div class="result"><div class="seal bad"><span>' + icon('x', 'xl') + '</span></div><div>' + badge('Presensi ditolak sistem', 'bad') + '</div><h1>Presensi Gagal Diverifikasi</h1><p>Kehadiran tidak dapat dicatat karena tidak memenuhi ketentuan kedinasan yang ditetapkan admin.</p>' +
        '<div class="card"><div class="row between" style="margin-bottom:12px"><b class="row" style="gap:8px">' + icon('clipboard', 'sm') + 'HASIL VALIDASI 3 TITIK</b><span style="font-size:12.5px;font-weight:700;color:var(--danger)">' + lolos + ' lolos · ' + (3 - lolos) + ' gagal</span></div><div class="stack" style="gap:12px">' +
        blok('pin', 'red', 'Geofence Lokasi GPS', Object.assign({ label: c.lokasi.jarak > c.lokasi.radius ? 'Di luar radius' : 'Gagal' }, c.lokasi), box('Jarak terdeteksi', c.lokasi.jarak == null ? '—' : angka(c.lokasi.jarak) + ' meter', c.lokasi.ok ? '' : 'var(--danger)'), box('Batas maksimal', c.lokasi.radius + ' meter'), 'Akurasi GPS ±' + c.lokasi.akurasi + ' m') +
        blok('face', 'yellow', 'Verifikasi Wajah Biometrik', Object.assign({ label: 'Gagal verifikasi' }, c.wajah), box('Skor kecocokan', c.wajah.skor + '%', c.wajah.ok ? 'var(--success-ink)' : 'var(--warning-ink)'), box('Ambang batas minimal', c.wajah.ambang + '%')) +
        blok('clock', c.waktu.ok ? 'green' : 'red', 'Waktu Server', Object.assign({ label: 'Di luar jadwal' }, c.waktu), box('Waktu percobaan', esc(String(c.waktu.waktu || r.waktuServer.slice(11))) + ' WIB'), box('Status', c.waktu.ok ? 'Dalam jadwal' : 'Ditolak', c.waktu.ok ? 'var(--success-ink)' : 'var(--danger)')) +
        '</div></div><div class="steps-help"><b class="row" style="gap:8px">' + icon('help', 'sm') + 'Langkah penanganan kendala</b><ol>' + tips.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ol></div>' +
        '<button class="btn btn-primary btn-lg btn-block" data-nav="#/presensi/' + p.ID_Penugasan + '?jenis=' + jenis + '">' + icon('refresh') + 'Coba Lagi Presensi</button>' +
        '<button class="btn btn-ghost btn-lg btn-block" data-aksi="tipsGps">' + icon('target') + 'Panduan Kalibrasi GPS Akurasi Tinggi</button>' +
        (App.s('WA_HELPDESK') ? '<a class="link" style="justify-content:center" target="_blank" rel="noopener" href="https://wa.me/62' + esc(String(App.s('WA_HELPDESK')).replace(/^0/, '')) + '">' + icon('wa', 'sm') + 'Hubungi Admin Kepegawaian via WhatsApp</a>' : '') +
        '<div class="li" style="font-size:12px;color:var(--muted)">' + icon('shield', 'sm') + 'Percobaan presensi yang ditolak tetap tercatat di log audit keamanan sistem.</div></div>';
    }
  });

  /* =================== PENUGASAN SAYA =================== */
  App.halaman('penugasan-saya', {
    judul: 'Penugasan Saya', sub: 'Surat tugas perjalanan dinas Anda', peran: 'PEGAWAI',
    render() {
      const f = App.st.pngSaya = App.st.pngSaya || 'Berjalan';
      const semua = Store.d.penugasan.slice().sort((a, b) => b.Tgl_Mulai.localeCompare(a.Tgl_Mulai));
      const grup = { Berjalan: [], Terjadwal: [], Selesai: [] };
      semua.forEach((p) => { const s = App.statusPng(p); (grup[s] || (grup.Selesai)).push(p); });
      const daftar = f === 'Semua' ? semua : grup[f] || [];
      const chip = (n, c) => '<button class="chip' + (f === n ? ' on' : '') + '" data-aksi="pngSaya" data-f="' + n + '">' + n + '<span class="n">' + c + '</span></button>';
      return '<div class="stack"><div class="chips">' + chip('Berjalan', grup.Berjalan.length) + chip('Terjadwal', grup.Terjadwal.length) + chip('Selesai', grup.Selesai.length) + chip('Semua', semua.length) + '</div>' +
        (daftar.length ? '<div class="grid g2">' + daftar.map((p) => {
          const r = K.rekapDari(p), t = App.hariIni(), n = App.hariDinas(p), ke = Math.max(0, Math.min(n, UI.selisihHari(p.Tgl_Mulai, t) + 1));
          return '<div class="card click" style="cursor:pointer" data-nav="#/penugasan/' + p.ID_Penugasan + '"><div class="row between"><span class="badge gray">' + icon('file', 'sm') + esc(p.No_Surat_Tugas) + '</span>' + K.infoStatus(p) + '</div>' +
            '<h3 style="margin-top:12px">' + esc(p.Tujuan) + '</h3><div class="row muted" style="font-size:13px;margin-top:4px">' + icon('pin', 'sm') + esc(p.Nama_Lokasi) + '</div>' +
            '<div class="row between" style="margin-top:12px;font-size:13px"><span>' + icon('cal', 'sm').replace('class="ic sm"', 'class="ic sm" style="display:inline;vertical-align:-3px"') + ' ' + UI.periode(p.Tgl_Mulai, p.Tgl_Selesai) + '</span><b>' + n + ' hari</b></div>' +
            (App.statusPng(p) === 'Berjalan' ? '<div style="margin-top:8px">' + UI.progress((ke / n) * 100) + '</div>' : '') +
            '<div class="row between" style="margin-top:12px;font-size:12.5px"><span class="muted">Hadir lengkap <b style="color:var(--ink)">' + r.Hari_Hadir_Lengkap + '/' + r.Jumlah_Hari_Dinas + '</b></span><span class="muted">Estimasi <b style="color:var(--primary-ink)">' + rupiah(r.Estimasi_Uang_Harian) + '</b></span></div></div>';
        }).join('') + '</div>' : '<div class="card">' + UI.empty('briefcase', 'Tidak ada penugasan ' + f.toLowerCase(), 'Penugasan dari admin akan tampil di sini.') + '</div>') + '</div>';
    }
  });
  App.aksi('pngSaya', (b) => { App.st.pngSaya = b.dataset.f; App.segarkan(true); });

  /* =================== DETAIL PENUGASAN (pegawai & admin) =================== */
  App.halaman('penugasan-detail', {
    judul: 'Detail Penugasan & SPPD', sub: (pm) => { const p = Store.d && Store.penugasan(pm[0]); return p ? 'No: ' + p.No_Surat_Tugas : ''; }, peran: 'SEMUA',
    render(pm) {
      const p = Store.penugasan(pm[0]);
      if (!p) return '<div class="card">' + UI.empty('search', 'Penugasan tidak ditemukan', 'Data mungkin sudah dihapus atau bukan milik Anda.', '<button class="btn btn-ghost" data-nav="#/' + (App.admin ? 'penugasan' : 'penugasan-saya') + '">Kembali</button>') + '</div>';
      const g = App.peg(p.ID_Pegawai), r = K.rekapDari(p), n = App.hariDinas(p), t = App.hariIni();
      const rows = K.presensiDari(p);
      const st = App.statusPng(p), ke = Math.max(0, Math.min(n, UI.selisihHari(p.Tgl_Mulai, t) + 1));
      const pr = UI.pct(+r.Hari_Hadir_Lengkap, n);
      const hariIni = st === 'Berjalan' ? App.presensiHari(p.ID_Penugasan, t) : null;
      const aksiPeg = !App.admin && hariIni ? '<div class="grid g2" style="gap:10px">' + (hariIni.datang ? '<div class="btn btn-ghost btn-lg" style="cursor:default">' + icon('okc') + 'Datang ' + hariIni.datang.Waktu_Server.slice(11, 16) + '</div>' : '<button class="btn btn-primary btn-lg" data-nav="#/presensi/' + p.ID_Penugasan + '?jenis=Datang">' + icon('finger') + 'Presensi Datang</button>') +
        (hariIni.pulang ? '<div class="btn btn-ghost btn-lg" style="cursor:default">' + icon('okc') + 'Pulang ' + hariIni.pulang.Waktu_Server.slice(11, 16) + '</div>' : '<button class="btn ' + (hariIni.datang ? 'btn-primary' : 'btn-ghost') + ' btn-lg" ' + (hariIni.datang ? '' : 'disabled') + ' data-nav="#/presensi/' + p.ID_Penugasan + '?jenis=Pulang">' + icon('finger') + 'Presensi Pulang</button>') + '</div>' : '';
      const aksiAdm = App.admin ? '<div class="row wrap" style="gap:8px"><button class="btn btn-primary" data-nav="#/penugasan/' + p.ID_Penugasan + '/ubah">' + icon('edit') + 'Ubah</button>' +
        (p.Status !== 'Aktif' ? '<button class="btn btn-success" data-aksi="pngStatus" data-id="' + p.ID_Penugasan + '" data-status="Aktif">' + icon('okc') + 'Aktifkan</button>' : '<button class="btn btn-ghost" data-aksi="pngStatus" data-id="' + p.ID_Penugasan + '" data-status="Selesai">' + icon('check') + 'Tandai selesai</button>') +
        (p.Status !== 'Batal' ? '<button class="btn btn-ghost" style="color:var(--danger)" data-aksi="pngStatus" data-id="' + p.ID_Penugasan + '" data-status="Batal">' + icon('xc') + 'Batalkan</button>' : '') + '</div>' : '';
      return '<div class="stack"><div class="row between wrap"><button class="link" data-nav="#/' + (App.admin ? 'penugasan' : 'penugasan-saya') + '">' + icon('left', 'sm') + 'Kembali</button>' + K.infoStatus(p) + '</div>' +
        '<section class="hero"><div class="row between wrap" style="position:relative;z-index:1;gap:8px"><span class="tag">' + icon('file', 'sm') + esc(p.No_Surat_Tugas) + '</span>' + (st === 'Berjalan' ? '<span class="daytag">Hari ' + ke + '/' + n + '</span>' : '<span class="tag">' + esc(st) + '</span>') + '</div>' +
        '<h2 style="font-size:24px;line-height:31px">' + esc(p.Tujuan) + '</h2><div class="loc"><div class="grid g2" style="gap:12px"><div><div style="font-size:12px;color:#C9D7FF;font-weight:600">Waktu kedinasan</div><b style="font:800 17px/24px var(--font-head)">' + UI.periode(p.Tgl_Mulai, p.Tgl_Selesai) + '</b><div style="font-size:12.5px;color:#DCE6FF">' + n + ' hari kerja kalender</div></div>' +
        '<div><div style="font-size:12px;color:#C9D7FF;font-weight:600">Pemberi perintah</div><b style="font:800 17px/24px var(--font-head)">' + esc(p.Pemberi_Perintah || '—') + '</b><div style="font-size:12.5px;color:#DCE6FF">' + (App.admin ? esc(g.Nama) : 'Pelaksana: ' + esc(g.Nama)) + '</div></div></div></div></section>' +
        aksiPeg + aksiAdm +
        '<div class="split"><div class="stack">' +
        '<div class="card"><div class="card-h"><div class="row"><span class="ic-tile">' + icon('pin') + '</span><div><h3>Titik Lokasi & Geofence</h3><div class="sub">' + esc(p.Nama_Lokasi) + (p.Alamat ? ' · ' + esc(p.Alamat) : '') + '</div></div></div>' + badge('Toleransi ' + p.Radius_Meter + ' m', 'ok', false) + '</div>' +
        '<div class="map" id="petaDetail"><div class="map-fallback">' + Charts.radar(0, 1, true) + '<span class="mono">' + (+p.Latitude).toFixed(5) + ', ' + (+p.Longitude).toFixed(5) + '</span></div></div>' +
        '<div class="li" style="margin-top:12px;font-size:13px">' + icon('clock', 'sm') + '<span class="grow"><b>Ketentuan jam kerja</b><div class="cell-sub">Masuk ' + esc(p.Jam_Masuk) + ' (toleransi ' + p.Toleransi_Menit + ' menit, batas ' + K.batasMasuk(p) + ') · Pulang ' + esc(p.Jam_Pulang) + ' WIB</div></span>' + icon('okc', 'sm') + '</div></div>' +
        '<div class="card"><div class="card-h"><div class="row"><span class="ic-tile green">' + icon('clipboard') + '</span><h3>Log Kehadiran Harian</h3></div><span class="muted" style="font-size:12.5px">' + n + ' hari penugasan</span></div><div id="logHarian">' + K.hariHarian(p, rows) + '</div></div>' +
        '</div><div class="stack">' +
        '<div class="card"><div class="lbl-up">Rekapitulasi hak biaya SPPD</div><div class="row between" style="margin-top:6px"><b style="font:800 28px/34px var(--font-head);color:var(--primary-ink)">' + rupiah(r.Estimasi_Uang_Harian) + '</b><span class="ic-tile violet">' + icon('money') + '</span></div>' +
        '<div class="li" style="margin-top:14px;flex-direction:column;align-items:stretch;gap:8px;background:var(--primary-50);border-color:var(--primary-100)"><div class="row between"><b style="font-size:13px">Progres pemenuhan presensi</b><b style="color:var(--primary-ink);font-size:13px">' + pr + '% (' + r.Hari_Hadir_Lengkap + ' dari ' + n + ' hari)</b></div>' + UI.progress(pr) +
        '<span class="cell-sub" style="margin:0">Uang harian diverifikasi bertahap berdasarkan validasi geofence GPS dan biometrik wajah harian.</span></div>' +
        '<dl class="kv" style="margin-top:14px"><dt>Tarif uang harian</dt><dd>' + rupiah(p.Tarif_Harian) + ' / hari</dd><dt>Jumlah hari dinas</dt><dd>' + n + ' hari <span class="formula">(selesai − mulai) + 1</span></dd><dt>Hari hadir lengkap</dt><dd>' + r.Hari_Hadir_Lengkap + ' hari</dd>' +
        '<dt>Terlambat</dt><dd style="color:' + (+r.Jumlah_Terlambat ? 'var(--warning-ink)' : 'inherit') + '">' + r.Jumlah_Terlambat + ' kali</dd><dt>Pulang cepat</dt><dd style="color:' + (+r.Jumlah_Pulang_Cepat ? 'var(--danger-ink)' : 'inherit') + '">' + r.Jumlah_Pulang_Cepat + ' kali</dd><dt>Status SPPD</dt><dd>' + badge(K.statusSppd(r, p)) + '</dd></dl></div>' +
        '<div class="card"><div class="card-h"><h3>Pelaksana tugas</h3></div><div class="hello">' + UI.avatar(g.Nama, 'lg') + '<div><b style="font-family:var(--font-head)">' + esc(g.Nama) + '</b><div class="cell-sub">' + esc(g.Jabatan || '') + '</div><div class="cell-sub">NIP ' + esc(g.NIP || '—') + '</div></div></div>' +
        (p.Catatan ? '<div class="li" style="margin-top:12px;font-size:13px">' + icon('info', 'sm') + esc(p.Catatan) + '</div>' : '') + '</div>' +
        '<button class="btn btn-primary btn-lg btn-block" data-aksi="unduhSppd" data-id="' + p.ID_Penugasan + '">' + icon('dl') + 'Unduh Rekap SPPD (PDF)</button></div></div></div>';
    },
    mount(pm) {
      const p = Store.penugasan(pm[0]);
      if (!p) return;
      Geo.peta(UI.$('#petaDetail'), { lat: +p.Latitude, lng: +p.Longitude, radius: +p.Radius_Meter, interaktif: true });
      if (K.perluMuat(p)) {
        UI.$('#logHarian').innerHTML = '<div class="days">' + UI.skel(90) + UI.skel(90) + '</div>';
        K.muatLama(p).then(() => { if (App.rute === 'penugasan-detail') App.segarkan(true); }).catch((e) => UI.toast(e.message, 'bad'));
      }
    }
  });
  App.aksi('unduhSppd', (b) => {
    const p = Store.penugasan(b.dataset.id), r = K.rekapDari(p), g = App.peg(p.ID_Pegawai), rows = K.presensiDari(p);
    const hari = [];
    for (let i = 0; i < App.hariDinas(p); i++) {
      const d = UI.tambahHari(p.Tgl_Mulai, i), da = rows.find((x) => x.Tanggal === d && x.Jenis === 'Datang' && x.Verifikasi !== 'Ditolak'), pu = rows.find((x) => x.Tanggal === d && x.Jenis === 'Pulang' && x.Verifikasi !== 'Ditolak');
      hari.push({ hari: i + 1, tgl: UI.tgl(d, 'hari'), datang: da ? da.Waktu_Server.slice(11, 16) + ' (' + da.Status + ')' : '-', pulang: pu ? pu.Waktu_Server.slice(11, 16) + ' (' + pu.Status + ')' : '-', ket: da && pu ? 'Lengkap' : 'Tidak lengkap' });
    }
    UI.eksporPdf('SPPD_' + p.No_Surat_Tugas.replace(/[^\w-]+/g, '_') + '_' + g.Nama.split(',')[0].replace(/\s+/g, '_'),
      'Rekap SPPD ' + p.No_Surat_Tugas + ' — ' + g.Nama, p.Tujuan + ' · ' + p.Nama_Lokasi + ' · ' + UI.periode(p.Tgl_Mulai, p.Tgl_Selesai) + ' · ' + r.Jumlah_Hari_Dinas + ' hari dinas · hadir lengkap ' + r.Hari_Hadir_Lengkap + ' · estimasi ' + rupiah(r.Estimasi_Uang_Harian),
      [{ l: 'Hari', k: 'hari' }, { l: 'Tanggal', k: 'tgl' }, { l: 'Datang', k: 'datang' }, { l: 'Pulang', k: 'pulang' }, { l: 'Keterangan', k: 'ket' }], hari);
  });

  /* =================== RIWAYAT =================== */
  App.halaman('riwayat', {
    judul: 'Riwayat Presensi', sub: 'Log presensi GPS & swafoto Anda', peran: 'PEGAWAI',
    render() {
      const f = App.st.riw = App.st.riw || { bulan: App.hariIni().slice(0, 7), jenis: '', status: '', q: '' };
      const sumber = App.st.riwLama && App.st.riwLama.bulan === f.bulan ? App.st.riwLama.rows : Store.d.presensi;
      const rows = sumber.filter((r) => (!f.bulan || r.Tanggal.slice(0, 7) === f.bulan) && (!f.jenis || r.Jenis === f.jenis) && (!f.status || r.Status === f.status || r.Verifikasi === f.status) &&
        (!f.q || ((Store.penugasan(r.ID_Penugasan) || {}).Nama_Lokasi + ' ' + (Store.penugasan(r.ID_Penugasan) || {}).No_Surat_Tugas).toLowerCase().includes(f.q.toLowerCase())));
      App.st.riwRows = rows;
      const bulan = [], hi = App.hariIni(); for (let i = 0; i < 12; i++) { const d = new Date(Date.UTC(+hi.slice(0, 4), +hi.slice(5, 7) - 1 - i, 1)); bulan.push(d.toISOString().slice(0, 7)); }
      const luarJendela = Store.d.jendela && (f.bulan + '-31') < Store.d.jendela.dari;
      return '<div class="stack"><div class="card"><div class="toolbar"><select class="select" style="width:180px" data-ganti="riw" data-k="bulan">' + [...new Set([App.hariIni().slice(0, 7)].concat(bulan))].map((b) => '<option value="' + b + '"' + (b === f.bulan ? ' selected' : '') + '>' + UI.tgl(b + '-01', 'bulan') + '</option>').join('') + '</select>' +
        '<select class="select" style="width:150px" data-ganti="riw" data-k="jenis"><option value="">Semua jenis</option><option' + (f.jenis === 'Datang' ? ' selected' : '') + '>Datang</option><option' + (f.jenis === 'Pulang' ? ' selected' : '') + '>Pulang</option></select>' +
        '<select class="select" style="width:170px" data-ganti="riw" data-k="status"><option value="">Semua status</option>' + ['Tepat Waktu', 'Terlambat', 'Pulang Cepat', 'Perlu Tinjauan', 'Ditolak'].map((s) => '<option' + (f.status === s ? ' selected' : '') + '>' + s + '</option>').join('') + '</select>' +
        '<div class="input-ic grow" style="min-width:180px">' + icon('search') + '<input class="input" placeholder="Cari lokasi / no. surat" value="' + esc(f.q) + '" data-ubah="riwCari"></div>' +
        '<button class="btn btn-ghost" data-aksi="riwEkspor" data-t="xlsx">' + icon('sheet') + 'Excel</button><button class="btn btn-ghost" data-aksi="riwEkspor" data-t="pdf">' + icon('printer') + 'PDF</button></div>' +
        (luarJendela && !(App.st.riwLama && App.st.riwLama.bulan === f.bulan) ? '<div class="alert info" style="margin-top:12px;font-size:13px">' + icon('info') + '<span class="grow">Bulan ini di luar data yang dimuat otomatis.</span><button class="btn btn-sm btn-primary" data-aksi="riwMuat">Muat data bulan ini</button></div>' : '') + '</div>' +
        '<div class="card pad-0" id="riwTabel">' + tabelRiwayat(rows) + '</div></div>';
    }
  });
  function tabelRiwayat(rows) {
    return UI.tabel('riw', {
      data: rows, kunci: 'ID_Presensi', satuan: 'presensi', sortAwal: 'Waktu_Server', dirAwal: -1,
      kolom: [
        { k: 'Waktu_Server', l: 'Waktu Server', r: (r) => '<div class="cell-main tnum">' + esc(r.Waktu_Server.slice(11, 19)) + ' WIB</div><div class="cell-sub">' + tgl(r.Tanggal, 'hari') + '</div>' },
        { k: 'Jenis', l: 'Jenis', r: (r) => badge(r.Jenis) },
        { k: 'ID_Penugasan', l: 'Penugasan & Lokasi', nilai: (r) => (Store.penugasan(r.ID_Penugasan) || {}).Nama_Lokasi, r: (r) => { const p = Store.penugasan(r.ID_Penugasan) || {}; return '<div class="cell-main" style="color:var(--primary-ink)">' + esc(p.No_Surat_Tugas || '') + '</div><div class="cell-sub">' + esc(p.Nama_Lokasi || '') + '</div>'; } },
        { k: 'Jarak_Meter', l: 'Jarak GPS', nilai: (r) => +r.Jarak_Meter, r: (r) => '<div class="cell-main">' + r.Jarak_Meter + ' m</div><div class="cell-sub">±' + r.Akurasi_GPS + ' m</div>' },
        { k: 'Skor_Wajah', l: 'Wajah', nilai: (r) => +r.Skor_Wajah, r: (r) => badge(r.Skor_Wajah + '% cocok', 'info', false) },
        { k: 'Status', l: 'Status', r: (r) => badge(r.Status) + (r.Selisih_Menit ? '<div class="cell-sub">' + (r.Selisih_Menit > 0 ? '+' : '') + r.Selisih_Menit + ' menit</div>' : '') },
        { k: 'Verifikasi', l: 'Verifikasi', r: (r) => badge(r.Verifikasi) }
      ],
      kosong: UI.empty('history', 'Belum ada presensi', 'Presensi pada periode ini akan tampil di sini.')
    });
  }
  App.ubah('riw', (el) => { App.st.riw[el.dataset.k] = el.value; UI.tabelReset('riw'); App.segarkan(true); });
  App.ubah('riwCari', UI.debounce((el) => { App.st.riw.q = el.value; UI.tabelReset('riw'); const f = App.st.riw; const src = App.st.riwLama && App.st.riwLama.bulan === f.bulan ? App.st.riwLama.rows : Store.d.presensi;
    App.st.riwRows = src.filter((r) => (!f.bulan || r.Tanggal.slice(0, 7) === f.bulan) && (!f.jenis || r.Jenis === f.jenis) && (!f.status || r.Status === f.status || r.Verifikasi === f.status) && (!f.q || ((Store.penugasan(r.ID_Penugasan) || {}).Nama_Lokasi + ' ' + (Store.penugasan(r.ID_Penugasan) || {}).No_Surat_Tugas).toLowerCase().includes(f.q.toLowerCase())));
    UI.tabelData('riw', App.st.riwRows); }, 150));
  App.aksi('riwMuat', (b) => UI.sibuk(b, async () => {
    const f = App.st.riw;
    try {
      const pack = await API.api('presensi.list', { dari: f.bulan + '-01', sampai: f.bulan + '-31' });
      App.st.riwLama = { bulan: f.bulan, rows: Store.presensiKompak(pack) }; App.segarkan(true);
    } catch (e) { UI.toast(e.message, 'bad'); }
  }));
  App.aksi('riwEkspor', (b) => {
    const rows = App.st.riwRows || [], nama = 'Riwayat_Presensi_' + Sesi.user.nama.split(',')[0].replace(/\s+/g, '_') + '_' + App.st.riw.bulan;
    if (b.dataset.t === 'xlsx') UI.eksporExcel(nama, K.kolomEksporPresensi(), rows, 'Presensi');
    else UI.eksporPdf(nama, 'Riwayat Presensi — ' + Sesi.user.nama, UI.tgl(App.st.riw.bulan + '-01', 'bulan') + ' · ' + rows.length + ' presensi', K.kolomEksporPresensi().filter((c) => !/NIP|Pegawai|Catatan/.test(c.l)), rows);
  });

  /* =================== REKAP SAYA =================== */
  App.halaman('rekap-saya', {
    judul: 'Rekap SPPD Saya', sub: 'Hari dinas & estimasi uang harian', peran: 'PEGAWAI',
    render() {
      const rows = Store.d.rekap.filter((r) => { const p = Store.penugasan(r.ID_Penugasan); return p && p.Status !== 'Draft'; });
      const hari = rows.reduce((s, r) => s + +r.Jumlah_Hari_Dinas, 0), lengkap = rows.reduce((s, r) => s + +r.Hari_Hadir_Lengkap, 0), uang = rows.reduce((s, r) => s + +r.Estimasi_Uang_Harian, 0);
      App.st.rekSayaRows = rows;
      return '<div class="stack"><div class="grid g4">' + kpi('clipboard', '', rows.length + '<small>penugasan</small>', 'Total penugasan', icon('info', 'sm') + 'Tidak termasuk draft') +
        kpi('cal', 'green', hari + '<small>hari</small>', 'Hari dinas', '<span class="formula">(selesai − mulai) + 1</span>') + kpi('okc', 'violet', angka(UI.pct(lengkap, hari, 1), 1) + '<small>%</small>', 'Presensi lengkap', lengkap + ' dari ' + hari + ' hari') +
        kpi('money', 'orange', '<span style="color:var(--primary-ink)">' + rupiahPendek(uang) + '</span>', 'Estimasi uang harian', 'Hari dinas × tarif') + '</div>' +
        '<div class="card pad-0"><div class="row between wrap" style="padding:18px 20px"><div><h2>Rekap per penugasan</h2><p class="muted" style="font-size:12.5px">Ketuk baris untuk melihat validasi harian</p></div><div class="row"><button class="btn btn-ghost btn-sm" data-aksi="rekSayaEkspor" data-t="xlsx">' + icon('sheet', 'sm') + 'Excel</button><button class="btn btn-ghost btn-sm" data-aksi="rekSayaEkspor" data-t="pdf">' + icon('printer', 'sm') + 'PDF</button></div></div>' +
        K.tabelRekap('rekSaya', rows, false) + '</div></div>';
    }
  });
  App.aksi('rekSayaEkspor', (b) => {
    const rows = App.st.rekSayaRows || [], nama = 'Rekap_SPPD_' + Sesi.user.nama.split(',')[0].replace(/\s+/g, '_');
    if (b.dataset.t === 'xlsx') UI.eksporExcel(nama, K.kolomEksporRekap(), rows, 'Rekap SPPD');
    else UI.eksporPdf(nama, 'Rekap SPPD — ' + Sesi.user.nama, 'NIP ' + (Sesi.user.nip || '-') + ' · dicetak ' + UI.tgl(App.hariIni()), K.kolomEksporRekap().filter((c) => !/Pegawai|NIP|Lokasi/.test(c.l)), rows);
  });

  /* =================== PROFIL =================== */
  App.halaman('profil', {
    judul: 'Profil Saya', sub: 'Data kepegawaian & sesi', peran: 'PEGAWAI',
    render() {
      const u = Sesi.user, me = Store.pegawai(u.idPegawai) || {};
      return '<div class="split"><div class="stack"><div class="card"><div class="hello">' + UI.avatar(u.nama, 'lg') + '<div><h2>' + esc(u.nama) + '</h2><div class="muted">' + esc(u.jabatan || '') + '</div></div></div>' +
        '<dl class="kv" style="margin-top:18px"><dt>NIP</dt><dd>' + esc(me.NIP || u.nip || '—') + '</dd><dt>Unit kerja</dt><dd>' + esc(me.Unit_Kerja || '—') + '</dd><dt>Email</dt><dd>' + esc(u.email) + '</dd><dt>WhatsApp</dt><dd>' + esc(me.No_WA || '—') + (me.Status_WA ? ' ' + badge(me.Status_WA) : '') + '</dd>' +
        '<dt>Foto referensi wajah</dt><dd>' + (me.Punya_Wajah ? badge('Terdaftar', 'ok') : badge('Belum terdaftar', 'warn')) + '</dd><dt>Sesi berakhir</dt><dd>' + (Sesi.exp ? UI.wib(Sesi.exp).hm + ' WIB, ' + UI.tgl(UI.wib(Sesi.exp).tgl) : '—') + '</dd></dl>' +
        '<p class="muted" style="font-size:12.5px;margin-top:14px">Perubahan data kepegawaian dilakukan oleh admin kepegawaian.</p></div></div>' +
        '<div class="stack"><div class="card"><h3>Perangkat & aplikasi</h3><div class="list" style="margin-top:12px">' +
        '<button class="li click" data-aksi="tema" style="width:100%;text-align:left">' + icon('moon') + '<span class="grow"><b>Tema gelap / terang</b><div class="cell-sub">Nyaman dipakai di luar ruangan atau malam hari</div></span></button>' +
        '<button class="li click" data-aksi="pasangApp" style="width:100%;text-align:left">' + icon('dl') + '<span class="grow"><b>Pasang di layar utama</b><div class="cell-sub">Buka lebih cepat seperti aplikasi</div></span></button>' +
        '<button class="li click" data-aksi="tipsGps" style="width:100%;text-align:left">' + icon('target') + '<span class="grow"><b>Izin kamera & lokasi</b><div class="cell-sub">Panduan jika presensi gagal membaca GPS</div></span></button>' +
        '<button class="li click" data-aksi="muatUlang" style="width:100%;text-align:left">' + icon('refresh') + '<span class="grow"><b>Muat ulang data</b><div class="cell-sub">Sinkron terakhir: ' + (API.stat.terakhir ? API.stat.terakhir + ' ms' : '—') + '</div></span></button></div></div>' +
        '<button class="btn btn-ghost btn-lg" style="color:var(--danger)" data-aksi="keluar">' + icon('logout') + 'Keluar dari aplikasi</button></div></div>';
    }
  });
  App.aksi('pasangApp', async () => {
    if (App.pasang) { App.pasang.prompt(); App.pasang = null; }
    else UI.modal({ judul: 'Pasang di layar utama', ikon: 'dl', isi: '<b>Android (Chrome):</b> menu ⋮ → <i>Tambahkan ke Layar utama</i>.<br><b>iPhone (Safari):</b> tombol Bagikan → <i>Tambah ke Layar Utama</i>.', aksi: '<button class="btn btn-primary" data-tutup>OK</button>' });
  });
})();
