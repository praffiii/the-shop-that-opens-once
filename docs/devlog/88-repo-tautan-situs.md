# 88. Repositori: tautan ke situs game

**Tanggal:** 2026-10-24

## Tujuan

Pengguna meminta repositori di GitHub diperbarui dan alamat situs pemasaran ditambahkan ke repositori:
https://the-shop-that-opens-once-site.vercel.app

## Yang dikerjakan

- **`README.md`:**
  - tautan situs di bawah ringkasan game;
  - "Download and play" sekarang menunjuk ke situs dan halaman Releases;
  - baris `site/` di tabel isi repositori;
  - langkah menjalankan situs di Quick start (`bun install`, `bun run dev`, `bun run sync`, `bun run build`,
    `bun test`), dan catatan bahwa setiap push ke `main` yang mengubah `site/` langsung tayang di Vercel.
- **Bagian About di GitHub:**
  - alamat situs dipasang sebagai Website;
  - topik ditambahkan supaya repositori mudah ditemukan.
- **Catatan rilis v1.0.0:** baris pertama sekarang menautkan situs.

### Aturan lewati build Vercel diperbaiki

**Masalah:** push ini berisi dua commit situs (gambar pratinjau, devlog 86, dan jendela terakhir di pagi hari, devlog
87) dengan satu commit dokumen di atasnya. Vercel hanya membangun commit paling atas, dan aturan lama
`git diff --quiet HEAD^ HEAD -- .` hanya membandingkan dengan satu commit sebelumnya. Commit dokumen itu tidak mengubah
`site/`, jadi build dibatalkan dan kedua commit situs di bawahnya tidak pernah tayang.

**Perbaikan:**

- Aturannya sekarang `git diff --quiet "${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}" HEAD -- .`.
- `VERCEL_GIT_PREVIOUS_SHA` adalah commit dari deploy terakhir yang berhasil di cabang itu. Jadi yang dibandingkan
  sekarang adalah semua perubahan sejak situs terakhir dibangun.
- Kalau variabel itu kosong (deploy pertama sebuah cabang), aturannya kembali memakai commit sebelumnya.
- Pengguna menjalankan perubahan pengaturan dan build ulang sendiri, karena pemeriksa izin menolak agen menyentuh
  produksi.

## Verifikasi

- `gh repo view` menampilkan alamat situs sebagai homepage, beserta topiknya.
- Halaman rilis v1.0.0 menampilkan tautan situs.
- Build ulang `69d65f5` menjalankan aturan baru dan tayang di produksi:
  - skrip situs langsung (`index-3LvhQ7Q6.js`) sama dengan build lokal dari `main`;
  - `og.png?v=2` di situs sama byte demi byte dengan `site/public/og.png`.
- Commit dokumen ini sendiri di-push untuk menguji aturan baru: tidak ada yang berubah di `site/` sejak `69d65f5`,
  jadi build-nya harus dibatalkan.
