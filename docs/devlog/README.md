# Dev log: The Shop That Opens Once

Catatan perkembangan pembuatan game, satu entri untuk setiap langkah kerja. Catatan ini merekam progres tugas mata
kuliah Pengembangan Aplikasi Permainan (SE.3 Kelompok 1).

## Daftar entri

| No. | Tanggal | Langkah | Tag |
|---|---|---|---|
| [01](01-migrasi-ke-unity.md) | 2026-10-18 | Pindah dari Godot ke Unity dan ke GDD UTS | `godot-mvp` (arsip) |
| [02](02-proyek-unity.md) | 2026-10-18 | Proyek Unity 6.6 dan alat kerja | |
| [03](03-fondasi.md) | 2026-10-18 | Pipeline art dan fondasi sistem game | `m1-foundation` |

## Format setiap entri

Setiap entri ditulis di `NN-nama-langkah.md` dan memuat:

1. **Tujuan**: apa yang ingin dicapai di langkah ini.
2. **Yang dikerjakan**: hasil nyata, berupa file, fitur, atau dokumen.
3. **Keputusan**: pilihan yang diambil beserta alasannya. Keputusan juga dicatat di `GAME-CONTEXT.md`.
4. **Masalah dan solusinya**: kendala yang muncul dan cara mengatasinya.
5. **Tangkapan layar**: disimpan di `img/NN/`.
6. **Cara dicek**: tes, build, atau pemeriksaan yang membuktikan langkah ini berhasil.
7. **Commit**: hash commit dari langkah ini.
8. **Langkah berikutnya**.

## Tag milestone

Setiap milestone diberi git tag, sehingga keadaan game di titik itu bisa dibuka lagi kapan saja
(`git checkout <tag>`).

| Tag | Isi |
|---|---|
| `godot-mvp` | Commit terakhir versi Godot (Night 1 dan 2 dari cerita lama), sebelum pindah ke Unity |
| `m1-foundation` | Fondasi sistem di Unity: tempat, berjalan, dialog, tas, keepsake, simpan, suara |
