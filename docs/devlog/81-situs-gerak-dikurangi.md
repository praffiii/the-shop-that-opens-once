# 81. Situs pemasaran: satu putaran "kurangi gerak"

**Tanggal:** 2026-10-24

## Tujuan

Pengguna setuju satu putaran `prefers-reduced-motion` untuk seluruh halaman, supaya pengunjung yang mengatur sistemnya
untuk mengurangi gerak tidak terganggu oleh gerak yang hanya hiasan.

## Prinsip

- Gerak yang hanya membuat halaman terasa hidup berhenti.
- Gerak yang menjawab tindakan pengunjung tetap ada, karena itu cara halaman memberi tahu apa yang berubah.
- Dunia di jendela (semut berjalan, pohon bergoyang) adalah isinya sendiri, seperti video, jadi tetap berjalan.

## Sudah ada sebelumnya

- Semua animasi dan transisi CSS dipersingkat menjadi 0,01 detik.
- Awan dan tanah latar berhenti.
- Tombol "Download free" melompat, tidak meluncur.
- Pergantian jendela tanpa view transition.
- Kartu pos muncul langsung, tanpa naik.
- Bintang GitHub tanpa percikan.

## Yang ditambahkan

- Aturan CSS tadi sekarang juga mencakup `::after`, bukan hanya elemen dan `::before`.
- **Lentera** di papan Unduh dan di dahan kartu pos tidak lagi berkedip sendiri. Kedipan saat disentuh tetikus atau
  diketuk tetap ada.
- **Meja roda gigi:** saat gagal, papan tidak berguncang. Kalimat sang Mender (atau Satria) tetap muncul, jadi
  kegagalannya tetap terbaca. Percikan saat berhasil tetap ada, karena menjawab tindakan pemain.
- **Gelembung bicara** di atas warga (saat bermain layar penuh) tidak lagi naik-turun.

## Verifikasi

- `bun test`: 4 tes lulus.
- `bun run build`: bersih.
- Diuji di browser dengan `reducedMotion: 'reduce'` di 1440x900:
  - selama 120 frame tidak ada lentera yang berkedip sendiri;
  - "Download free" langsung sampai di `#download`;
  - console tanpa galat.
