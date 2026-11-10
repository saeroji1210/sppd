/* Service worker SIPERDIN — mempercepat pembukaan ulang & menyimpan pustaka berat (model wajah ±7 MB).
   Permintaan ke API Google Apps Script TIDAK PERNAH di-cache. Naikkan VERSI setiap merilis frontend baru. */
const VERSI = 'siperdin-v1.0.1';
const SHELL = ['./', 'index.html', 'css/style.css', 'js/config.js', 'js/ui.js', 'js/api.js', 'js/charts.js', 'js/face.js', 'js/geo.js', 'js/app.js',
  'js/halaman-auth.js', 'js/halaman-pegawai.js', 'js/halaman-admin.js', 'js/demo.js', 'manifest.webmanifest', 'assets/icon.svg'];
const CDN = /^https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;
const JANGAN = /(script\.google\.com|script\.googleusercontent\.com|accounts\.google\.com|oauth2\.googleapis\.com|nominatim\.openstreetmap\.org)/;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSI).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSI && k !== 'siperdin-cdn').map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request, url = req.url;
  if (req.method !== 'GET' || JANGAN.test(url)) return;
  if (config(url)) { // network-first: perubahan GAS_URL langsung berlaku, tetap jalan saat sinyal hilang
    e.respondWith(fetch(req).then((res) => { const cp = res.clone(); caches.open(VERSI).then((c) => c.put(req, cp)); return res; }).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }
  if (CDN.test(url)) {
    // cache-first untuk pustaka & model (berversi di URL)
    e.respondWith(caches.open('siperdin-cdn').then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }))));
    return;
  }
  if (new URL(url).origin === self.location.origin) {
    // stale-while-revalidate untuk file aplikasi
    e.respondWith(caches.open(VERSI).then((c) => c.match(req, { ignoreSearch: true }).then((hit) => {
      const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});
function config(url) { return /\/js\/config\.js(\?|$)/.test(url); }
