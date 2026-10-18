# 01. Pindah dari Godot ke Unity dan ke GDD UTS

**Tanggal:** 2026-10-18

## Tujuan

Memindahkan proyek dari Godot 4 ke Unity 6.6 dan menjadikan GDD UTS sebagai desain baru. Desain baru ini mengubah cerita
dan gameplay. Versi Godot disimpan sebagai arsip dan tidak diubah lagi.

## Yang dikerjakan

- **Arsip Godot.** Proyek Godot dipindahkan utuh dari `game/` ke `archive/godot-mvp/`, tanpa satu file pun yang
  diubah. Commit terakhirnya ditandai dengan git tag `godot-mvp`. Build web-nya tetap online di
  https://the-shop-that-opens-once-game.vercel.app sebagai rekam jejak.
- **GDD baru.** Laporan UTS (*Perancangan Game Design Document (GDD) dan Storyboard Game*) disimpan di
  `docs/game-design-document.pdf`.
- **`GAME-CONTEXT.md` ditulis ulang** dari GDD: dunia Bellwood dengan 4 zona dan 9 interior, 18 karakter, core loop
  satu malam satu keepsake, Prolog, 7 malam, dan Epilog, rintangan emosional tiap malam, UI, audio, art, serta
  daftar inkonsistensi dan pertanyaan yang masih terbuka.
- **README dan `CLAUDE.md`** diperbarui sesuai arah baru.

## Keputusan

| Keputusan | Alasan |
|---|---|
| Unity 6.6 (6000.6.6f1) dengan C# | Pilihan tim untuk versi penuh game |
| Target build: Web dulu, lalu Windows | Web paling mudah dibagikan untuk dinilai dan dimainkan |
| Membuat game penuh, bukan MVP | Prolog, 7 malam, dan Epilog |
| Semua aset dibuat dari nol, tanpa AI | Pixel art digambar lewat kode dan suara disintesis lewat kode, seperti di versi Godot. Bagian 13.3 GDD (Midjourney, FLUX, Suno) hanya untuk kebutuhan formal laporan. |
| Presentasi web dibekukan | Presentasi tetap seperti sekarang dan tidak diperbarui lagi |
| Cerita lama (Arthur Tate, jam 18:17, Elise) tidak dipakai lagi | Diganti cerita GDD: Satria, Marlow, badai 1952, jam berhenti di 10:17 |

## Masalah dan solusinya

- **File GDD yang salah.** File pertama yang diberikan ternyata template laporan. File yang benar adalah
  `Kel 1_Laporan UTS SE.3.pdf`.
- **PDF terlalu besar untuk repo.** GDD dikompres dengan Ghostscript (gambar 200 dpi) menjadi 2,2 MB untuk 64
  halaman.
- **GDD tidak selalu konsisten.** Misalnya durasi main (1–3 jam lawan 3–4 jam), dua tokoh bernama Bram, dan lokasi Helen.
  Semuanya dicatat di bagian *Known inconsistencies* pada `GAME-CONTEXT.md`, lalu ditanyakan ke tim saat dibutuhkan.

## Cara dicek

- `git show --stat` menunjukkan 317 file Godot dipindahkan dengan status *rename 100%*, artinya isinya tidak berubah.
- `git checkout godot-mvp` membuka kembali versi Godot persis seperti sebelum migrasi.

## Commit

- `b67f3a5` docs: move to Unity and the UTS GDD, archive the Godot MVP

## Langkah berikutnya

Membuat proyek Unity di `game/` ([entri 02](02-proyek-unity.md)).
