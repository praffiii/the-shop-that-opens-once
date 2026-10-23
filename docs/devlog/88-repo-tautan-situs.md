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

## Verifikasi

- `gh repo view` menampilkan alamat situs sebagai homepage, beserta topiknya.
- Halaman rilis v1.0.0 menampilkan tautan situs.
- Situs terbuka di alamat itu sesudah push.
