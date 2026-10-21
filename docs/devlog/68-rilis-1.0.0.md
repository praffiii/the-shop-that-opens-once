# 68. Rilis 1.0.0 di GitHub

**Tanggal:** 2026-10-21

## Tujuan

Game sudah selesai. Pengguna ingin semua perubahan dikirim ke GitHub dan game dirilis di sana, supaya orang lain bisa
mengunduh dan memainkannya.

## Yang dikerjakan

### Versi dan build

- **Versi:** game sekarang tercatat sebagai versi 1.0.0. Sebelumnya masih 0.1.0.
- **macOS:** satu aplikasi yang jalan di Apple silicon dan Intel, untuk macOS 12 ke atas.
- **Windows:** 64-bit, untuk Windows 10 dan 11.
- **Isi zip:** masing-masing build dikemas dalam satu zip. Zip Windows berisi seluruh folder game, tanpa folder
  `_BackUpThisFolder_ButDontShipItWithYourGame`, karena folder itu hanya berisi simbol debug.
- **Ukuran:** zip macOS 58 MB, zip Windows 50 MB.
- **Checksum:** checksum SHA-256 kedua zip ikut dilampirkan di halaman rilis.

### Perbaikan: build menampilkan layar hitam

Build macOS pertama untuk rilis ini hanya menampilkan layar hitam. Log pemain mencatat "shader is null" dan
`NullReferenceException` di setiap frame.

- **Penyebab:** `UniversalRenderPipelineGlobalSettings.asset` sudah di-commit dengan daftar `m_RuntimeSettings` yang kosong
  sejak proyek dibuat. Daftar itu menentukan pengaturan grafis mana yang dimuat pemain, termasuk shader CoreBlit milik URP.
  Setiap build mengisi daftar itu. Tapi sejak devlog 50, perubahan tersebut dianggap "sisa build" lalu dibuang. Kalau file
  sudah dibuang sebelum build berikutnya, build itu ikut membawa daftar yang kosong.
- **Kenapa dulu build bisa jalan:** dulu tidak ada pembuangan di antara dua build.
- **Perbaikannya:** pengaturan URP sekarang di-commit persis seperti yang ditulis build, jadi checkout yang bersih pun
  langsung menghasilkan build yang benar. README juga memperingatkan agar file-file ini tidak dibuang lagi.

### README

README punya bagian baru, **Download and play**. Isinya:

- tautan ke halaman Releases;
- cara membuka game di macOS: klik kanan, lalu pilih **Open**. Ada juga perintah `xattr -cr` kalau macOS masih menolak;
- cara melewati peringatan SmartScreen di Windows: pilih **More info**, lalu **Run anyway**.

Langkah-langkah ini dibutuhkan karena kedua build tidak ditandatangani. Menandatangani build butuh akun Apple Developer
berbayar, dan itu tidak sepadan untuk proyek ini.

### Rilis

Semua commit di `main` dikirim ke GitHub. Tag `v1.0.0` dibuat, dan kedua zip diunggah ke rilis
[v1.0.0](https://github.com/praffiii/the-shop-that-opens-once/releases/tag/v1.0.0).

Keputusannya dicatat di `GAME-CONTEXT.md`.

## Cara dicek

- Kedua build selesai tanpa error. Build macOS menyimpan versi 1.0.0 dan berisi kode untuk x86_64 dan arm64.
- Laporan build percobaan menunjukkan shader URP memang ikut terbawa. Satu-satunya perbedaan antara build yang rusak dan
  yang jalan adalah isi daftar `m_RuntimeSettings` pada saat build dibuat.
- Build macOS yang sudah diperbaiki menampilkan layar judul dengan normal. Log-nya bersih, tanpa `NullReferenceException`
  dan tanpa "shader is null".
- Zip macOS dibuka ulang di folder lain lalu dijalankan. Hasilnya tetap bersih.
- Build Windows belum dicoba di PC Windows. Build-nya dibuat dari pengaturan yang sama dengan build macOS.

## Commit

- `03ad89b` fix(build): keep URP's player settings as a build writes them
- `0c0bf52` chore(release): version 1.0.0, with download steps in the README
- `709b377` docs(context): record the 1.0.0 release and keeping the URP build settings
