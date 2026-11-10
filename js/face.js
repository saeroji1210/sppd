/* =========================================================
   face.js — verifikasi wajah di browser (face-api.js, model TinyFaceDetector
   + Landmark68 + FaceRecognition 128-D). Server menghitung ulang skor dari
   deskriptor yang dikirim, jadi skor di perangkat hanya untuk panduan.
   ========================================================= */
(function () {
  'use strict';
  const BASE = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7';
  const Wajah = {
    LIB: BASE + '/dist/face-api.js',
    MODEL: BASE + '/model/',
    _siap: null,

    /** Muat pustaka + 3 model (±7 MB pertama kali; berikutnya dari cache service worker). */
    muat(onProgres) {
      if (Wajah._siap) return Wajah._siap;
      Wajah._siap = (async () => {
        onProgres && onProgres('Memuat modul pengenalan wajah…', 10);
        await UI.muatScript(Wajah.LIB, 'faceapi');
        const f = window.faceapi;
        onProgres && onProgres('Memuat model deteksi wajah…', 35);
        await f.nets.tinyFaceDetector.loadFromUri(Wajah.MODEL);
        onProgres && onProgres('Memuat model titik wajah…', 55);
        await f.nets.faceLandmark68Net.loadFromUri(Wajah.MODEL);
        onProgres && onProgres('Memuat model pengenal wajah…', 75);
        await f.nets.faceRecognitionNet.loadFromUri(Wajah.MODEL);
        onProgres && onProgres('Model siap', 100);
        return f;
      })().catch((e) => { Wajah._siap = null; throw new Error('Modul pengenalan wajah gagal dimuat. Periksa koneksi internet lalu coba lagi. (' + e.message + ')'); });
      return Wajah._siap;
    },

    opsi() { return new window.faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }); },

    /** Deteksi tepat satu wajah → deskriptor 128 angka. */
    async deteksi(input) {
      const f = window.faceapi;
      const hasil = await f.detectAllFaces(input, Wajah.opsi()).withFaceLandmarks().withFaceDescriptors();
      if (!hasil.length) return { jumlah: 0 };
      if (hasil.length > 1) return { jumlah: hasil.length };
      const h = hasil[0];
      return { jumlah: 1, desc: Array.from(h.descriptor), skorDeteksi: h.detection.score, box: h.detection.box };
    },

    /** Untuk foto referensi (admin): lempar error yang jelas bila tidak tepat satu wajah. */
    async deskriptorGambar(img) {
      await Wajah.muat();
      const r = await Wajah.deteksi(img);
      if (r.jumlah === 0) throw new Error('Wajah tidak terdeteksi. Gunakan foto close-up, menghadap depan, terang, tanpa masker.');
      if (r.jumlah > 1) throw new Error('Terdeteksi ' + r.jumlah + ' wajah. Gunakan foto yang hanya berisi satu orang.');
      if (r.skorDeteksi < 0.7) throw new Error('Kualitas wajah kurang jelas (skor ' + Math.round(r.skorDeteksi * 100) + '%). Gunakan foto lebih terang dan tajam.');
      return r.desc;
    },

    async kamera(video, depan) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('Browser tidak mendukung kamera. Gunakan Chrome/Safari versi terbaru melalui HTTPS.');
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: depan === false ? 'environment' : 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
        video.srcObject = s;
        video.setAttribute('playsinline', ''); video.muted = true;
        await video.play();
        return s;
      } catch (e) {
        if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) throw new Error('Izin kamera ditolak. Buka pengaturan situs di browser lalu izinkan Kamera.');
        if (e && e.name === 'NotFoundError') throw new Error('Kamera tidak ditemukan pada perangkat ini.');
        throw new Error('Kamera tidak dapat dibuka: ' + (e && e.message ? e.message : e));
      }
    },

    hentikan(stream) { try { stream && stream.getTracks().forEach((t) => t.stop()); } catch (e) { /* abaikan */ } },

    jarak(a, b) { let s = 0; for (let i = 0; i < 128; i++) { const x = (a[i] || 0) - (b[i] || 0); s += x * x; } return Math.sqrt(s); },
    /** Sama dengan server: d=0,3→91 · d=0,4→84 · d=0,5→75 · d=0,6→64 */
    skor(d) { return Math.round(100 * Math.max(0, 1 - d * d)); }
  };
  window.Wajah = Wajah;
})();
