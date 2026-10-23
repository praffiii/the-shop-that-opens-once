# 85. Situs pemasaran: Vercel tersambung ke GitHub

**Tanggal:** 2026-10-24

## Tujuan

Di dasbor Vercel, ketiga proyek game ini belum tersambung ke repositori. Pengguna setuju menyambungkan proyek situs.
Presentasi (`presentation/` dibekukan) dan build game lama tetap tidak disambungkan, karena isinya tidak akan berubah
lagi.

## Yang dikerjakan

Semua diatur di proyek `the-shop-that-opens-once-site`. Pengaturannya dipasang sebelum repositori disambungkan,
supaya push pertama tidak membangun dari folder yang salah.

- **Root Directory: `site`.** Situs ada di folder itu, bukan di akar repositori.
- **Framework: Vite.** Sebelumnya kosong, dan setiap deploy dari CLI mendeteksinya sendiri.
- **Lewati build yang tidak perlu:** `git diff --quiet HEAD^ HEAD -- .`, cara yang dianjurkan Vercel. Commit yang
  tidak mengubah apa pun di `site/` (misalnya game Unity atau devlog) tidak membangun ulang situs, jadi jatah 100 deploy
  per hari tetap aman.
- **GitHub:** tersambung ke `praffiii/the-shop-that-opens-once`.
  - Push ke `main` menjadi produksi.
  - Cabang lain dan pull request mendapat tautan pratinjau.
- **Tautan CLI lokal** dipindah ke akar repositori. Dengan Root Directory `site`, deploy dari CLI harus dijalankan dari
  akar. Berkas `.env.local` berisi token yang dibuat `vercel link` dihapus lagi.

## Verifikasi

- Pengaturan proyek dibaca ulang lewat API: `rootDirectory = site`, `framework = vite`, aturan lewati terpasang, dan
  `link` mengarah ke repositori GitHub dengan cabang produksi `main`.
- **Deploy pratinjau langsung dari GitHub `main`:**
  - aturan lewati berjalan dan melihat perubahan di `site/`, jadi build tetap jalan;
  - `bun install` lalu `bun run build` berhasil, dan statusnya READY.
- Produksi tidak disentuh.
