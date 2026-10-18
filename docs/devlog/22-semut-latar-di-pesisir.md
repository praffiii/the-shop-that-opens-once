# 22. Semut latar di pesisir

**Tanggal:** 2026-10-19

## Tujuan

Stasiun, alun-alun, dan area timur sudah punya semut latar. Langkah ini membawa dua semut latar ke pesisir: nelayan
pengangkut ikan dan pekerja garam.

## Yang dikerjakan

### Penampilan (`chars.js`)

- **Nelayan:** kaus bergaris merah-putih, topi putih berpinggiran hitam, dan peti berisi ikan hasil tangkapan.
- **Pekerja garam:** kemeja krem berlengan digulung, sarung hijau tosca, caping lebar, dan karung garam.
- Keduanya mendapat potret untuk kotak dialog.

![Potret nelayan dan pekerja garam](img/22/01-potret.png)

### Kegiatan mereka (`Places.cs`)

- **Pagi dan siang, nelayan:** mengambil peti ikan di pangkal dermaga, lalu membawanya menyeberangi pasir ke rak ikan
  di dekat mercusuar. Kalimatnya menyebut Arlo: Arlo yang menangkap, dia yang mengangkut.
- **Pagi dan siang, pekerja garam:** menggaruk garam di pasir, lalu membawa karungnya ke gudang garam.
- **Sore:** nelayan duduk di perahu dayung yang ditarik ke pasir, dan pekerja garam menyapu di depan gudang garam, di
  sebelah tumpukan garam.
- Masing-masing punya satu kalimat untuk siang hari dan satu untuk sore, tidak pernah berupa petunjuk.

![Pekerja garam menggaruk garam, nelayan di pangkal dermaga](img/22/02-menggaruk-garam.png)

![Pekerja garam membawa karung ke gudang garam](img/22/03-karung-ke-gudang-garam.png)

![Nelayan meletakkan peti di rak ikan](img/22/04-peti-ke-rak-ikan.png)

![Sore: nelayan di perahu, pekerja garam menyapu](img/22/05-sore-di-pantai.png)

### Perahu yang ditarik ke pasir (`village-south.js`, `areas.js`)

- `V.rowboat(true)` menggambar perahu dayung yang diam di pasir, tanpa air di sekelilingnya.
- Perahu itu dipindah ke tepi air.

## Masalah dan solusinya

- **Perahu terlihat terapung di tengah pasir.** Pengguna bertanya kenapa ada perahu di pasir. Perahu di pasir memakai
  gambar perahu yang mengapung: bergoyang, dengan buih di sekeliling lambungnya dan riak di haluannya, padahal letaknya
  jauh dari air. Sekarang perahu itu diam, tanpa buih, dan berada di tepi air. Tempat duduk nelayan ikut pindah.

## Cara dicek

- Ekspor dengan `python3 game/ArtSource/export.py --force cast` dan `--force areas`. Hanya gambar pesisir yang berubah,
  peta jalannya tetap.
- Pratinjau pose dan potret kedua semut.
- Posisi dan pose keduanya dicatat setiap beberapa detik saat bermain: nelayan dari dermaga ke rak ikan dan kembali,
  pekerja garam dari pasir ke gudang garam dan kembali.
- Tangkapan layar siang dan sore hari.
- Tes PlayMode lulus 3 dari 3, termasuk `VillagersTest.EveryoneCanBeReached` untuk pesisir.

## Commit

`feat(villagers): add the coast's fisher and salt worker`

## Langkah berikutnya

- Memeriksa apakah hutan kecil perlu semut latar.
- Puncak tebing bagian timur di pesisir yang belum bisa dicapai.
