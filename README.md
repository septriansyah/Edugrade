# Edugrade

Edugrade adalah platform evaluasi dan penilaian akademik berbasis kecerdasan buatan (AI) yang dirancang untuk membantu pendidik (Guru) dan pelajar (Siswa) dalam mengoptimalkan proses belajar-mengajar. Platform ini mengotomatiskan tugas-tugas administratif evaluasi mulai dari pembuatan soal terstandar Taksonomi Bloom hingga analisis butir soal yang mendalam.

## Fitur Utama

### 1. Portal Guru (Teacher Portal)
* **Generator Soal Cerdas**: Membuat paket soal pilihan ganda atau esai secara otomatis berdasarkan materi rujukan dengan standar kognitif Taksonomi Bloom (C1 - C6) serta HOTS (Higher Order Thinking Skills).
* **Koreksi Esai Otomatis & Semantik**: AI menganalisis jawaban esai siswa secara kontekstual menggunakan pencocokan kata kunci semantik, memberikan rekomendasi skor instan, dan memberikan umpan balik objektif yang dapat divalidasi langsung oleh guru.
* **Analisis Butir Soal & Pengecoh**: Menghitung secara otomatis validitas, reliabilitas, tingkat kesukaran, daya pembeda kelompok, serta efektivitas pengecoh (distraktor) dari setiap butir soal tanpa perlu rumus Excel yang rumit.
* **Manajemen Kelas**: Membuat kelas, membagikan kode kelas, menjadwalkan pertemuan daring (seperti Google Meet), mengunggah materi pelajaran, serta membuat tugas dan ujian.

### 2. Portal Siswa (Student Portal)
* **Gabung Kelas**: Bergabung ke kelas guru menggunakan kode kelas yang dibagikan secara instan.
* **Manajemen Tugas & Ujian**: Mengerjakan tugas atau ujian secara online, melihat status pengumpulan, dan memantau nilai esai/pilihan ganda yang telah dinilai oleh guru atau asisten AI.
* **Timeline Aktivitas**: Memantau tenggat waktu tugas, jadwal pertemuan kelas, dan rilis materi belajar terbaru secara real-time.
* **Akses Materi & Meeting**: Mengunduh modul/materi pelajaran dan langsung bergabung ke link pertemuan video tatap muka yang disediakan guru.

### 3. Sistem Pembayaran & Keanggotaan Premium
* Integrasi dengan payment gateway **Midtrans (Snap API)** untuk memfasilitasi peningkatan akun (upgrade) ke **Premium Pro** dengan satu kali pembayaran (one-time payment) untuk mendapatkan token AI tambahan dan fitur analisis penuh.

---

## Teknologi yang Digunakan

* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Motion (untuk animasi yang mulus).
* **Backend**: Express.js, TypeScript, TSX.
* **Database & Layanan Cloud**: Firebase (Authentication, Firestore Database, Firestore Security Rules).
* **Integrasi Pihak Ketiga**:
  * Midtrans Snap API (Gerbang Pembayaran).
  * Google Gemini API (Mesin Asisten Kecerdasan Buatan).

---

## Struktur Proyek

```
edugrade/
├── api/                  # Kode backend untuk pemrosesan API (misal: transaksi Midtrans)
├── src/
│   ├── components/       # Komponen React yang dapat digunakan kembali (Modal, Layout, dll.)
│   ├── font/             # Font kustom (Loyola Pro)
│   ├── img/              # Aset gambar dan ikon
│   ├── lib/              # Konfigurasi utilitas dan SDK (Firebase, dll.)
│   ├── pages/            # Halaman aplikasi (LandingPage, AuthPage, Dashboards, dll.)
│   ├── App.tsx           # Router dan entri utama aplikasi React
│   ├── index.css         # Gaya CSS Global dan konfigurasi tema Tailwind CSS v4
│   └── main.tsx          # Bootstrap aplikasi React
├── firestore.rules       # Aturan keamanan database Firestore
├── package.json          # Manajemen dependensi dan script NPM
├── server.ts             # Konfigurasi server Node/Express
├── tsconfig.json         # Konfigurasi compiler TypeScript
└── vite.config.ts        # Konfigurasi bundling Vite
```

---

## Langkah Menjalankan Aplikasi Secara Lokal

### Prasyarat
Pastikan Anda sudah menginstal:
* [Node.js](https://nodejs.org/) (versi 18 ke atas direkomendasikan)
* [NPM](https://www.npmjs.com/)

### 1. Klon Repositori
```bash
git clone https://github.com/septriansyah/Edugrade.git
cd Edugrade
```

### 2. Instal Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment Variables
Buat berkas `.env` di root direktori berdasarkan `.env.example` yang disediakan, lalu lengkapi dengan API Key Firebase, Midtrans, dan Gemini milik Anda:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
...
VITE_MIDTRANS_CLIENT_KEY=your_midtrans_client_key
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Menjalankan Server Development
Untuk menjalankan frontend (Vite) dan backend (Express) secara bersamaan:
```bash
npm run dev
```
Aplikasi dapat diakses di browser melalui alamat default `http://localhost:5173`.

### 5. Membangun Bundel Produksi (Build)
Untuk membuild aplikasi untuk tahap produksi:
```bash
npm run build
```

### 6. Menjalankan Uji Linter & Tipe
Untuk memverifikasi kebersihan kode dan pemeriksaan tipe TypeScript:
```bash
npm run lint
```
