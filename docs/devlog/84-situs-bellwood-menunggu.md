# 84. Situs pemasaran: "Bellwood is waiting for you." dan rilis

**Tanggal:** 2026-10-24

## Tujuan

Setelah jendela terakhir menampilkan seluruh warga (devlog 83), judul "Midnight. The shop is open." tidak lagi cocok
dengan gambarnya. Pengguna memilih judul baru, meminta kata "midnight" dihapus dari papan nama, lalu meminta situs
dirilis.

## Yang dikerjakan

- **Judul bagian terakhir:** "Bellwood is waiting for you." (Bahasa Indonesia: "Bellwood menunggumu.").
- **Papan nama jendela:** "All of Bellwood" ("Seluruh Bellwood"), tanpa "midnight".
- **Deskripsi untuk pembaca layar:** kata "tengah malam" juga dihapus, supaya sama dengan papan nama.
- **Rilis:** dirilis ke produksi di https://the-shop-that-opens-once-site.vercel.app atas permintaan pengguna.

## Verifikasi

- `bun test`: 4 tes lulus.
- `bun run build`: bersih.
- Situs produksi menampilkan judul dan papan nama yang baru.
