# SmartHome — Dasbor Keamanan Gas

Dasbor satu halaman berbasis React 19 + Vite 8 untuk perangkat keamanan gas `ESP32-GAS-01`. Aplikasi menerima telemetri dan kejadian MQTT dari firmware Wokwi, lalu menampilkan status sistem, katup, pembuangan gas, grafik riwayat, indikator gas, dan riwayat kejadian.

Dasbor **hanya untuk pemantauan**. Firmware tidak menyediakan topik perintah, sehingga aplikasi tidak membuka katup, mengatur ulang pengaman, atau mengubah ambang. Kartu Katup menampilkan telemetri tanpa toggle kontrol maupun indikator radio.

## Memulai

Memerlukan Node `^20.19.0 || >=22.12.0`.

```bash
npm install
npm run dev
```

Buka URL yang tercetak di terminal (bawaan `http://localhost:5173`). Tanpa pengirim data, aplikasi menampilkan **Menunggu data** / **Perangkat terputus** dan nilai `—`; tidak ada pembacaan contoh yang dibuat otomatis.

## MQTT

Pengaturan bawaan berada di `src/config.js`:

| Pengaturan | Nilai bawaan |
| --- | --- |
| URL peramban | `wss://broker.hivemq.com:8884/mqtt` |
| Awalan topik | `sic8/smarthome88` |
| Perangkat | `ESP32-GAS-01` |

Untuk menggantinya, gunakan variabel `.env`:

```bash
VITE_MQTT_URL=wss://broker-anda:8884/mqtt
VITE_MQTT_TOPIC_PREFIX=awalan/anda
```

Topik yang digunakan:

- `<prefix>/telemetry` — tidak disimpan oleh broker, dikirim sekitar sekali per detik.
- `<prefix>/event` — pasangan kejadian `ACTIVE` / `RESOLVED` dengan `id` yang tetap selama satu sesi perangkat.
- `<prefix>/availability` — pesan ketersediaan `online` / `offline` yang disimpan broker, termasuk pesan saat perangkat terputus.

Peramban berlangganan ketiga topik dengan QoS 1. Firmware mengirim melalui TCP `1883`; peramban harus memakai WebSocket aman milik broker (HiveMQ publik: `8884/mqtt`).

### Payload telemetri

```json
{
  "device": "ESP32-GAS-01",
  "boot": "a1b2",
  "ts": 1730000000,
  "up": 42,
  "gas": 18,
  "status": "NORMAL",
  "interlock": false,
  "purge": false,
  "valve": "CLOSED",
  "valve_on": false,
  "servo_angle": 0,
  "relay_purge": false,
  "relay_blower": false
}
```

`gas` merupakan indeks pembacaan analog MQ-2 (0–100), bukan ppm. Jika `ts` bernilai `0` atau tidak tersedia, dasbor menggunakan waktu penerimaan pesan di peramban.

### Payload kejadian

```json
{
  "id": "EVT-0001",
  "boot": "a1b2",
  "ts": 1730000000,
  "device": "ESP32-GAS-01",
  "type": "GAS_ABOVE_50",
  "category": "Warning",
  "source": "MQ-2 sensor",
  "title": "Gas above 50%",
  "detail": "Warning threshold reached",
  "gas": 55,
  "state": "ACTIVE"
}
```

Kunci kejadian adalah `device|boot|id`. Pesan `RESOLVED` memperbarui kejadian `ACTIVE` yang sama, bukan menambahkan baris baru. Jika perangkat memulai sesi baru saat kejadian sesi sebelumnya masih aktif, kejadian lama ditandai **Terhenti** (`INTERRUPTED`).

## Status dan ambang

- `0–20%` — Aman / Normal
- `50–59%` — Peringatan
- `60–100%` — Bahaya
- `21–49%` — Meningkat (digunakan pada kartu ringkasan indikator gas)

Status sistem juga mengikuti pengaman:

- Pengaman aktif dan gas di atas `20%` → **Pembuangan** (`PURGE`)
- Pengaman aktif dan gas `20%` atau lebih rendah → **Terkunci** (`LOCKOUT`)
- Selain itu, ambang gas menentukan status.

Kesehatan koneksi MQTT terpisah dari status perangkat: telemetri berusia hingga 3 detik dianggap langsung, 3–10 detik berarti menunggu, dan lebih dari 10 detik berarti terputus. Pesan ketersediaan `offline` juga menandai perangkat terputus bila tidak ada telemetri baru.

## Halaman dan tampilan

- `/` — Dasbor: status sistem, empat kartu ringkasan, grafik riwayat gas, indikator saat ini, dan lima kejadian terbaru.
- `/analytics` — Analisis gas: grafik riwayat, indikator saat ini, serta ringkasan puncak dan rata-rata sesi.
- `/event-log` — Riwayat kejadian sesi dengan pencarian, filter kategori/status/sumber, pengurutan, pagination (10 baris), pemilihan baris, dan ekspor CSV.

Tabel memakai bingkai luar membulat dengan border pada keempat sisi, pemisah antarbaris, dan gulir horizontal pada layar kecil. Pesan kosong tetap berada di dalam bingkai tabel. Ekspor tabel mengutamakan baris yang dipilih; tanpa pilihan, hasil mengikuti pencarian dan filter.

Grafik terdiri dari 12 kelompok batang CSS dan indikator SVG buatan sendiri dengan 16 segmen; tidak ada library grafik. Menu rentang waktu, pengurutan, dan filter memakai komponen bersama berbasis portal React dengan dukungan tombol panah, Home/End, Enter/Space, dan Escape.

Ikon berupa SVG lokal dari `react-icons/pi` (Phosphor), bukan font ikon dari CDN. Plus Jakarta Sans tetap dimuat melalui Google Fonts. Logo dan kedua ikon aplikasi berasal dari aset logo yang diberikan; aset asli tidak diubah.

### Bahasa

Tampilan, label aksesibilitas, tooltip, format tanggal, nama unduhan, dan judul kolom CSV menggunakan bahasa Indonesia. Zona waktu mengikuti perangkat pengguna, bukan dipaksa menjadi WIB.

Kunci dan nilai protokol MQTT tetap asli agar kompatibel dengan firmware. `getEventDisplay` di `src/utils/iot.js` menerjemahkan label dan teks kejadian yang dikenali tanpa mengubah payload. Pesan khusus atau belum dikenali dipertahankan apa adanya agar informasi perangkat tidak hilang. Pencarian menerima teks Indonesia maupun identitas MQTT asli. CSV memakai label Indonesia, tetapi ID dan kode jenis kejadian tetap asli.

### Animasi dan gulir

Animasi visual menggunakan CSS: kemunculan halaman/kartu yang halus, respons saat kursor diarahkan, transisi grafik/indikator, dan penanda data langsung. Angka telemetri diperbarui langsung tanpa animasi penghitung.

Satu instance Locomotive Scroll **v5** di `src/layouts/DashboardLayout.jsx` menghaluskan gulir roda tetikus. Gulir sentuh tetap alami, dan area gulir tabel/dropdown dikecualikan melalui `data-lenis-prevent`. Pergantian rute kembali ke bagian atas tanpa membuat instance baru; perubahan ukuran konten ditangani otomatis.

`prefers-reduced-motion` menonaktifkan animasi/transisi CSS serta instance gulir halus. Inisialisasi dan cleanup mempertimbangkan React StrictMode serta penundaan internal Locomotive v5 agar tidak menggandakan proses animasi.

## Simulator

`scripts/simulate.mjs` mengirim siklus data yang kompatibel dengan firmware agar semua status dapat diuji tanpa Wokwi:

```bash
npm run simulate
```

Simulator menggunakan awalan topik/perangkat yang sama melalui TCP `1883` (variabel `MQTT_URL` mengganti broker), lalu bergantian antara Normal → Peringatan → Bahaya → Pembuangan → Terkunci → Atur Ulang. Kejadian `ACTIVE`/`RESOLVED` dan ketersediaan perangkat ikut dikirim. Dasbor hanya menerima pesan MQTT, bukan membaca simulator secara langsung.

Hentikan Wokwi sebelum menjalankan simulator agar dua pengirim tidak memakai perangkat/topik yang sama.

## Pengujian dan verifikasi

```bash
npm test      # Pengujian bawaan Node: status, kejadian, agregasi, filter, bahasa/pencarian
npm run lint  # ESLint untuk .js/.jsx
npm run build # Hasil produksi di dist/
```

Tidak ada pemeriksaan tipe, CI, maupun hook sebelum commit. Peringatan ukuran bundel JavaScript di atas 500 kB berasal terutama dari MQTT dan bukan kegagalan build.

## Data hanya selama sesi

Riwayat telemetri dan kejadian hanya tersimpan dalam state React. Memuat ulang halaman menghapusnya; tidak ada localStorage atau data contoh. Karena kejadian tidak disimpan broker, dasbor yang dibuka saat insiden berlangsung dapat menampilkan status gas saat ini tanpa baris kejadian sebelumnya. Riwayat Kejadian menjelaskan cakupan sesi ini; hitungan kejadian juga terbatas pada sesi yang diterima.

## Struktur

```text
src/
  assets/                     logo_brand.png asli dan logo-mark.png hasil pemotongan
  components/
    charts/                   GasChart, GasGauge, RangeSelect
    events/                   EventsTable, EventFilter
    ui/                       CustomSelect, Icon, PageHeader
  config.js                   URL MQTT, topik, ambang, batas data
  context/                    IotProvider; state sesi dan data turunan
  hooks/useIot.js              akses konteks
  layouts/DashboardLayout.jsx  kerangka, merek, navigasi, koneksi, gulir
  pages/
    dashboard/                index.jsx dan komponen kartu/banner lokal
    analytics/index.jsx       halaman Analisis
    event-log/index.jsx       halaman Riwayat Kejadian
  services/mqtt.js            koneksi, langganan, cleanup MQTT
  styles/index.css            tema Tailwind dan animasi
  utils/iot.js                status, kejadian, agregasi, format, bahasa, filter/pencarian
  utils/csv.js                ekspor kejadian/riwayat CSV
public/                       favicon.png dan apple-touch-icon.png
scripts/simulate.mjs          pengirim MQTT yang kompatibel dengan firmware
tests/iot.test.js             pengujian logika inti
```

Alias `@/` mengarah ke `src/` melalui Vite dan `jsconfig.json`. Utilitas yang diimpor Node tetap memakai impor relatif agar pengujian dan simulator tidak memerlukan pemuat alias.

Tampilan menggunakan Tailwind v4 melalui `@tailwindcss/vite` dengan token tema CSS di `src/styles/index.css`. Runtime JSX bersifat otomatis; jangan menambahkan `import React` ke berkas `.jsx`.

HiveMQ publik merupakan layanan demonstrasi bersama. Untuk produksi, gunakan broker privat dengan TLS dan kredensial, lalu sesuaikan `VITE_MQTT_URL` / `VITE_MQTT_TOPIC_PREFIX`.
