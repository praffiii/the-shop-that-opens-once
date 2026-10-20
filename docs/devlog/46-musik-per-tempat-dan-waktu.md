# 46. Musik mengikuti tempat dan waktu

**Tanggal:** 2026-10-20

## Tujuan

Pemain bertanya kenapa musik latar terdengar sama dari awal sampai sekarang. Ternyata memang sama:

- Setiap tempat memakai suasana bawaan `dusk`. Hanya toko Marlow yang menggantinya.
- Tema senja, toko, kenangan, dan selesai dibangun di atas 16 birama A minor yang sama. Bedanya hanya filter dan
  kepadatan, jadi semuanya terdengar seperti satu lagu.
- Tema tebing (*The Cliff of Lingering Waves*) dan tema rumah (*Mother's Loom and Memories*) sudah dibuat dan
  diekspor, tetapi tidak pernah diputar.

Padahal bagian musik GDD meminta musik berganti antara zona dan waktu.

## Yang dikerjakan

### Dua tema baru (`ArtSource/audio.js`)

Ini dua dari enam lagu GDD yang belum pernah dibuat. Keduanya disintesis dengan cara yang sama seperti tema lain: 69
bpm, 3/4, 16 birama per putaran.

- **Quiet Station at Dawn**, untuk pagi: celesta di atas akor piano yang digulung dalam G mayor, jarang-jarang seperti
  cahaya pertama.
- **Bellwood Marketplace**, untuk siang: gitar nilon memetik akor di bawah melodi gitar yang terus bergerak.

### Pemilihan musik (`PlaceDef.Music`)

- Tempat dengan tema sendiri:
  - toko Marlow memutar *The Shop at Midnight*;
  - tebing memutar *The Cliff of Lingering Waves*;
  - rumah Satria memutar *Mother's Loom and Memories*.
- Tempat lain mengikuti waktu:
  - pagi memutar tema fajar;
  - siang memutar tema pasar;
  - senja dan malam memutar tema senja.
- Saat waktu bergeser, musik ikut berganti dengan cross-fade.
- Musik kenangan, lentera padam, dan *Uncut Letter* untuk epilog tidak berubah.

## Validasi

- Di editor, musik yang dipilih dicek untuk tiap tempat dan waktu:

  | Tempat | Waktu | Musik |
  | --- | --- | --- |
  | Alun-alun | Pagi | `dawn` |
  | Alun-alun | Siang | `market` |
  | Alun-alun | Senja | `dusk` |
  | Stasiun | Malam | `dusk` |
  | Tebing | Pagi | `coast` |
  | Rumah Satria | Pagi | `loom` |
  | Toko | Malam | `shop` |

- Kedua lagu baru diukur kerasnya. Rata-ratanya -39 dan -40 dB, setara dengan lagu lain (-38 dB), jadi tidak ada yang
  terlalu pelan atau pecah.
- Semua tes PlayMode lulus.
