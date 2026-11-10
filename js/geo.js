/* =========================================================
   geo.js — GPS perangkat (Geolocation API), Haversine, peta Leaflet
   (dimuat malas). Bila peta gagal dimuat, input lintang/bujur tetap jalan.
   ========================================================= */
(function () {
  'use strict';
  const LJS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
  const LCSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';

  const Geo = {
    haversine(lat1, lon1, lat2, lon2) {
      const R = 6371000, rad = Math.PI / 180, dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    },
    pesan(err) {
      if (!err) return 'Lokasi tidak terbaca.';
      if (err.code === 1) return 'Izin lokasi ditolak. Aktifkan izin Lokasi untuk situs ini di pengaturan browser.';
      if (err.code === 2) return 'Sinyal GPS tidak tersedia. Aktifkan GPS dan pindah ke area terbuka.';
      if (err.code === 3) return 'GPS terlalu lama merespons. Coba lagi di area terbuka.';
      return err.message || 'Lokasi tidak terbaca.';
    },
    didukung: () => 'geolocation' in navigator,
    /** Pantau posisi berkelanjutan; kembalikan fungsi henti. */
    pantau(onPos, onErr) {
      if (!Geo.didukung()) { onErr && onErr({ message: 'Perangkat tidak mendukung GPS.' }); return () => { }; }
      const id = navigator.geolocation.watchPosition(
        (p) => onPos({ lat: p.coords.latitude, lng: p.coords.longitude, akurasi: Math.round(p.coords.accuracy || 0), waktu: p.timestamp }),
        (e) => onErr && onErr(e), { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
      return () => navigator.geolocation.clearWatch(id);
    },
    sekali() {
      return new Promise((res, rej) => {
        if (!Geo.didukung()) return rej({ message: 'Perangkat tidak mendukung GPS.' });
        navigator.geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lng: p.coords.longitude, akurasi: Math.round(p.coords.accuracy || 0) }),
          rej, { enableHighAccuracy: true, maximumAge: 15000, timeout: 15000 });
      });
    },
    async muatLeaflet() {
      UI.muatCss(LCSS);
      await UI.muatScript(LJS, 'L');
      return window.L;
    },
    /**
     * Peta dengan titik penugasan + lingkaran radius.
     * o: {lat, lng, radius, pilih:true (klik/geser untuk memilih), onPilih(lat,lng), zoom, interaktif}
     */
    async peta(el, o) {
      if (!el) return null;
      try {
        const L = await Geo.muatLeaflet();
        if (!document.body.contains(el)) return null;
        el.innerHTML = '';
        const ada = isFinite(o.lat) && isFinite(o.lng) && !(o.lat === 0 && o.lng === 0);
        const pusat = ada ? [o.lat, o.lng] : [-6.99, 110.42];
        const m = L.map(el, { zoomControl: true, attributionControl: true, scrollWheelZoom: o.pilih === true, dragging: o.interaktif !== false, tap: false })
          .setView(pusat, o.zoom || (ada ? 17 : 12));
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(m);
        const pinIcon = L.divIcon({ className: '', iconSize: [30, 40], iconAnchor: [15, 38],
          html: '<svg width="30" height="40" viewBox="0 0 30 40"><path d="M15 39s13-12.4 13-23A13 13 0 0 0 2 16c0 10.6 13 23 13 23z" fill="#1F4FD8" stroke="#fff" stroke-width="2"/><circle cx="15" cy="16" r="5" fill="#fff"/></svg>' });
        let pin = null, lingkar = null, user = null, userAcc = null;
        const setPos = (lat, lng, geserPeta) => {
          if (!pin) {
            pin = L.marker([lat, lng], { icon: pinIcon, draggable: !!o.pilih }).addTo(m);
            lingkar = L.circle([lat, lng], { radius: o.radius || 100, color: '#1F4FD8', weight: 2, fillColor: '#1F4FD8', fillOpacity: 0.12 }).addTo(m);
            if (o.pilih) pin.on('dragend', () => { const p = pin.getLatLng(); lingkar.setLatLng(p); o.onPilih && o.onPilih(p.lat, p.lng); });
          } else { pin.setLatLng([lat, lng]); lingkar.setLatLng([lat, lng]); }
          if (geserPeta) m.setView([lat, lng], Math.max(m.getZoom(), 16));
        };
        if (ada) setPos(o.lat, o.lng);
        if (o.pilih) m.on('click', (e) => { setPos(e.latlng.lat, e.latlng.lng); o.onPilih && o.onPilih(e.latlng.lat, e.latlng.lng); });
        setTimeout(() => m.invalidateSize(), 120);
        return {
          map: m, setPos,
          setRadius(r) { if (lingkar) lingkar.setRadius(r); },
          setUser(lat, lng, acc) {
            if (!user) {
              userAcc = L.circle([lat, lng], { radius: acc || 10, color: '#16A34A', weight: 1, fillOpacity: 0.1 }).addTo(m);
              user = L.circleMarker([lat, lng], { radius: 7, color: '#fff', weight: 2.5, fillColor: '#16A34A', fillOpacity: 1 }).addTo(m);
            } else { user.setLatLng([lat, lng]); userAcc.setLatLng([lat, lng]); userAcc.setRadius(acc || 10); }
          },
          muatUlang() { m.invalidateSize(); }
        };
      } catch (e) {
        el.innerHTML = '<div class="map-fallback">' + UI.icon('pin', 'lg') + '<b>Peta tidak dapat dimuat</b><span style="font-size:12.5px">' +
          (o.pilih ? 'Isi lintang & bujur secara manual (salin dari Google Maps: klik kanan titik → koordinat).' : UI.esc((o.lat || 0).toFixed ? o.lat.toFixed(5) + ', ' + o.lng.toFixed(5) : '')) + '</span></div>';
        return null;
      }
    },
    /** Cari alamat (OpenStreetMap Nominatim) — dipanggil hanya saat tombol Cari ditekan. */
    async cariAlamat(q) {
      const r = await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=id&q=' + encodeURIComponent(q), { headers: { 'Accept-Language': 'id' } });
      if (!r.ok) throw new Error('Pencarian alamat gagal.');
      return (await r.json()).map((x) => ({ nama: x.display_name, lat: +x.lat, lng: +x.lon }));
    }
  };
  window.Geo = Geo;
})();
