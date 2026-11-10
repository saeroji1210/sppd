/* =========================================================
   demo.js — server tiruan di browser (MODE DEMO, GAS_URL kosong).
   Meniru aturan backend agar seluruh alur bisa dicoba tanpa deploy.
   Data disimpan di localStorage perangkat ini saja.
   ========================================================= */
(function () {
  'use strict';
  const KEY = 'siperdin_demo_db_v2';
  const H = ['ID_Presensi', 'ID_Penugasan', 'ID_Pegawai', 'Tanggal', 'Jenis', 'Waktu_Server', 'Latitude', 'Longitude', 'Akurasi_GPS', 'Jarak_Meter', 'Skor_Wajah',
    'Hasil_Wajah', 'Status', 'Selisih_Menit', 'Verifikasi', 'ID_Foto_Bukti', 'Catatan', 'Ditinjau_Oleh', 'Ditinjau_Pada'];
  const now = () => UI.wib(Date.now());
  const waktu = () => { const w = now(); return w.tgl + ' ' + w.jam; };
  let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
  const uid = (p) => p + '-' + now().tgl.slice(2).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  const vektor = (s) => { let x = s; return Array.from({ length: 128 }, () => { x = (x * 9301 + 49297) % 233280; return Math.round(((x / 233280) - 0.5) * 0.2 * 1e5) / 1e5; }); };

  const SETTING = {
    NAMA_APLIKASI: 'SIPERDIN', NAMA_INSTANSI: 'Kementerian / Badan Layanan Umum RI', KONTAK_HELPDESK: '(021) 384-5555', WA_HELPDESK: '081234567890',
    JENIS_AKUN: 'GMAIL', AMBANG_WAJAH: '75', BATAS_AKURASI_GPS: '100', RADIUS_DEFAULT: '100', TOLERANSI_DEFAULT: '15', JAM_MASUK_DEFAULT: '08:00',
    JAM_PULANG_DEFAULT: '17:00', BUKA_PRESENSI_MENIT: '120', PULANG_TANPA_DATANG: 'TOLAK', MENIT_PENGINGAT: '30', JENDELA_PRESENSI_HARI: '45',
    NOTIF_EMAIL_AKTIF: 'true', NOTIF_WA_AKTIF: 'true', WA_JEDA_DETIK: '5', WA_UKURAN_BATCH: '20',
    PENGUMUMAN: 'Mode demo: data contoh tersimpan di browser ini saja. Coba presensi sebagai pegawai, lalu pantau hasilnya sebagai admin.', APP_URL: ''
  };
  const EVENTS = [
    ['PENUGASAN_BARU', 'Penugasan baru diterbitkan', 1, 1], ['PENGINGAT_DATANG', 'Pengingat presensi datang', 1, 1], ['PENGINGAT_PULANG', 'Pengingat presensi pulang', 1, 1],
    ['PRESENSI_TERLAMBAT', 'Presensi terlambat', 1, 0], ['PRESENSI_PULANG_CEPAT', 'Presensi pulang cepat', 1, 0], ['PRESENSI_TINJAUAN', 'Presensi perlu tinjauan admin', 1, 0],
    ['KUOTA_MENIPIS', 'Kuota email hampir habis', 1, 0]
  ];

  function buatDb() {
    seed = 11;
    const t = now().tgl, H0 = (n) => UI.tambahHari(t, n), w0 = t + ' 06:00:00';
    const peg = [
      ['PGW-ADM01', 'Bambang Prasetyo, S.STP', '198005122003121001', 'Kepala Subbag Kepegawaian', 'Bagian Umum', 'bambang.prasetyo@instansi.go.id', '081234567803', 'Admin'],
      ['PGW-00001', 'Rian Pratama, S.T., M.Sc.', '199104122019031002', 'Analis Kebijakan Ahli Muda', 'Biro Perencanaan', 'rian.pratama@instansi.go.id', '081234567801', 'Pegawai'],
      ['PGW-00002', 'Dewi Anggraini, S.T.', '199108152014022001', 'Perencana Tata Ruang', 'Biro Perencanaan', 'dewi.anggraini@instansi.go.id', '081234567802', 'Pegawai'],
      ['PGW-00003', 'Hendra Wijaya, S.E.', '198402192008121003', 'Auditor Madya Keuangan', 'Inspektorat', 'hendra.wijaya@instansi.go.id', '081234567804', 'Pegawai'],
      ['PGW-00004', 'Siti Rahmawati, S.Kom.', '199411032019032007', 'Pranata Komputer Pertama', 'Pusat Data', 'siti.rahmawati@instansi.go.id', '081234567805', 'Pegawai'],
      ['PGW-00005', 'Agung Wicaksono, S.Kom., M.T.', '198607192010011008', 'Pranata Komputer Ahli', 'Pusat Data', 'agung.wicaksono@instansi.go.id', '081234567806', 'Pegawai'],
      ['PGW-00006', 'Rina Kusuma Wardhani, S.P., M.P.', '199103252015032006', 'Perencana Muda', 'Biro Perencanaan', 'rina.kusuma@instansi.go.id', '081234567807', 'Pegawai'],
      ['PGW-00007', 'Ahmad Junaedi, M.Si.', '197805122002121003', 'Analis Anggaran', 'Biro Keuangan', 'ahmad.junaedi@instansi.go.id', '081234567808', 'Pegawai'],
      ['PGW-00008', 'Yulia Puspitasari, S.H.', '199512202020122004', 'Analis Hukum', 'Biro Hukum', 'yulia.puspita@instansi.go.id', '', 'Pegawai']
    ].map((r, i) => ({ ID_Pegawai: r[0], Nama: r[1], NIP: r[2], Jabatan: r[3], Unit_Kerja: r[4], Email: r[5], No_WA: r[6], Peran: r[7], Status: 'Aktif',
      URL_Foto_Referensi: '', ID_Foto_Referensi: i && i < 8 ? 'DEMOREF' + i + 'xxxxxxxxxxxxxxxxx' : '', Deskriptor_Wajah: i && i < 8 ? JSON.stringify(vektor(100 + i)) : '',
      Status_WA: r[6] ? 'Terdaftar' : '', Dibuat_Pada: w0, Diperbarui_Pada: w0 }));
    const L = {
      ikn: ['Kantor Otorita IKN, Sepaku', 'Kec. Sepaku, Penajam Paser Utara, Kalimantan Timur', -0.96541, 116.70281],
      smg: ['Kantor Gubernur Jawa Tengah', 'Jl. Pahlawan No. 9, Semarang', -6.99306, 110.42083],
      jkt: ['Gedung Bappenas', 'Jl. Taman Suropati No. 2, Menteng, Jakarta Pusat', -6.19773, 106.83024],
      sby: ['Kantor BPKP Jawa Timur', 'Jl. Raya Bandara Juanda, Sidoarjo', -7.37812, 112.75645],
      bdg: ['Gedung Sate', 'Jl. Diponegoro No. 22, Bandung', -6.90250, 107.61880],
      hotel: ['Grand Mercure Surabaya City', 'Jl. Sedap Malam No. 1, Surabaya', -7.25960, 112.75020],
      mdn: ['Kantor Gubernur Sumatera Utara', 'Jl. Pangeran Diponegoro No. 30, Medan', 3.58350, 98.67190],
      ckr: ['Pusat Data Nasional', 'Kawasan Industri GIIC, Cikarang', -6.36420, 107.15430],
      bali: ['Kantor Gubernur Bali', 'Jl. Basuki Rahmat, Denpasar', -8.67130, 115.23250]
    };
    const png = [];
    const tambah = (id, pg, no, tujuan, lok, a, b, status, tarif, pemberi) => {
      png.push({ ID_Penugasan: id, ID_Pegawai: pg, No_Surat_Tugas: no, Tujuan: tujuan, Nama_Lokasi: lok[0], Alamat: lok[1], Latitude: lok[2], Longitude: lok[3],
        Radius_Meter: 100, Tgl_Mulai: H0(a), Tgl_Selesai: H0(b), Jam_Masuk: '08:00', Jam_Pulang: '16:00', Toleransi_Menit: 15, Tarif_Harian: tarif,
        Pemberi_Perintah: pemberi || 'Kepala Biro Perencanaan', Status: status, Catatan: '', Dibuat_Oleh: 'bambang.prasetyo@instansi.go.id', Dibuat_Pada: w0, Diperbarui_Pada: w0 });
    };
    const th = t.slice(0, 4);
    tambah('ST-D001', 'PGW-00001', 'ST-' + th + '/XI/0842', 'Audit & Koordinasi Lapangan Otorita IKN', L.ikn, -1, 1, 'Aktif', 430000, 'Direktur Tata Kelola');
    tambah('ST-D002', 'PGW-00002', 'ST-' + th + '/XI/0839', 'Sinkronisasi Rencana Tata Ruang Provinsi', L.smg, -2, 2, 'Aktif', 380000);
    tambah('ST-D003', 'PGW-00003', 'ST-' + th + '/XI/0831', 'Audit Kinerja Keuangan Perwakilan', L.sby, -3, 0, 'Aktif', 410000, 'Inspektur Utama');
    tambah('ST-D004', 'PGW-00004', 'ST-' + th + '/XI/0815', 'Pemeliharaan Infrastruktur Data', L.ckr, -6, -4, 'Selesai', 350000, 'Kepala Pusat Data');
    tambah('ST-D005', 'PGW-00005', 'ST-' + th + '/X/0790', 'Migrasi Sistem Informasi Kepegawaian', L.jkt, -10, -8, 'Selesai', 350000, 'Kepala Pusat Data');
    tambah('ST-D006', 'PGW-00006', 'ST-' + th + '/X/0782', 'Rapat Koordinasi Ketahanan Pangan', L.bdg, -5, -4, 'Selesai', 380000);
    tambah('ST-D007', 'PGW-00007', 'ST-' + th + '/XI/0850', 'Asistensi Penyusunan Anggaran Daerah', L.mdn, 3, 5, 'Aktif', 430000, 'Kepala Biro Keuangan');
    tambah('ST-D008', 'PGW-00001', 'ST-' + th + '/XI/0861', 'Bimtek Tata Kelola SPPD Elektronik', L.hotel, 6, 8, 'Aktif', 410000);
    tambah('ST-D009', 'PGW-00002', 'ST-' + th + '/XI/0870', 'Audit Operasional Balai Wilayah', L.bali, 12, 14, 'Draft', 480000, 'Inspektur Wilayah');
    tambah('ST-D010', 'PGW-00003', 'ST-' + th + '/XI/0870', 'Audit Operasional Balai Wilayah', L.bali, 12, 14, 'Draft', 480000, 'Inspektur Wilayah');
    // riwayat 30 hari untuk grafik tren
    const lokArr = [L.smg, L.jkt, L.bdg, L.sby, L.ckr];
    for (let i = 0; i < 8; i++) {
      const a = -34 + i * 3, b = Math.max(a, Math.min(a + ri(1, 3), -11)), pg = 'PGW-0000' + (1 + (i % 7));
      tambah('ST-H0' + i, pg, 'ST-' + th + '/X/07' + (10 + i), ['Monitoring Program Strategis', 'Evaluasi Pelaksanaan Anggaran', 'Pendampingan Reformasi Birokrasi', 'Survei Kepuasan Layanan'][i % 4], lokArr[i % 5], a, b, 'Selesai', 350000 + (i % 3) * 30000);
    }
    const pres = [];
    const jam = (m, s) => UI.jamDariMenit(m) + ':' + String(s == null ? ri(0, 59) : s).padStart(2, '0');
    const catat = (p, tgl, jenis, mnt, opsi) => {
      opsi = opsi || {};
      const mM = UI.menit(p.Jam_Masuk), mP = UI.menit(p.Jam_Pulang);
      let st = 'Tepat Waktu', sel = 0;
      if (jenis === 'Datang' && mnt > mM + p.Toleransi_Menit) { st = 'Terlambat'; sel = Math.floor(mnt - mM); }
      if (jenis === 'Pulang' && mnt < mP) { st = 'Pulang Cepat'; sel = -Math.ceil(mP - mnt); }
      pres.push({ ID_Presensi: 'PRS-' + tgl.replace(/-/g, '').slice(2) + '-' + p.ID_Pegawai.slice(-3) + jenis[0], ID_Penugasan: p.ID_Penugasan, ID_Pegawai: p.ID_Pegawai, Tanggal: tgl, Jenis: jenis,
        Waktu_Server: tgl + ' ' + jam(mnt), Latitude: p.Latitude + 0.0002, Longitude: p.Longitude + 0.0001, Akurasi_GPS: opsi.ak || ri(3, 12), Jarak_Meter: opsi.jarak || ri(8, 60),
        Skor_Wajah: opsi.skor || ri(86, 98), Hasil_Wajah: 'Lolos', Status: st, Selisih_Menit: sel, Verifikasi: opsi.ver || 'Otomatis',
        ID_Foto_Bukti: 'DEMOFOTO' + pres.length + 'xxxxxxxxxxxxxxx', Catatan: opsi.cat || '', Ditinjau_Oleh: '', Ditinjau_Pada: '' });
    };
    png.forEach((p) => {
      if (p.Status === 'Draft') return;
      for (let d = p.Tgl_Mulai; d <= p.Tgl_Selesai && d < t; d = UI.tambahHari(d, 1)) {
        const r = rnd();
        catat(p, d, 'Datang', r < 0.12 ? ri(476, 520) : ri(445, 474));
        const r2 = rnd();
        if (p.ID_Penugasan === 'ST-D006' && d === p.Tgl_Selesai) catat(p, d, 'Pulang', 912);
        else catat(p, d, 'Pulang', r2 < 0.07 ? ri(900, 955) : ri(962, 1030));
      }
    });
    const byId = (id) => png.find((p) => p.ID_Penugasan === id);
    catat(byId('ST-D002'), t, 'Datang', 464, { jarak: 22 });
    catat(byId('ST-D003'), t, 'Datang', 504, { jarak: 18, skor: 77, ver: 'Perlu Tinjauan', cat: 'skor wajah mendekati ambang' });
    const ant = [];
    pres.slice(-6).forEach((r, i) => ant.push({ AntrianID: 'ANT-' + i, Kanal: i % 2 ? 'EMAIL' : 'WA', Tujuan: i % 2 ? 'pegawai@instansi.go.id' : '0812••••801', NamaPenerima: (peg.find((g) => g.ID_Pegawai === r.ID_Pegawai) || {}).Nama,
      Event: i % 3 ? 'PENGINGAT_DATANG' : 'PRESENSI_TERLAMBAT', Status: 'Terkirim', Percobaan: 1, Respon: 'terkirim', DibuatPada: r.Waktu_Server, DikirimPada: r.Waktu_Server }));
    return { v: 2, peg, png, pres, ant, blast: [], log: [], setting: Object.assign({}, SETTING), matriks: {}, rahasia: { FONNTE_TOKEN: 'demoFonnteToken123', GOOGLE_CLIENT_ID: '', ADMIN_EMAILS: 'bambang.prasetyo@instansi.go.id', DOMAIN_IZIN: '' }, foto: {}, emailTerkirim: 12 };
  }

  let db = null;
  const muat = () => { if (db) return db; try { db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { db = null; } if (!db || db.v !== 2) { db = buatDb(); simpan(); } return db; };
  const simpan = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* kuota penuh: data demo foto dibuang */ db.foto = {}; try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (x) { /* */ } } };
  const log = (email, aksi, detail, ref) => { db.log.push({ Waktu: waktu(), Email: email, Aksi: aksi, Detail: typeof detail === 'string' ? detail : JSON.stringify(detail || {}), RefID: ref || '' }); if (db.log.length > 400) db.log.shift(); };

  /* ---------- Rekap ---------- */
  function hitungRekap(p) {
    const today = now().tgl, hari = UI.selisihHari(p.Tgl_Mulai, p.Tgl_Selesai) + 1, perTgl = {};
    let tl = 0, pc = 0;
    db.pres.forEach((r) => {
      if (r.ID_Penugasan !== p.ID_Penugasan || r.Verifikasi === 'Ditolak') return;
      (perTgl[r.Tanggal] = perTgl[r.Tanggal] || {})[r.Jenis] = true;
      if (r.Status === 'Terlambat') tl++;
      if (r.Status === 'Pulang Cepat') pc++;
    });
    const lengkap = Object.keys(perTgl).filter((k) => perTgl[k].Datang && perTgl[k].Pulang).length;
    let st = p.Status === 'Batal' ? 'Batal' : p.Status === 'Draft' ? 'Draft' : today < p.Tgl_Mulai ? 'Terjadwal' : (today <= p.Tgl_Selesai && p.Status === 'Aktif') ? 'Berjalan' : lengkap >= hari ? 'Siap Dibayar' : 'Perlu Verifikasi';
    return { ID_Penugasan: p.ID_Penugasan, ID_Pegawai: p.ID_Pegawai, No_Surat_Tugas: p.No_Surat_Tugas, Tgl_Mulai: p.Tgl_Mulai, Tgl_Selesai: p.Tgl_Selesai, Jumlah_Hari_Dinas: hari,
      Hari_Hadir_Lengkap: lengkap, Jumlah_Terlambat: tl, Jumlah_Pulang_Cepat: pc, Tarif_Harian: +p.Tarif_Harian || 0, Estimasi_Uang_Harian: hari * (+p.Tarif_Harian || 0), Status_SPPD: st, Diperbarui_Pada: waktu() };
  }
  const semuaRekap = () => db.png.map(hitungRekap);
  const kompak = (rows) => ({ h: H, v: rows.map((r) => H.map((k) => (r[k] == null ? '' : r[k]))) });
  const pubPeg = (r) => { const o = Object.assign({}, r); delete o.Deskriptor_Wajah; o.Punya_Wajah = !!r.Deskriptor_Wajah; return o; };

  /* ---------- Sesi demo ---------- */
  function user(g, darurat) {
    if (darurat) return { email: 'darurat', nama: 'Akses Darurat', role: 'ADMIN', idPegawai: '', jabatan: 'Administrator', nip: '', unit: '', punyaWajah: false, darurat: true };
    return { email: g.Email, nama: g.Nama, role: g.Peran === 'Admin' ? 'ADMIN' : 'PEGAWAI', idPegawai: g.ID_Pegawai, jabatan: g.Jabatan, nip: g.NIP, unit: g.Unit_Kerja, punyaWajah: !!g.Deskriptor_Wajah, darurat: false };
  }
  const login = (u) => { log(u.email, 'LOGIN', { jalur: 'demo' }); return { token: 'demo.' + btoa(unescape(encodeURIComponent(JSON.stringify({ e: u.email, d: u.darurat ? 1 : 0, x: Date.now() + 12 * 3600e3 })))), user: u, exp: Date.now() + 12 * 3600e3 }; };
  function sesi(token) {
    try {
      const p = JSON.parse(decodeURIComponent(escape(atob(String(token).slice(5)))));
      if (p.x < Date.now()) return null;
      if (p.d) return user(null, true);
      const g = db.peg.find((x) => x.Email === p.e && x.Status === 'Aktif');
      return g ? user(g) : null;
    } catch (e) { return null; }
  }
  const salah = (m) => { throw new Error(m); };

  /* ---------- Penangan aksi ---------- */
  const A = {
    'ping': () => ({ app: 'SIPERDIN', v: 'demo', waktu: waktu() }),
    'auth.config': () => ({ clientId: '', namaAplikasi: db.setting.NAMA_APLIKASI, namaInstansi: db.setting.NAMA_INSTANSI, kontak: db.setting.KONTAK_HELPDESK, waHelpdesk: db.setting.WA_HELPDESK, demo: true }),
    'auth.demo': (d) => login(user(db.peg.find((g) => g.ID_Pegawai === (d.peran === 'ADMIN' ? 'PGW-ADM01' : 'PGW-00001')))),
    'auth.google': () => salah('Mode demo tidak memakai Google. Gunakan tombol "Masuk demo".'),
    'auth.kirimKode': (d) => {
      const g = db.peg.find((x) => x.Email === String(d.email || '').trim().toLowerCase() && x.Status === 'Aktif');
      if (g) db._kode = { email: g.Email, kode: '246810' };
      return { terkirim: true, pesan: 'Jika email terdaftar dan aktif, kode 6 digit telah dikirim.', demoKode: g ? '246810' : null };
    },
    'auth.verifikasiKode': (d) => {
      if (!db._kode || db._kode.email !== String(d.email).trim().toLowerCase() || String(d.kode) !== db._kode.kode) salah('Kode salah. Sisa percobaan: 4.');
      return login(user(db.peg.find((x) => x.Email === db._kode.email)));
    },
    'auth.darurat': (d) => { if (d.user !== 'darurat' || d.pass !== 'demo12345') salah('Username atau sandi darurat salah.'); return login(user(null, true)); },
    'auth.logout': () => ({ keluar: true }),

    'boot': (d, s) => {
      const w = now(), jendela = +db.setting.JENDELA_PRESENSI_HARI, batas = UI.tambahHari(w.tgl, -jendela);
      const out = { user: s, settings: Object.assign({}, db.setting), server: { waktu: waktu(), tgl: w.tgl, ms: Date.now(), tz: 'Asia/Jakarta' }, jendela: { dari: batas, hari: jendela } };
      const pres = db.pres.filter((r) => r.Tanggal >= batas);
      if (s.role === 'ADMIN') {
        Object.assign(out, { pegawai: db.peg.map(pubPeg), penugasan: db.png, rekap: semuaRekap(), presensi: kompak(pres), kuota: kuota() });
      } else {
        const me = db.peg.find((g) => g.ID_Pegawai === s.idPegawai);
        Object.assign(out, { pegawai: me ? [pubPeg(me)] : [], penugasan: db.png.filter((p) => p.ID_Pegawai === s.idPegawai && p.Status !== 'Draft'),
          rekap: semuaRekap().filter((r) => r.ID_Pegawai === s.idPegawai), presensi: kompak(pres.filter((r) => r.ID_Pegawai === s.idPegawai)),
          wajahRef: me && me.Deskriptor_Wajah ? JSON.parse(me.Deskriptor_Wajah) : null });
      }
      return out;
    },
    'foto.get': (d) => {
      const id = String(d.id);
      if (db.foto[id]) return { id, dataUrl: db.foto[id] };
      const r = db.pres.find((x) => x.ID_Foto_Bukti === id), g = db.peg.find((x) => x.ID_Foto_Referensi === id || (r && x.ID_Pegawai === r.ID_Pegawai));
      const ini = g ? g.Nama.split(/[\s,]+/).filter((w) => /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join('') : '?';
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="300"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DCE6FF"/><stop offset="1" stop-color="#B9C9F5"/></linearGradient></defs><rect width="240" height="300" fill="url(#g)"/><circle cx="120" cy="120" r="56" fill="#1F4FD8" opacity=".85"/><rect x="40" y="196" width="160" height="120" rx="60" fill="#1F4FD8" opacity=".85"/><text x="120" y="133" font-family="Arial" font-weight="700" font-size="36" fill="#fff" text-anchor="middle">' + ini + '</text><text x="120" y="290" font-family="Arial" font-size="12" fill="#14389E" text-anchor="middle">Foto contoh (demo)</text></svg>';
      return { id, dataUrl: 'data:image/svg+xml;base64,' + btoa(svg) };
    },

    'pegawai.simpan': (d, s) => {
      const email = String(d.Email || '').trim().toLowerCase();
      if (!String(d.Nama || '').trim()) salah('Nama wajib diisi.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) salah('Email tidak valid.');
      const ada = db.peg.find((g) => g.Email === email);
      const wa = String(d.No_WA || '').replace(/\D/g, '').replace(/^62/, '0');
      if (d.No_WA && !/^08\d{7,12}$/.test(wa)) salah('Nomor WhatsApp tidak valid (gunakan format 08xxxxxxxxxx).');
      const data = { Nama: d.Nama.trim(), NIP: d.NIP || '', Jabatan: d.Jabatan || '', Unit_Kerja: d.Unit_Kerja || '', Email: email, No_WA: wa, Peran: d.Peran === 'Admin' ? 'Admin' : 'Pegawai', Status: d.Status === 'Nonaktif' ? 'Nonaktif' : 'Aktif', Diperbarui_Pada: waktu() };
      let g;
      if (!d.ID_Pegawai) {
        if (ada) salah('Email ' + email + ' sudah terdaftar atas nama ' + ada.Nama + '.');
        g = Object.assign({ ID_Pegawai: uid('PGW'), URL_Foto_Referensi: '', ID_Foto_Referensi: '', Deskriptor_Wajah: '', Status_WA: '', Dibuat_Pada: waktu() }, data);
        db.peg.push(g);
      } else {
        g = db.peg.find((x) => x.ID_Pegawai === d.ID_Pegawai) || salah('Pegawai tidak ditemukan.');
        if (ada && ada !== g) salah('Email ' + email + ' sudah dipakai pegawai lain.');
        Object.assign(g, data);
      }
      log(s.email, d.ID_Pegawai ? 'PEGAWAI_UBAH' : 'PEGAWAI_TAMBAH', { nama: g.Nama }, g.ID_Pegawai);
      return pubPeg(g);
    },
    'pegawai.status': (d, s) => { const g = db.peg.find((x) => x.ID_Pegawai === d.id) || salah('Pegawai tidak ditemukan.'); g.Status = d.status === 'Nonaktif' ? 'Nonaktif' : 'Aktif'; log(s.email, 'PEGAWAI_STATUS', d, d.id); return pubPeg(g); },
    'pegawai.wajah': (d, s) => {
      const g = db.peg.find((x) => x.ID_Pegawai === d.id) || salah('Pegawai tidak ditemukan.');
      if (!Array.isArray(d.deskriptor) || d.deskriptor.length !== 128) salah('Deskriptor wajah tidak valid.');
      const fid = 'DEMOREF' + Date.now() + 'xxxxxxxxx';
      db.foto[fid] = d.foto;
      Object.assign(g, { ID_Foto_Referensi: fid, URL_Foto_Referensi: '#', Deskriptor_Wajah: JSON.stringify(d.deskriptor.map((x) => Math.round(x * 1e5) / 1e5)), Diperbarui_Pada: waktu() });
      log(s.email, 'WAJAH_REFERENSI', {}, g.ID_Pegawai);
      return pubPeg(g);
    },

    'penugasan.simpan': (d, s) => {
      const o = {};
      ['No_Surat_Tugas', 'Tujuan', 'Nama_Lokasi', 'Alamat', 'Tgl_Mulai', 'Tgl_Selesai', 'Jam_Masuk', 'Jam_Pulang', 'Pemberi_Perintah', 'Catatan'].forEach((k) => { o[k] = String(d[k] || '').trim(); });
      ['Latitude', 'Longitude', 'Radius_Meter', 'Toleransi_Menit', 'Tarif_Harian'].forEach((k) => { o[k] = Number(d[k]); });
      o.Status = ['Draft', 'Aktif', 'Selesai', 'Batal'].includes(d.Status) ? d.Status : 'Aktif';
      if (!o.No_Surat_Tugas) salah('Nomor surat tugas wajib diisi.');
      if (!o.Tujuan) salah('Tujuan / kegiatan wajib diisi.');
      if (!o.Nama_Lokasi) salah('Nama lokasi wajib diisi.');
      if (!(o.Latitude >= -90 && o.Latitude <= 90 && o.Longitude >= -180 && o.Longitude <= 180) || (!o.Latitude && !o.Longitude)) salah('Titik koordinat belum valid. Pilih lokasi di peta atau isi lintang/bujur.');
      if (!(o.Radius_Meter >= 10 && o.Radius_Meter <= 5000)) salah('Radius harus 10–5.000 meter.');
      if (!o.Tgl_Mulai || !o.Tgl_Selesai || o.Tgl_Selesai < o.Tgl_Mulai) salah('Tanggal selesai tidak boleh sebelum tanggal mulai.');
      if (!(UI.menit(o.Jam_Pulang) > UI.menit(o.Jam_Masuk))) salah('Jam pulang harus setelah jam masuk.');
      const tabrak = (pid, kecuali) => {
        const b = db.png.find((p) => p.ID_Pegawai === pid && p.Status === 'Aktif' && p.ID_Penugasan !== kecuali && !(p.Tgl_Selesai < o.Tgl_Mulai || p.Tgl_Mulai > o.Tgl_Selesai));
        if (b && o.Status === 'Aktif') salah((db.peg.find((g) => g.ID_Pegawai === pid) || {}).Nama + ' sudah memiliki penugasan aktif ' + b.No_Surat_Tugas + ' yang bertabrakan.');
      };
      let rows;
      if (!d.ID_Penugasan) {
        const ids = (d.pegawaiIds || []).filter(String);
        if (!ids.length) salah('Pilih minimal satu pegawai.');
        ids.forEach((pid) => tabrak(pid, ''));
        rows = ids.map((pid) => Object.assign({ ID_Penugasan: uid('ST'), ID_Pegawai: pid, Dibuat_Oleh: s.email, Dibuat_Pada: waktu(), Diperbarui_Pada: waktu() }, o));
        db.png.push(...rows);
        if (o.Status === 'Aktif') antri('PENUGASAN_BARU', rows.map((p) => p.ID_Pegawai));
      } else {
        const p = db.png.find((x) => x.ID_Penugasan === d.ID_Penugasan) || salah('Penugasan tidak ditemukan.');
        tabrak(p.ID_Pegawai, p.ID_Penugasan);
        Object.assign(p, o, { Diperbarui_Pada: waktu() });
        rows = [p];
      }
      log(s.email, 'PENUGASAN_SIMPAN', { surat: o.No_Surat_Tugas, jumlah: rows.length });
      return { penugasan: rows, rekap: rows.map(hitungRekap) };
    },
    'penugasan.status': (d, s) => {
      const ids = d.ids || [d.id], rows = db.png.filter((p) => ids.includes(p.ID_Penugasan));
      rows.forEach((p) => { p.Status = d.status; p.Diperbarui_Pada = waktu(); });
      log(s.email, 'PENUGASAN_STATUS', d);
      return { penugasan: rows, rekap: rows.map(hitungRekap) };
    },

    'presensi.kirim': (d, s) => {
      const p = db.png.find((x) => x.ID_Penugasan === d.idPenugasan) || salah('Penugasan tidak ditemukan.');
      if (p.ID_Pegawai !== s.idPegawai) salah('Penugasan ini bukan milik Anda.');
      if (p.Status !== 'Aktif') salah('Penugasan berstatus ' + p.Status + '. Presensi tidak dapat dilakukan.');
      const w = now(), jenis = d.jenis === 'Pulang' ? 'Pulang' : 'Datang', st = db.setting, g = db.peg.find((x) => x.ID_Pegawai === s.idPegawai);
      const mM = UI.menit(p.Jam_Masuk), mP = UI.menit(p.Jam_Pulang), mNow = UI.menit(w.jam), tol = +p.Toleransi_Menit || 0;
      const sudah = db.pres.filter((r) => r.ID_Penugasan === p.ID_Penugasan && r.Tanggal === w.tgl && r.Verifikasi !== 'Ditolak');
      const sD = sudah.some((r) => r.Jenis === 'Datang'), sP = sudah.some((r) => r.Jenis === 'Pulang');
      const cek = { waktu: { ok: true, waktu: w.jam, tanggal: w.tgl, pesan: 'Dalam jadwal dinas' } };
      const gw = (m) => { cek.waktu.ok = false; cek.waktu.pesan = m; };
      if (w.tgl < p.Tgl_Mulai || w.tgl > p.Tgl_Selesai) gw('Di luar periode penugasan (' + UI.periode(p.Tgl_Mulai, p.Tgl_Selesai) + ')');
      else if (jenis === 'Datang' && sD) gw('Presensi datang hari ini sudah tercatat');
      else if (jenis === 'Pulang' && sP) gw('Presensi pulang hari ini sudah tercatat');
      else if (jenis === 'Datang' && mNow < mM - +st.BUKA_PRESENSI_MENIT) gw('Presensi datang dibuka pukul ' + UI.jamDariMenit(mM - +st.BUKA_PRESENSI_MENIT) + ' WIB');
      else if (jenis === 'Pulang' && !sD && st.PULANG_TANPA_DATANG !== 'TANDAI') gw('Belum ada presensi datang hari ini');
      const radius = +p.Radius_Meter, bA = +st.BATAS_AKURASI_GPS, ak = Math.round(+d.akurasi || 0);
      if (!isFinite(+d.lat) || !isFinite(+d.lng)) cek.lokasi = { ok: false, jarak: null, radius, akurasi: ak, batasAkurasi: bA, lokasi: p.Nama_Lokasi, pesan: 'Lokasi GPS tidak terbaca.' };
      else {
        const j = Math.round(Geo.haversine(+d.lat, +d.lng, +p.Latitude, +p.Longitude));
        cek.lokasi = { ok: j <= radius && !(ak > bA), jarak: j, radius, akurasi: ak, batasAkurasi: bA, lokasi: p.Nama_Lokasi,
          pesan: j > radius ? 'Anda berada di luar area penugasan: ' + p.Nama_Lokasi : ak > bA ? 'Akurasi GPS terlalu rendah (±' + ak + ' m).' : 'Di dalam geofence' };
      }
      const ambang = +st.AMBANG_WAJAH, ref = g && g.Deskriptor_Wajah ? JSON.parse(g.Deskriptor_Wajah) : null;
      if (!ref) cek.wajah = { ok: false, skor: 0, ambang, pesan: 'Foto referensi wajah Anda belum terdaftar. Hubungi admin.' };
      else if (!Array.isArray(d.deskriptor) || d.deskriptor.length !== 128) cek.wajah = { ok: false, skor: 0, ambang, pesan: 'Wajah tidak terdeteksi. Ulangi pemindaian.' };
      else { const dist = Wajah.jarak(d.deskriptor, ref), sk = Wajah.skor(dist); cek.wajah = { ok: sk >= ambang, skor: sk, ambang, replay: dist < 0.02, pesan: sk >= ambang ? 'Wajah cocok dengan referensi' : 'Wajah tidak cocok. Pastikan pencahayaan cukup, tanpa masker/kacamata gelap.' }; }
      if (!(cek.lokasi.ok && cek.wajah.ok && cek.waktu.ok)) { log(s.email, 'PRESENSI_DITOLAK', { jenis, lokasi: cek.lokasi.ok, wajah: cek.wajah.ok, waktu: cek.waktu.ok }, p.ID_Penugasan); return { diterima: false, cek, waktuServer: waktu() }; }
      let status = 'Tepat Waktu', sel = 0;
      if (jenis === 'Datang' && mNow > mM + tol) { status = 'Terlambat'; sel = Math.floor(mNow - mM); }
      if (jenis === 'Pulang' && mNow < mP) { status = 'Pulang Cepat'; sel = -Math.ceil(mP - mNow); }
      const alasan = [];
      if (cek.wajah.skor < ambang + 5) alasan.push('skor wajah mendekati ambang');
      if (cek.wajah.replay) alasan.push('deskriptor wajah identik dengan referensi');
      if (ak > bA / 2) alasan.push('akurasi GPS rendah');
      if (jenis === 'Pulang' && !sD) alasan.push('pulang tanpa presensi datang');
      const fid = 'DEMOFOTO' + Date.now() + 'xxxxxxxx';
      if (d.foto && d.foto.length < 120000) db.foto[fid] = d.foto;
      const row = { ID_Presensi: uid('PRS'), ID_Penugasan: p.ID_Penugasan, ID_Pegawai: p.ID_Pegawai, Tanggal: w.tgl, Jenis: jenis, Waktu_Server: waktu(), Latitude: +(+d.lat).toFixed(6), Longitude: +(+d.lng).toFixed(6),
        Akurasi_GPS: ak, Jarak_Meter: cek.lokasi.jarak, Skor_Wajah: cek.wajah.skor, Hasil_Wajah: 'Lolos', Status: status, Selisih_Menit: sel, Verifikasi: alasan.length ? 'Perlu Tinjauan' : 'Otomatis',
        ID_Foto_Bukti: fid, Catatan: alasan.join('; '), Ditinjau_Oleh: '', Ditinjau_Pada: '' };
      db.pres.push(row);
      if (status !== 'Tepat Waktu') antri(status === 'Terlambat' ? 'PRESENSI_TERLAMBAT' : 'PRESENSI_PULANG_CEPAT', [p.ID_Pegawai, 'PGW-ADM01']);
      log(s.email, 'PRESENSI_' + jenis.toUpperCase(), { status }, row.ID_Presensi);
      return { diterima: true, cek, waktuServer: row.Waktu_Server, presensi: H.map((k) => row[k]), h: H, rekap: hitungRekap(p),
        hariKe: UI.selisihHari(p.Tgl_Mulai, w.tgl) + 1, totalHari: UI.selisihHari(p.Tgl_Mulai, p.Tgl_Selesai) + 1 };
    },
    'presensi.sejak': (d, s) => Object.assign(kompak(db.pres.filter((r) => (s.role === 'ADMIN' || r.ID_Pegawai === s.idPegawai) && (r.Waktu_Server > d.sejak || r.Ditinjau_Pada > d.sejak))), { waktu: waktu() }),
    'presensi.list': (d, s) => kompak(db.pres.filter((r) => (s.role === 'ADMIN' || r.ID_Pegawai === s.idPegawai) && r.Tanggal >= d.dari && r.Tanggal <= d.sampai)),
    'presensi.penugasan': (d, s) => kompak(db.pres.filter((r) => r.ID_Penugasan === d.id && (s.role === 'ADMIN' || r.ID_Pegawai === s.idPegawai))),
    'presensi.tinjau': (d, s) => {
      const r = db.pres.find((x) => x.ID_Presensi === d.id) || salah('Data presensi tidak ditemukan.');
      Object.assign(r, { Verifikasi: d.keputusan === 'Ditolak' ? 'Ditolak' : 'Disetujui', Ditinjau_Oleh: s.email, Ditinjau_Pada: waktu(), Catatan: [r.Catatan, d.catatan ? 'Admin: ' + d.catatan : ''].filter(String).join(' | ') });
      log(s.email, 'PRESENSI_TINJAU', { keputusan: r.Verifikasi }, r.ID_Presensi);
      return { presensi: H.map((k) => r[k]), h: H, rekap: hitungRekap(db.png.find((p) => p.ID_Penugasan === r.ID_Penugasan)) };
    },
    'rekap.hitungUlang': () => { const t0 = performance.now(); const r = semuaRekap(); return { jumlah: r.length, ms: Math.round(performance.now() - t0), rekap: r }; },

    'notif.info': () => ({
      events: EVENTS.map((e) => { const o = db.matriks[e[0]] || {}; return { kode: e[0], label: e[1], wa: o.wa != null ? o.wa : !!e[2], email: o.email != null ? o.email : !!e[3], subjek: o.subjek || e[1], pesan: o.pesan || 'Yth. {nama},\n' + e[1] + ' — {lokasi} {tanggal}.\n— {institusi}' }; }),
      saklar: { NOTIF_EMAIL_AKTIF: db.setting.NOTIF_EMAIL_AKTIF === 'true', NOTIF_WA_AKTIF: db.setting.NOTIF_WA_AKTIF === 'true', WA_JEDA_DETIK: +db.setting.WA_JEDA_DETIK, WA_UKURAN_BATCH: +db.setting.WA_UKURAN_BATCH },
      fonnte: { ada: !!db.rahasia.FONNTE_TOKEN, samar: samar(db.rahasia.FONNTE_TOKEN) },
      antrian: db.ant.slice(-150).reverse().map((r) => ({ id: r.AntrianID, kanal: r.Kanal, tujuan: r.Tujuan, nama: r.NamaPenerima, event: r.Event, status: r.Status, percobaan: r.Percobaan, respon: r.Respon, dibuat: r.DibuatPada, dikirim: r.DikirimPada })),
      blast: db.blast.slice(-20).reverse(), kuota: kuota(), antreanAktif: db.ant.some((r) => r.Status === 'Antri')
    }),
    'notif.simpan': (d, s) => {
      if (d.saklar) Object.keys(d.saklar).forEach((k) => { db.setting[k] = typeof d.saklar[k] === 'boolean' ? String(d.saklar[k]) : String(d.saklar[k]); });
      if (d.matriks) db.matriks = d.matriks;
      log(s.email, 'NOTIF_PENGATURAN', Object.keys(d));
      return A['notif.info']();
    },
    'notif.tes': (d) => ({ ok: true, respon: d.kanal === 'WA' ? 'Mode demo: pesan WA tidak benar-benar dikirim.' : 'Mode demo: email tidak benar-benar dikirim.' }),
    'notif.blast': (d, s) => {
      if (!String(d.pesan || '').trim()) salah('Isi pesan wajib diisi.');
      let sas = db.peg.filter((g) => g.Status === 'Aktif' && g.No_WA);
      if (d.sasaran === 'terpilih') sas = sas.filter((g) => (d.ids || []).includes(g.ID_Pegawai));
      if (d.sasaran === 'bertugas') { const t = now().tgl; const set = new Set(db.png.filter((p) => p.Status === 'Aktif' && p.Tgl_Mulai <= t && p.Tgl_Selesai >= t).map((p) => p.ID_Pegawai)); sas = sas.filter((g) => set.has(g.ID_Pegawai)); }
      if (!sas.length) salah('Tidak ada penerima dengan nomor WA valid.');
      const id = uid('BLW');
      db.blast.push({ BlastID: id, Judul: d.judul || 'Blast', Pesan: d.pesan, Sasaran: d.sasaran, Total: sas.length, Terkirim: 0, Gagal: 0, Status: 'Berjalan', DibuatOleh: s.email, Tanggal: waktu(), SelesaiPada: '' });
      sas.forEach((g) => db.ant.push({ AntrianID: uid('ANT'), Kanal: 'WA', Tujuan: g.No_WA.slice(0, 4) + '••••' + g.No_WA.slice(-3), NamaPenerima: g.Nama, Event: 'BLAST', BlastID: id, Status: 'Antri', Percobaan: 0, Respon: '', DibuatPada: waktu(), DikirimPada: '' }));
      return { blastId: id, total: sas.length };
    },
    'notif.cekWA': () => { const n = db.peg.filter((g) => g.No_WA).length; db.peg.forEach((g) => { if (g.No_WA) g.Status_WA = 'Terdaftar'; }); return { dicek: n }; },
    'notif.proses': () => {
      let wa = 0, em = 0;
      db.ant.forEach((r) => { if (r.Status === 'Antri') { r.Status = 'Terkirim'; r.Percobaan = 1; r.Respon = 'terkirim (demo)'; r.DikirimPada = waktu(); r.Kanal === 'WA' ? wa++ : em++; if (r.Kanal === 'EMAIL') db.emailTerkirim++; } });
      db.blast.forEach((b) => { if (b.Status === 'Berjalan') { b.Terkirim = b.Total; b.Status = 'Selesai'; b.SelesaiPada = waktu(); } });
      return { wa, email: em, gagal: 0, ditunda: 0, diproses: wa + em };
    },

    'sistem.info': () => ({
      versi: 'demo', zonaWaktu: 'Asia/Jakarta', zonaSheet: 'Asia/Jakarta', spreadsheetUrl: '#', waktu: waktu(), ms: 4, jendelaHari: +db.setting.JENDELA_PRESENSI_HARI,
      lembar: { Pegawai: db.peg.length, Penugasan: db.png.length, Presensi: db.pres.length, Rekap_SPPD: db.png.length, Pengaturan: Object.keys(db.setting).length, AntrianNotif: db.ant.length, BlastWA: db.blast.length, Log_Aktivitas: db.log.length, AppConfig: 8 },
      cache: { Pegawai: jamSaja(), Penugasan: jamSaja(), Presensi: jamSaja(), Rekap_SPPD: jamSaja(), Pengaturan: jamSaja(), AntrianNotif: jamSaja() },
      triggers: ['prosesAntrianNotif', 'jalankanPengingat', 'tugasHarian'], kuota: kuota(),
      antrian: { antri: db.ant.filter((r) => r.Status === 'Antri').length, terkirim: db.ant.filter((r) => r.Status === 'Terkirim').length, gagal: 0, emailHariIni: db.emailTerkirim, waHariIni: db.ant.filter((r) => r.Kanal === 'WA' && r.Status === 'Terkirim').length },
      rahasia: statusRahasia()
    }),
    'sistem.pengaturan': (d, s) => {
      const p = d.pengaturan || {};
      if (p.AMBANG_WAJAH != null && (+p.AMBANG_WAJAH < 40 || +p.AMBANG_WAJAH > 99)) salah('AMBANG_WAJAH harus antara 40 dan 99.');
      Object.keys(p).forEach((k) => { if (k in db.setting) db.setting[k] = String(p[k]); });
      log(s.email, 'PENGATURAN_UBAH', Object.keys(p));
      return Object.assign({}, db.setting);
    },
    'sistem.rahasia': (d, s) => {
      const r = d.rahasia || {}, hasil = {};
      Object.keys(r).forEach((k) => {
        if (!['FONNTE_TOKEN', 'GOOGLE_CLIENT_ID', 'ADMIN_EMAILS', 'DOMAIN_IZIN'].includes(k)) salah('Kunci ' + k + ' tidak boleh diubah dari dashboard.');
        const v = String(r[k] || '').trim(); if (!v) return;
        if (v === '__HAPUS__') { db.rahasia[k] = ''; hasil[k] = 'dihapus'; } else { db.rahasia[k] = v; hasil[k] = 'diperbarui'; }
      });
      log(s.email, 'RAHASIA_UBAH', Object.keys(hasil));
      return { hasil, status: statusRahasia() };
    },
    'sistem.cache': () => ({ ok: true }),
    'sistem.log': (d) => db.log.slice(-(d.n || 150)).reverse(),
    'migrasi.pindai': (d) => migrasi(d, true),
    'migrasi.impor': (d) => migrasi(d, false)
  };
  const jamSaja = () => { const w = now(); return w.d + ' ' + UI.BLN[w.m - 1] + ' ' + w.jam; };
  const samar = (v) => (!v ? '' : v.length <= 8 ? '••••••' : v.slice(0, 4) + '••••••' + v.slice(-3));
  const statusRahasia = () => ({
    FONNTE_TOKEN: { ada: !!db.rahasia.FONNTE_TOKEN, samar: samar(db.rahasia.FONNTE_TOKEN) }, GOOGLE_CLIENT_ID: { ada: !!db.rahasia.GOOGLE_CLIENT_ID, samar: db.rahasia.GOOGLE_CLIENT_ID },
    ADMIN_EMAILS: { ada: !!db.rahasia.ADMIN_EMAILS, samar: db.rahasia.ADMIN_EMAILS }, DOMAIN_IZIN: { ada: !!db.rahasia.DOMAIN_IZIN, samar: db.rahasia.DOMAIN_IZIN },
    SESSION_SECRET: { ada: true, samar: '•••••• (otomatis)' }, EMERGENCY_PASS_HASH: { ada: true, samar: '•••••• (otomatis)' }
  });
  function kuota() {
    const jenis = db.setting.JENIS_AKUN === 'WORKSPACE' ? 'WORKSPACE' : 'GMAIL', batas = jenis === 'WORKSPACE' ? 1500 : 100, sisa = Math.max(0, batas - db.emailTerkirim);
    return { jenis, batas, sisa, terpakai: batas - sisa, kapasitasPegawai: Math.floor(sisa / 2), kapasitasPenuh: Math.floor(batas / 2), wa: db.setting.NOTIF_WA_AKTIF === 'true', email: db.setting.NOTIF_EMAIL_AKTIF === 'true' };
  }
  function antri(event, ids) {
    ids.forEach((id) => {
      const g = db.peg.find((x) => x.ID_Pegawai === id); if (!g) return;
      if (db.setting.NOTIF_WA_AKTIF === 'true' && g.No_WA) db.ant.push({ AntrianID: uid('ANT'), Kanal: 'WA', Tujuan: g.No_WA.slice(0, 4) + '••••' + g.No_WA.slice(-3), NamaPenerima: g.Nama, Event: event, Status: 'Antri', Percobaan: 0, Respon: '', DibuatPada: waktu(), DikirimPada: '' });
      if (db.setting.NOTIF_EMAIL_AKTIF === 'true' && event === 'PENUGASAN_BARU') db.ant.push({ AntrianID: uid('ANT'), Kanal: 'EMAIL', Tujuan: g.Email, NamaPenerima: g.Nama, Event: event, Status: 'Antri', Percobaan: 0, Respon: '', DibuatPada: waktu(), DikirimPada: '' });
    });
  }
  function migrasi(d, dry) {
    if (!/[A-Za-z0-9_-]{20,}/.test(String(d.sumber || ''))) salah('ID / URL spreadsheet sumber tidak valid.');
    const tabel = {};
    (d.tabel || ['Pegawai', 'Penugasan', 'Presensi']).forEach((t, i) => {
      tabel[t] = { tambah: [12, 4, 38][i] || 3, perbarui: [3, 0, 0][i] || 0, lewati: [5, 9, 120][i] || 0, baris: [20, 13, 158][i] || 10, kolomCocok: ['Nama', 'Email', 'NIP', 'Jabatan', 'No_WA'], kolomHilang: ['Unit_Kerja'] };
    });
    return { sumber: 'Spreadsheet Lama (demo)', dryRun: dry, tabel };
  }

  async function handle(body) {
    muat();
    if (body.action === 'batch') {
      const calls = (body.data && body.data.calls) || [];
      const out = [];
      for (const c of calls) { const r = await handle({ action: c.action, token: body.token, data: c.data }); out.push({ success: r.success, data: r.data, message: r.message }); }
      return { success: true, data: out, ms: 0, v: 'demo', t: Date.now() };
    }
    const tunda = /^(boot|presensi\.kirim|penugasan\.simpan|pegawai\.(simpan|wajah)|migrasi)/.test(body.action) ? 260 : 90;
    await new Promise((r) => setTimeout(r, tunda));
    const t0 = performance.now();
    try {
      const fn = A[body.action];
      if (!fn) return { success: false, message: 'Aksi tidak dikenal: ' + body.action };
      let s = null;
      if (!/^(ping|auth\.(config|demo|google|kirimKode|verifikasiKode|darurat))$/.test(body.action)) {
        s = sesi(body.token);
        if (!s) return { success: false, message: 'SESI_HABIS: Sesi Anda berakhir. Silakan masuk kembali.', code: 'SESI_HABIS' };
        const adminSaja = /^(pegawai\.|penugasan\.|presensi\.tinjau|rekap\.|notif\.|sistem\.|migrasi\.)/;
        if (adminSaja.test(body.action) && s.role !== 'ADMIN') return { success: false, message: 'AKSES_DITOLAK: Anda tidak memiliki izin untuk aksi ini.' };
      }
      const data = fn(body.data || {}, s);
      simpan();
      return { success: true, data, ms: Math.round(performance.now() - t0), v: 'demo', t: Date.now() };
    } catch (e) {
      return { success: false, message: e.message, ms: Math.round(performance.now() - t0), v: 'demo', t: Date.now() };
    }
  }
  window.DemoServer = { handle, reset() { localStorage.removeItem(KEY); db = null; }, vektorRef: () => { muat(); const g = db.peg.find((x) => x.ID_Pegawai === 'PGW-00001'); return g && g.Deskriptor_Wajah ? JSON.parse(g.Deskriptor_Wajah) : null; } };
})();
