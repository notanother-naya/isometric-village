# Desa Lembah Lumut — Interactive 3D World (100×100)

Visualisasi 3D miniatur pemukiman lembah procedural berskala 100×100 unit bergaya low-poly cozy dengan pencahayaan siang/malam dinamis, Orthographic Camera God View, arsitektur Apple Glassmorphism HUD, dan kesiapan mode FPV (First Person View).

## Fitur Utama

1. **Skala Dunia 100×100 Unit**:
   - Terrain organik beralur dengan elevasi perbukitan, lembah hijau, dan dataran pemukiman.
   - Sungai berkelok natural dari barat laut ke tenggara dengan air transparan dinamis dan tepian berpasir.
   - Jembatan ganda: Jembatan Lengkung Batu Alun-Alun dan Jembatan Kayu Hilir.

2. **6 Distrik Lengkap & Realistis**:
   - **Distrik 1 - Pasar Alun-Alun Lembah**: Air mancur pusat batu berlampu, 4 kios berkanopi warna-warni (buah, rempah/bunga, roti, kerajinan), peti, tong apel dan labu.
   - **Distrik 2 - Kedai Kopi & Teh Lembah**: Warung bertingkat kayu-batu dengan cerobong berasap, teras luar menghadap sungai dengan meja & bangku santai, serta papan nama kayu.
   - **Distrik 3 - Kincir Air & Dermaga Sungai**: Kincir air berputar animasi 8 bilah, dermaga kayu menjorok ke sungai, perahu dayung bersandar.
   - **Distrik 4 - Bukit Kincir Angin & Ladang Gandum**: Kincir angin heksagonal dengan bilah berputar di bukit (+4.2m), hamparan ladang gandum emas, dan gulungan jerami silinder.
   - **Distrik 5 - Pemukiman Warga Lembah**: 6+ rumah warga berarsitektur unik (Rumah Pak Lurah, Rumah Tabib, Pandai Kayu, Pemburu, Penenun Sutra, Menara Jaga) dengan variasi atap (gable, hipped, cone), jendela glow hangat, dan cerobong asap berpartikel.
   - **Distrik 6 - Kebun & Pertanian Sayur**: Bedengan tanah gembur bercocok tanam kubis dan labu, serta gubuk perkakas pertanian.

3. **Vegetasi Masif 60 FPS (InstancedMesh)**:
   - 220 pohon pinus cemara.
   - 140 pohon ek rindang (broadleaf oak).
   - 160 semak belukar & rumpun perdu.
   - 90 bongkahan batu lumut sungai.
   - Semua dirender via GPU Instancing dalam single draw-call per jenis objek.

4. **Apple Design & UI/UX Pro Max**:
   - Top Bar bergaya Dynamic Island / Pill dengan Vibrancy Glassmorphism (`backdrop-filter: blur(20px)`).
   - Apple Segmented Control untuk toggle God View 🦅 vs FPV Walk 🚶‍♂️ (dengan toast notification ramah).
   - Modal Sheet Pengaturan Grafis & Performa (Kualitas Bayangan, Kerapatan Vegetasi, Partikel, Kabut, Animasi Air).
   - Widget Status Desa (jam desa real-time, FPS counter hidup, indikator siang/malam).
   - 6 Tombol Navigasi Landmark Sinematik (Panorama, Pasar, Kedai, Kincir Air, Kincir Angin, Pemukiman).
   - 3D Raycasting Hover Tooltip pada setiap bangunan dan landmark penting.

## Struktur Berkas
- `index.html`: Canvas WebGL, HUD controls, status banner, Apple modal settings, FPV notification toast, importmap Three.js.
- `style.css`: Apple Human Interface Guidelines tokens, dynamic glassmorphism, responsive rules.
- `main.js`: Core Three.js WebGL engine, 100×100 procedural world generation, lighting cycle, instanced foliage, raycasting, camera lerp transitions.
- `package.json`: Metadata proyek & script runner.

## Cara Menjalankan
Buka berkas `index.html` langsung di peramban web modern atau gunakan server lokal:
```bash
npx serve /naya-shared-folder/isometric-village
```
