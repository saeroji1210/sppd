/* =========================================================
   charts.js — grafik SVG ringan (garis/area, donat, batang)
   tanpa pustaka eksternal: muat instan, bebas CDN, tema terang/gelap.
   ========================================================= */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const esc = (s) => UI.esc(s);
  const niceMax = (v) => {
    if (v <= 0) return 4;
    const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  };
  const amati = new WeakMap();
  function pasang(el, gambar) {
    gambar();
    if (window.ResizeObserver && !amati.has(el)) {
      let w = el.clientWidth;
      const ro = new ResizeObserver(UI.debounce(() => { if (Math.abs(el.clientWidth - w) > 8 && document.body.contains(el)) { w = el.clientWidth; gambar(); } }, 120));
      ro.observe(el); amati.set(el, ro);
    }
  }
  function tip(el) {
    let t = el.querySelector('.chart-tip');
    if (!t) { t = document.createElement('div'); t.className = 'chart-tip'; t.style.display = 'none'; el.appendChild(t); }
    return t;
  }

  /** Grafik garis/area multi-seri. seri: [{nama, warna, data:[], isi:true, putus:false}] */
  function garis(el, o) {
    if (!el) return;
    el.classList.add('chart');
    pasang(el, () => {
      const W = Math.max(280, el.clientWidth || 600), H = o.tinggi || 240, L = 34, R = 10, T = 14, B = 28;
      const n = o.labels.length, maxV = niceMax(Math.max(1, ...o.seri.flatMap((s) => s.data)));
      const x = (i) => L + (n <= 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (n - 1));
      const y = (v) => T + (H - T - B) * (1 - v / maxV);
      let g = '<defs>' + o.seri.map((s, i) => '<linearGradient id="gr' + i + el.id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + s.warna + '" stop-opacity=".22"/><stop offset="1" stop-color="' + s.warna + '" stop-opacity="0"/></linearGradient>').join('') + '</defs>';
      for (let k = 0; k <= 4; k++) {
        const v = (maxV / 4) * k, yy = y(v);
        g += '<line class="grid-l" x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '"/><text class="axis" x="' + (L - 8) + '" y="' + (yy + 4) + '" text-anchor="end">' + UI.angka(v, v % 1 ? 1 : 0) + '</text>';
      }
      const lompat = Math.max(1, Math.ceil(n / Math.floor((W - L - R) / 56)));
      o.labels.forEach((lb, i) => { if (i % lompat === 0 || i === n - 1) g += '<text class="axis" x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(lb) + '</text>'; });
      o.seri.forEach((s, si) => {
        if (!s.data.length) return;
        let d = 'M' + x(0) + ',' + y(s.data[0]);
        for (let i = 1; i < s.data.length; i++) {
          const x0 = x(i - 1), x1 = x(i), y0 = y(s.data[i - 1]), y1 = y(s.data[i]), mx = (x0 + x1) / 2;
          d += ' C' + mx + ',' + y0 + ' ' + mx + ',' + y1 + ' ' + x1 + ',' + y1;
        }
        if (s.isi !== false) g += '<path d="' + d + ' L' + x(s.data.length - 1) + ',' + y(0) + ' L' + x(0) + ',' + y(0) + 'Z" fill="url(#gr' + si + el.id + ')"/>';
        g += '<path d="' + d + '" fill="none" stroke="' + s.warna + '" stroke-width="' + (s.tebal || 2.5) + '" stroke-linecap="round"' + (s.putus ? ' stroke-dasharray="4 5"' : '') + '/>';
      });
      g += '<line class="hl" x1="0" x2="0" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--border-2)" stroke-dasharray="3 3" style="display:none"/>';
      g += '<g class="dots"></g><rect class="hit" x="' + L + '" y="0" width="' + (W - L - R) + '" height="' + H + '" fill="transparent"/>';
      el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria || 'Grafik garis') + '">' + g + '</svg>';
      const svg = el.querySelector('svg'), hl = svg.querySelector('.hl'), dots = svg.querySelector('.dots'), tp = tip(el);
      const gerak = (ev) => {
        const r = svg.getBoundingClientRect(), px = ((ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left) * (W / r.width);
        const i = Math.max(0, Math.min(n - 1, Math.round(((px - L) / (W - L - R)) * (n - 1))));
        hl.setAttribute('x1', x(i)); hl.setAttribute('x2', x(i)); hl.style.display = '';
        dots.innerHTML = o.seri.map((s) => '<circle cx="' + x(i) + '" cy="' + y(s.data[i] || 0) + '" r="4.5" fill="var(--surface)" stroke="' + s.warna + '" stroke-width="2.5"/>').join('');
        tp.innerHTML = '<b>' + esc(o.tipLabel ? o.tipLabel[i] : o.labels[i]) + '</b>' + o.seri.map((s) => '<span style="color:' + s.warna + '">●</span> ' + esc(s.nama) + ': ' + UI.angka(s.data[i] || 0)).join('<br>');
        tp.style.display = ''; tp.style.left = (x(i) / W) * r.width + 'px'; tp.style.top = (y(Math.max(...o.seri.map((s) => s.data[i] || 0))) / H) * r.height + 'px';
      };
      const keluar = () => { hl.style.display = 'none'; dots.innerHTML = ''; tp.style.display = 'none'; };
      svg.addEventListener('mousemove', gerak); svg.addEventListener('touchmove', gerak, { passive: true });
      svg.addEventListener('mouseleave', keluar); svg.addEventListener('touchend', () => setTimeout(keluar, 1500));
    });
  }

  /** Donat. data: [{label, nilai, warna}], tengah: {nilai, label} */
  function donat(el, o) {
    if (!el) return;
    const total = o.data.reduce((s, d) => s + d.nilai, 0);
    const S = o.ukuran || 180, r = S / 2 - 14, C = 2 * Math.PI * r;
    let acc = 0, seg = '';
    if (!total) seg = '<circle cx="' + S / 2 + '" cy="' + S / 2 + '" r="' + r + '" fill="none" stroke="var(--surface-3)" stroke-width="22"/>';
    o.data.forEach((d) => {
      if (!d.nilai) return;
      const len = (d.nilai / total) * C, gap = o.data.filter((x) => x.nilai).length > 1 ? 3 : 0;
      seg += '<circle cx="' + S / 2 + '" cy="' + S / 2 + '" r="' + r + '" fill="none" stroke="' + d.warna + '" stroke-width="22" stroke-dasharray="' + Math.max(0, len - gap) + ' ' + (C - Math.max(0, len - gap)) +
        '" stroke-dashoffset="' + (-acc) + '" transform="rotate(-90 ' + S / 2 + ' ' + S / 2 + ')" stroke-linecap="butt"><title>' + esc(d.label) + ': ' + d.nilai + '</title></circle>';
      acc += len;
    });
    const tengah = o.tengah ? '<text x="50%" y="' + (S / 2 + 2) + '" text-anchor="middle" style="font:800 26px var(--font-head);fill:var(--ink)">' + esc(o.tengah.nilai) + '</text><text x="50%" y="' + (S / 2 + 22) + '" text-anchor="middle" style="font:600 11px var(--font-body);fill:var(--muted)">' + esc(o.tengah.label) + '</text>' : '';
    el.innerHTML = '<div class="donut-wrap"><svg viewBox="0 0 ' + S + ' ' + S + '" style="width:' + S + 'px;max-width:100%" role="img" aria-label="' + esc(o.aria || 'Grafik donat') + '">' + seg + tengah + '</svg>' +
      '<div class="donut-legend">' + o.data.map((d) => '<div><i style="background:' + d.warna + '"></i>' + esc(d.label) + '<b>' + UI.pct(d.nilai, total) + '% <span class="muted">(' + UI.angka(d.nilai) + ')</span></b></div>').join('') + '</div></div>';
  }

  /** Batang berkelompok / bertumpuk. seri: [{nama, warna, data}], tumpuk: true untuk komposisi per hari. */
  function batang(el, o) {
    if (!el) return;
    el.classList.add('chart');
    pasang(el, () => {
      const W = Math.max(280, el.clientWidth || 600), H = o.tinggi || 230, L = 30, R = 8, T = 12, B = 26;
      const n = o.labels.length, k = o.seri.length;
      const puncak = o.tumpuk ? Math.max(1, ...o.labels.map((_, i) => o.seri.reduce((s, x) => s + (x.data[i] || 0), 0))) : Math.max(1, ...o.seri.flatMap((s) => s.data));
      const maxV = puncak <= 4 ? 4 : Math.ceil(niceMax(puncak) / 4) * 4; // kelipatan 4 → label sumbu bilangan bulat
      const bw = (W - L - R) / n, lebar = o.tumpuk ? Math.max(3, Math.min(26, bw * 0.62)) : Math.min(28, (bw * 0.7) / k);
      const y = (v) => T + (H - T - B) * (1 - v / maxV);
      let g = '';
      for (let j = 0; j <= 4; j++) { const v = (maxV / 4) * j; g += '<line class="grid-l" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="axis" x="' + (L - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + UI.angka(v) + '</text>'; }
      const lompat = Math.max(1, Math.ceil(n / Math.floor((W - L - R) / 52)));
      o.labels.forEach((lb, i) => {
        const cx = L + bw * i + bw / 2;
        if (o.tumpuk) {
          let acc = 0;
          o.seri.forEach((s, si) => {
            const v = s.data[i] || 0; if (!v) return;
            const y0 = y(acc), y1 = y(acc + v); acc += v;
            const atas = !o.seri.slice(si + 1).some((x) => x.data[i]);
            g += '<rect x="' + (cx - lebar / 2) + '" y="' + y1 + '" width="' + lebar + '" height="' + Math.max(1, y0 - y1 - (atas ? 0 : 1.5)) + '" rx="' + (atas ? 3 : 0) + '" fill="' + s.warna + '"/>';
          });
        } else {
          o.seri.forEach((s, si) => {
            const v = s.data[i] || 0, xx = cx - (lebar * k) / 2 + si * lebar, hh = y(0) - y(v);
            g += '<rect x="' + (xx + 1) + '" y="' + y(v) + '" width="' + Math.max(2, lebar - 2) + '" height="' + Math.max(0, hh) + '" rx="4" fill="' + s.warna + '"/>';
          });
        }
        if (i % lompat === 0 || i === n - 1) g += '<text class="axis" x="' + cx + '" y="' + (H - 7) + '" text-anchor="middle">' + esc(lb) + '</text>';
      });
      g += '<rect class="hl" y="' + T + '" height="' + (H - T - B) + '" width="' + bw + '" fill="var(--primary)" fill-opacity=".06" style="display:none"/>';
      g += '<rect class="hit" x="' + L + '" y="0" width="' + (W - L - R) + '" height="' + H + '" fill="transparent"/>';
      el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria || 'Grafik batang') + '">' + g + '</svg>';
      const svg = el.querySelector('svg'), hl = svg.querySelector('.hl'), tp = tip(el);
      const gerak = (ev) => {
        const r = svg.getBoundingClientRect(), px = ((ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left) * (W / r.width);
        const i = Math.max(0, Math.min(n - 1, Math.floor((px - L) / bw)));
        hl.setAttribute('x', L + bw * i); hl.style.display = '';
        const tot = o.seri.reduce((s, x) => s + (x.data[i] || 0), 0);
        tp.innerHTML = '<b>' + esc(o.tipLabel ? o.tipLabel[i] : o.labels[i]) + '</b>' + o.seri.map((s) => '<span style="color:' + s.warna + '">●</span> ' + esc(s.nama) + ': ' + UI.angka(s.data[i] || 0)).join('<br>') + (o.tumpuk ? '<br>Total: ' + UI.angka(tot) : '');
        tp.style.display = ''; tp.style.left = ((L + bw * i + bw / 2) / W) * r.width + 'px'; tp.style.top = (y(o.tumpuk ? tot : puncak) / H) * r.height + 'px';
      };
      const keluar = () => { hl.style.display = 'none'; tp.style.display = 'none'; };
      svg.addEventListener('mousemove', gerak); svg.addEventListener('touchmove', gerak, { passive: true }); svg.addEventListener('touchstart', gerak, { passive: true });
      svg.addEventListener('mouseleave', keluar); svg.addEventListener('touchend', () => setTimeout(keluar, 1500));
    });
  }

  /** Cincin skor kecil (kamera/hasil). */
  function cincin(p, warna, ukuran, teks) {
    const S = ukuran || 48, r = S / 2 - 4, C = 2 * Math.PI * r, len = (Math.max(0, Math.min(100, p)) / 100) * C;
    return '<svg class="ring" viewBox="0 0 ' + S + ' ' + S + '"><circle cx="' + S / 2 + '" cy="' + S / 2 + '" r="' + r + '" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="4"/>' +
      '<circle cx="' + S / 2 + '" cy="' + S / 2 + '" r="' + r + '" fill="none" stroke="' + warna + '" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + len + ' ' + C + '" transform="rotate(-90 ' + S / 2 + ' ' + S / 2 + ')"/>' +
      '<text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" style="font:800 ' + Math.round(S / 3.6) + 'px var(--font-head);fill:#fff">' + (teks != null ? teks : Math.round(p) + '%') + '</text></svg>';
  }

  /** Radar geofence: titik pegawai relatif terhadap pusat & radius. */
  function radar(jarak, radius, ok) {
    const S = 116, c = S / 2, R = 46;
    const rel = jarak == null ? null : Math.min(1.25, jarak / Math.max(1, radius));
    const px = rel == null ? null : c + R * rel * Math.cos(-0.7), py = rel == null ? null : c + R * rel * Math.sin(-0.7);
    return '<svg class="radar" viewBox="0 0 ' + S + ' ' + S + '" aria-hidden="true">' +
      '<circle cx="' + c + '" cy="' + c + '" r="' + (R * 1.18) + '" fill="var(--primary-50)"/><circle cx="' + c + '" cy="' + c + '" r="' + R + '" fill="none" stroke="var(--primary)" stroke-opacity=".35" stroke-dasharray="3 3"/>' +
      '<circle cx="' + c + '" cy="' + c + '" r="' + R * 0.6 + '" fill="none" stroke="var(--primary)" stroke-opacity=".25"/><circle cx="' + c + '" cy="' + c + '" r="' + R * 0.25 + '" fill="none" stroke="var(--primary)" stroke-opacity=".25"/>' +
      '<circle cx="' + c + '" cy="' + c + '" r="5" fill="var(--primary)"/>' +
      (px == null ? '' : '<circle cx="' + px + '" cy="' + py + '" r="9" fill="' + (ok ? 'var(--success)' : 'var(--danger)') + '" fill-opacity=".25"/><circle cx="' + px + '" cy="' + py + '" r="5.5" fill="' + (ok ? 'var(--success)' : 'var(--danger)') + '" stroke="#fff" stroke-width="2"/>') +
      '</svg>';
  }

  window.Charts = { garis, donat, batang, cincin, radar };
})();
