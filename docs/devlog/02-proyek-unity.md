# 02. Proyek Unity 6.6 dan alat kerja

**Tanggal:** 2026-10-18

## Tujuan

Menyiapkan proyek Unity yang bersih di `game/`, hanya dengan paket yang benar-benar dipakai, serta alat bantu kerjanya.

## Yang dikerjakan

- **Proyek Unity 6.6** dibuat dari template *Universal 2D* (URP dengan 2D Renderer), lalu dirampingkan.
  - Paket yang dipakai: 2D Sprite, Input System, uGUI, Test Framework, URP, dan Newtonsoft JSON (untuk membaca data
    art hasil ekspor).
  - Paket yang dibuang karena tidak dibutuhkan: 2D Animation, Aseprite, PSD Importer, SpriteShape, Tilemap, Timeline,
    Visual Scripting, dan beberapa lainnya.
  - Nama perusahaan "SE.3 Kelompok 1", nama produk "The Shop That Opens Once", versi 0.1.0.
- **Satu scene saja**, `Assets/Scenes/Main.unity`. Isinya satu objek dengan komponen `Main`, yang membangun
  kamera, UI, dan tempat-tempat lewat kode.
- **Unity MCP.** Dipasang server MCP gratis dari komunitas, CoplayDev/unity-mcp v10.3.0, sebagai paket di proyek dan
  di `.mcp.json`. Dengan MCP, asisten coding bisa membaca console, menjalankan Play Mode, dan mengambil tangkapan layar
  langsung dari Unity Editor.
- **`.gitignore`** untuk folder Unity yang dibuat ulang otomatis (`Library/`, `Temp/`, `Logs/`, `UserSettings/`,
  dan lainnya).

## Keputusan

| Keputusan | Alasan |
|---|---|
| Proyek di `game/`, menggantikan proyek Godot di posisi yang sama | Struktur repo tetap sama seperti sebelumnya |
| Game dibangun lewat kode dari satu scene, seperti di Godot | Scene Unity berupa YAML yang sulit dibaca di git. Kode lebih mudah ditinjau, dites, dan dilacak perubahannya. |
| MCP komunitas (CoplayDev), bukan MCP resmi Unity | MCP resmi membutuhkan langganan Unity AI. Versi komunitas gratis dan open source. |
| Versi MCP dikunci di v10.3.0 | Supaya build tidak berubah sendiri saat ada rilis baru |

## Masalah dan solusinya

- **Unity hanya bisa membuka satu proyek di satu editor.** Kompilasi dan tes dijalankan lewat command line
  (`-batchmode`) selama editor tidak sedang membuka proyek ini.

## Cara dicek

- Unity membuka proyek dan menyelesaikan semua paket tanpa error.
- `git status` bersih setelah Unity membuka proyek, karena folder buatan Unity sudah diabaikan.

## Commit

- `517e516` feat(game): set up the Unity 6.6 project in game/
- `81e60f1` build(game): add the Unity MCP, Newtonsoft JSON and the main scene

## Langkah berikutnya

Pipeline art dan fondasi sistem game ([entri 03](03-fondasi.md)).
