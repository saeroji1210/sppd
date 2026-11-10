/* =========================================================
   api.js — komunikasi ke GAS REST API + penyimpanan data klien
   Pola gas-pro-api + gas-scale-turbo:
   - POST Content-Type text/plain (bebas preflight CORS)
   - deduplikasi request baca yang sama (in-flight) + epoch tulis
   - snapshot localStorage (stale-while-revalidate): app tampil instan
   - jam server (offset) agar tampilan waktu = waktu server WIB
   - polling adaptif: berhenti saat tab tersembunyi, melambat saat diam
   ========================================================= */
(function () {
  'use strict';
  const CFG = window.SIPERDIN_CONFIG || {};
  const DEMO = !CFG.GAS_URL || /[?&]demo=1/.test(location.search);
  const K = 'siperdin_';
  const ls = {
    get(k) { try { return localStorage.getItem(K + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(K + k, v); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(K + k); } catch (e) { /* abaikan */ } }
  };

  /* ---------- Sesi ---------- */
  const Sesi = {
    token: null, user: null, exp: 0,
    muat() {
      try {
        const s = JSON.parse(ls.get('sesi') || 'null');
        if (s && s.token && s.exp > Date.now() + 60e3) Object.assign(Sesi, s);
        else ls.del('sesi');
      } catch (e) { ls.del('sesi'); }
      return !!Sesi.token;
    },
    simpan(token, user, exp) {
      Object.assign(Sesi, { token, user, exp: exp || Date.now() + 12 * 3600e3 });
      ls.set('sesi', JSON.stringify({ token, user, exp: Sesi.exp }));
    },
    hapus() {
      if (Sesi.user) ls.del('snap_' + Sesi.user.email);
      Object.assign(Sesi, { token: null, user: null, exp: 0 });
      ls.del('sesi');
    }
  };

  /* ---------- Jam server ---------- */
  const Jam = {
    offset: Number(ls.get('offset')) || 0, sinkron: false,
    set(serverMs) {
      const off = serverMs - Date.now();
      if (!Jam.sinkron || Math.abs(off - Jam.offset) > 1500) Jam.offset = off;
      else Jam.offset = Math.round(Jam.offset * 0.7 + off * 0.3);
      Jam.sinkron = true;
      ls.set('offset', String(Jam.offset));
    },
    now() { return Date.now() + Jam.offset; },
    wib() { return UI.wib(Jam.now()); }
  };

  /* ---------- Panggilan API ---------- */
  const stat = { n: 0, total: 0, terakhir: 0, server: 0 };
  let _demo = null;
  const siapDemo = () => (_demo = _demo || UI.muatScript('js/demo.js', 'DemoServer'));
  let onSesiHabis = () => { };

  async function kirim(action, data, opt) {
    opt = opt || {};
    const body = { action, token: Sesi.token || undefined, data: data || {} };
    const t0 = performance.now();
    let res;
    if (DEMO) {
      await siapDemo();
      res = await window.DemoServer.handle(JSON.parse(JSON.stringify(body)));
    } else {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), opt.timeout || 45000);
      try {
        const r = await fetch(CFG.GAS_URL, {
          method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(body), signal: ctrl.signal, redirect: 'follow', credentials: 'omit'
        });
        res = await r.json();
      } catch (e) {
        if (e.name === 'AbortError') throw new Error('Server terlalu lama merespons. Periksa koneksi lalu coba lagi.');
        throw Object.assign(new Error(navigator.onLine === false ? 'Anda sedang offline. Periksa koneksi internet.' : 'Gagal menghubungi server. Periksa koneksi internet.'), { jaringan: true });
      } finally { clearTimeout(to); }
    }
    const ms = Math.round(performance.now() - t0);
    stat.n++; stat.total += ms; stat.terakhir = ms; stat.server = res && res.ms || 0;
    // waktu server saat respons tiba ≈ t + separuh waktu jaringan (di luar waktu proses server)
    if (res && res.t) Jam.set(res.t + Math.max(0, Math.min(6000, ms - (res.ms || 0))) / 2);
    if (!res || !res.success) {
      const msg = String((res && res.message) || 'Terjadi kesalahan.');
      if (/^SESI_/.test(msg) && action !== 'auth.logout') { onSesiHabis(msg.replace(/^[A-Z_]+:\s*/, '')); }
      throw Object.assign(new Error(msg.replace(/^[A-Z_]+:\s*/, '')), { kode: (msg.match(/^([A-Z_]+):/) || [])[1] });
    }
    return res.data;
  }

  const BACA = /^(boot|ping|auth\.config|foto\.get|presensi\.(sejak|list|penugasan)|notif\.info|sistem\.(info|log))$/;
  const _inflight = {};
  let _epoch = 0;
  async function api(action, data, opt) {
    if (!BACA.test(action)) { _epoch++; return kirim(action, data, opt); }
    const key = _epoch + '|' + action + '|' + JSON.stringify(data || {});
    if (_inflight[key]) return _inflight[key];
    const p = kirim(action, data, opt).catch(async (e) => {
      if (e.jaringan && navigator.onLine !== false) { await new Promise((r) => setTimeout(r, 800)); return kirim(action, data, opt); } // 1x coba ulang
      throw e;
    });
    _inflight[key] = p;
    p.then(() => delete _inflight[key], () => delete _inflight[key]);
    return p;
  }

  /* ---------- Store ---------- */
  const keObjek = (pack) => (pack && pack.h ? pack.v.map((r) => { const o = {}; pack.h.forEach((k, i) => { o[k] = r[i]; }); return o; }) : (pack || []));
  const Store = {
    ver: 0, d: null, idx: {},
    muat(data, dariSnap) {
      const d = Object.assign({}, data);
      d.presensi = keObjek(data.presensi);
      d.pegawai = data.pegawai || []; d.penugasan = data.penugasan || []; d.rekap = data.rekap || [];
      Store.d = d;
      Store.reindex();
      if (!dariSnap) Store.simpanSnap();
    },
    reindex() {
      const d = Store.d, ix = { pegawai: {}, penugasan: {}, rekap: {}, presPng: {}, presensi: {} };
      d.pegawai.forEach((p) => { ix.pegawai[p.ID_Pegawai] = p; });
      d.penugasan.forEach((p) => { ix.penugasan[p.ID_Penugasan] = p; });
      d.rekap.forEach((r) => { ix.rekap[r.ID_Penugasan] = r; });
      d.presensi.sort((a, b) => String(b.Waktu_Server).localeCompare(String(a.Waktu_Server)));
      d.presensi.forEach((r) => { ix.presensi[r.ID_Presensi] = r; (ix.presPng[r.ID_Penugasan] = ix.presPng[r.ID_Penugasan] || []).push(r); });
      Store.idx = ix;
      Store.ver++;
    },
    simpanSnap: UI.debounce(() => {
      if (!Store.d || !Sesi.user) return;
      const d = Store.d, h = d.presensi.length ? Object.keys(d.presensi[0]) : [];
      const snap = Object.assign({}, d, { presensi: { h, v: d.presensi.map((r) => h.map((k) => r[k])) }, _waktu: Date.now() });
      if (!ls.set('snap_' + Sesi.user.email, JSON.stringify(snap))) {
        snap.presensi = { h, v: snap.presensi.v.slice(0, 500) };
        ls.set('snap_' + Sesi.user.email, JSON.stringify(snap));
      }
    }, 400),
    muatSnap(email) {
      try { const s = JSON.parse(ls.get('snap_' + email) || 'null'); if (s && s.user) { Store.muat(s, true); return s._waktu; } } catch (e) { /* rusak */ }
      return 0;
    },
    upsert(jenis, rows, kunci) {
      const arr = Store.d[jenis], map = {};
      arr.forEach((r, i) => { map[r[kunci]] = i; });
      rows.forEach((r) => { if (map[r[kunci]] != null) arr[map[r[kunci]]] = Object.assign({}, arr[map[r[kunci]]], r); else arr.push(r); });
      Store.reindex(); Store.simpanSnap();
    },
    presensiKompak(pack) { return keObjek(pack); },
    pegawai: (id) => Store.idx.pegawai[id] || null,
    penugasan: (id) => Store.idx.penugasan[id] || null,
    rekap: (id) => Store.idx.rekap[id] || null,
    presensiPenugasan: (id) => Store.idx.presPng[id] || []
  };

  /* ---------- Polling adaptif ---------- */
  let aktivitas = Date.now();
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((ev) => addEventListener(ev, () => { aktivitas = Date.now(); }, { passive: true }));
  function poll(fn, ms) {
    let t = null, mati = false;
    const jadwal = () => {
      if (mati) return;
      const diam = Date.now() - aktivitas > 120e3;
      t = setTimeout(jalan, diam ? ms * 3 : ms);
    };
    const jalan = async () => {
      if (mati) return;
      if (document.visibilityState === 'visible' && navigator.onLine !== false) { try { await fn(); } catch (e) { /* diam */ } }
      jadwal();
    };
    const vis = () => { if (document.visibilityState === 'visible' && !mati) { clearTimeout(t); jalan(); } };
    document.addEventListener('visibilitychange', vis);
    jadwal();
    return () => { mati = true; clearTimeout(t); document.removeEventListener('visibilitychange', vis); };
  }

  window.API = {
    DEMO, CFG, api, Sesi, Jam, Store, poll, stat, ls,
    set onSesiHabis(fn) { onSesiHabis = fn; }
  };
})();
