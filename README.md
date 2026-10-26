# SmartHome — Dasbor Keamanan Gas

Dasbor React 19 + Vite 8 untuk memantau perangkat gas `ESP32-GAS-01` secara langsung melalui MQTT. Aplikasi bersifat **hanya pemantauan**: katup dan pengaman gas dikendalikan oleh firmware, bukan dari dasbor.

## Menjalankan

Memerlukan Node `^20.19.0 || >=22.12.0`.

```bash
npm install
npm run dev
```

Buka URL yang tercetak di terminal (bawaan `http://localhost:5173`).

Tidak ada konfigurasi tambahan yang diperlukan. Broker MQTT dan awalan topik sudah disetel secara bawaan di `src/config.js` agar sesuai dengan firmware pada proyek Wokwi, sehingga `.env` tidak perlu dibuat.

## Sumber data (Wokwi)

Firmware dan simulator perangkat tersedia di:

**https://wokwi.com/projects/478829818145313793**

Jalankan proyek Wokwi, lalu buka dasbor di browser. Data akan masuk secara otomatis tanpa perlu mengubah pengaturan pada Wokwi maupun pada aplikasi.

## Status koneksi

- **MQTT terhubung** — telemetri diterima secara langsung.
- **Menunggu data** / **Perangkat terputus** — belum ada telemetri baru dari perangkat.

## Pengujian tanpa Wokwi

Untuk menguji seluruh status (Normal, Peringatan, Bahaya, Pembuangan, Terkunci) tanpa membuka Wokwi, gunakan simulator bawaan:

```bash
npm run simulate
```

Simulator mengirim data ke topik dan perangkat yang sama. Hentikan simulasi Wokwi terlebih dahulu agar tidak ada dua pengirim pada topik yang sama.

## Jika data tidak muncul

1. Pastikan simulasi Wokwi sedang berjalan.
2. Tunggu beberapa detik — broker HiveMQ publik kadang lambat atau sedang melakukan reconnect.
3. Pastikan simulator lokal tidak berjalan bersamaan dengan Wokwi.

Riwayat telemetri dan kejadian hanya tersimpan selama sesi; memuat ulang halaman akan mengosongkannya.
