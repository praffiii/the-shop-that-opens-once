# Dev log: The Shop That Opens Once

Catatan perkembangan pembuatan game, satu entri untuk setiap langkah kerja. Catatan ini merekam progres tugas mata
kuliah Pengembangan Aplikasi Permainan (SE.3 Kelompok 1).

## Daftar entri

| No. | Tanggal | Langkah | Tag |
|---|---|---|---|
| [01](01-migrasi-ke-unity.md) | 2026-10-18 | Pindah dari Godot ke Unity dan ke GDD UTS | `godot-mvp` (arsip) |
| [02](02-proyek-unity.md) | 2026-10-18 | Proyek Unity 6.6 dan alat kerja | |
| [03](03-fondasi.md) | 2026-10-18 | Pipeline art dan fondasi sistem game | `m1-foundation` |
| [04](04-dunia-bellwood.md) | 2026-10-18 | Dunia Bellwood: empat zona dalam satu peta | `m2-world` |
| [05](05-desa-gaya-rpg.md) | 2026-10-18 | Bellwood digambar ulang: desa gaya RPG yang hidup | |
| [06](06-hd2d-dan-area.md) | 2026-10-18 | Tampilan HD-2D, hutan beringin tersembunyi, dan lima area kecil | |
| [07](07-bangunan-3d-dan-kurir.md) | 2026-10-18 | Bangunan 3D, toko yang ditelan akar, dan kurir yang berbalik | |
| [08](08-kamera-octopath-dan-tepi-berkabut.md) | 2026-10-18 | Kamera ala Octopath dan tepi area yang berkabut | |
| [09](09-tepi-area-ditutup-hutan.md) | 2026-10-18 | Tepi area ditutup hutan, gerbang pohon, dan pagar semak | |
| [10](10-alun-alun-dan-bangunan-3d.md) | 2026-10-18 | Alun-alun dan bangunan 3D ala Octopath | |
| [11](11-stasiun-timur-pantai-3d.md) | 2026-10-18 | Stasiun, timur, dan pantai dengan bangunan 3D, dan tangga sungguhan | |
| [12](12-penduduk-hidup-pagi-di-stasiun.md) | 2026-10-18 | Penduduk yang hidup: pagi di stasiun, dan stasiun sebagai satu tempat | |
| [13](13-siang-dan-sore-di-stasiun.md) | 2026-10-18 | Siang dan sore di stasiun: rutinitas penduduk sepanjang hari | |
| [14](14-pagi-di-alun-alun.md) | 2026-10-18 | Pagi di alun-alun: Baker, Mia, Pip, dan Sam dari GDD | |
| [15](15-siang-dan-sore-di-alun-alun.md) | 2026-10-18 | Siang dan sore di alun-alun: gosip, istirahat Pip, dan pulang sebelum gelap | |
| [16](16-pagi-di-area-timur.md) | 2026-10-19 | Pagi di area timur: Nora, Gardener, dan Leo dari GDD | |
| [17](17-siang-dan-sore-di-area-timur.md) | 2026-10-19 | Siang dan sore di area timur: Nora di tangganya, Gardener di bangku, Leo di teleskop | |
| [18](18-sehari-di-pesisir.md) | 2026-10-19 | Sehari di pesisir: Theo dan Nelayan Arlo dari GDD | |
| [19](19-semut-latar-di-stasiun.md) | 2026-10-19 | Semut latar di stasiun: dua tetangga yang mengobrol | |
| [20](20-semut-latar-di-alun-alun.md) | 2026-10-19 | Semut latar di alun-alun: pembeli dan penjual bunga | |
| [21](21-semut-latar-di-area-timur.md) | 2026-10-19 | Semut latar di area timur: buruh kebun dan penggembala kutu daun | |
| [22](22-semut-latar-di-pesisir.md) | 2026-10-19 | Semut latar di pesisir: nelayan dan pekerja garam | |
| [23](23-puncak-tebing-pesisir-bisa-dilewati.md) | 2026-10-19 | Puncak tebing pesisir bisa dilewati; hutan kecil tanpa semut latar | |
| [24](24-pip-berbalik-dan-sarung-tangan-bram.md) | 2026-10-19 | Pip berbalik menghadap kamera; sarung tangan putih Kapten Bram | |
| [25](25-rumah-masa-kecil-satria.md) | 2026-10-19 | Rumah masa kecil Satria: interior pertama, pintu yang langsung berganti ala Octopath | |
| [26](26-toko-marlow.md) | 2026-10-19 | Toko Marlow: interior kedua, lemari tujuh kotak, kamera mendekat di dalam ruangan | |
| [27](27-adegan-hidup-dan-kotak-marlow.md) | 2026-10-19 | Adegan hidup: penyerahan kotak sebagai adegan sinematik, kotak dibuka dari dekat, Marlow menjaga tokonya | |
| [28](28-naskah-baru-dan-awal-prolog.md) | 2026-10-20 | Naskah dan bible baru, Jalan Timur, dan awal prolog: dari halte sampai sambutan di alun-alun | |
| [29](29-valdo-dan-malam-pertama.md) | 2026-10-20 | Valdo mencegat Satria, pagar berkarat, rumah keluarga, dan malam pertama: akhir Day 0 | |
| [30](30-suara-dialog.md) | 2026-10-20 | Suara dialog ala Animal Crossing: blip per huruf untuk tiap tokoh, sesuai tabel bible | |
| [31](31-prolog-jadi-awal-game.md) | 2026-10-20 | Prolog menjadi awal game lewat Begin, tes yang memainkan Day 0 sampai akhir, dan penampilan Marlow | |
| [32](32-jam-hari-dan-suasana.md) | 2026-10-20 | Waktu digerakkan cerita: jam hari dan fase di kiri atas, peralihan senja ke malam yang ditonton, dan suasana bunyi per fase | |
| [33](33-jam-roda-dan-dialog-hidup.md) | 2026-10-20 | Jam hari berbentuk roda berjarum, dialog yang lebih hidup (jeda, penekanan, ekspresi, emote), dan semua teks dalam bahasa Inggris | |
| [34](34-simpanan-dan-tas.md) | 2026-10-20 | Simpanan yang bertahan antarbab dan checkpoint per fase, pengaman agar kurir tak pernah membeku, dan tas yang lebih jelas | |

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
| `m2-world` | Dunia luar Bellwood digambar ulang: empat zona dalam satu peta, dengan fase hari lewat shader |
