# Desa Lembah Lumut — Interactive 3D World (100×100)

Visualisasi 3D miniatur pemukiman lembah procedural berskala 100×100 unit bergaya low-poly cozy dengan pencahayaan siang/malam dinamis, Dual Camera System (Orthographic God View 🦅 ⇄ Perspective First Person View 🚶‍♂️), AI Penduduk Desa Hidup (Living NPCs), arsitektur Apple Glassmorphism HUD, dan performa tinggi (60 FPS).

## Fitur Utama

1. **Dual Camera System (God View 🦅 ⇄ FPV Walk 🚶‍♂️)**:
   - **Mode God View**: Orthographic Camera untuk pemandangan diorama isometrik bird-eye view dengan 6 preset navigasi landmark sinematik.
   - **Mode FPV Walk**: Perspective Camera (FOV 75°) dengan `PointerLockControls`, crosshair Apple minimalis, dan pandangan mata manusia (tinggi 1.65m).
   - **Kontrol FPV Responsif**: `W A S D` untuk gerak, `Shift` untuk sprint lari cepat, `Space` untuk lompat, dan mouse look untuk melihat sekeliling.
   - **Fisika & Ground Clamping**: Karakter menaiki tangga bukit, melintasi jembatan batu & kayu, serta meluncur halus jika berbenturan dengan dinding bangunan.
   - **Shortcut Cepat**: Tekan tombol `V` pada keyboard atau klik switcher di Top Bar untuk beralih mode kamera secara instan.

2. **Penduduk Desa Hidup (Living NPCs AI)**:
   - **Model 3D Karakter Low-Poly Unik**: Karakter beranimasi ayunan tangan & kaki dengan variasi pakaian, topi jerami, tudung tabib, topi koki, dan lentera malam.
   - **Perilaku Layaknya Manusia**:
     - **Jalan-jalan & Berkeliling**: Mengikuti rute jalan setapak dan jembatan antar distrik desa.
     - **Mengobrol & Bersosialisasi**: Saat 2 warga berpapasan, keduanya berhenti, saling berhadapan, melambaikan tangan, dan memunculkan balon ucapan percakapan kontekstual di atas kepala.
     - **Masuk & Keluar Rumah/Gedung**: Warga berjalan ke pintu rumah atau kedai kopi, melangkah masuk ke dalam interior untuk istirahat (jendela bersinar hangat), lalu keluar kembali untuk melanjutkan rutinitas desa.
     - **Aktivitas Spesifik**: Berbelanja di kios buah/roti pasar, duduk santai di teras kedai kopi atau bangku alun-alun, dan menikmati pemandangan di dermaga kincir air.
     - **Interaksi dengan Pemain (FPV)**: Saat pemain mendekati warga, warga menoleh menatap pemain, melambaikan tangan, dan menyapa ramah.
     - **Siklus Malam**: Sebagian besar warga pulang ke rumah untuk tidur, sementara penjaga ronda malam membawa lentera kecil berpendar hangat yang menerangi jalanan desa.
   - **Pengaturan Jumlah NPC di Settings**: Pilihan densitas penduduk desa (Sepi 6, Normal 12, Ramai 20, Pesta Lembah 30) yang dapat diubah secara langsung dan sinkron dengan widget HUD Populasi Warga.

3. **Skala Dunia 100×100 Unit & 6 Distrik**:
   - **Distrik 1 - Pasar Alun-Alun Lembah**: Air mancur pusat batu berlampu, 4 kios berkanopi warna-warni (buah, rempah/bunga, roti, tenun), peti & labu.
   - **Distrik 2 - Kedai Kopi & Teh Lembah**: Warung bertingkat kayu-batu dengan cerobong asap berpartikel, teras luar menghadap sungai dengan meja & bangku santai.
   - **Distrik 3 - Kincir Air & Dermaga Sungai**: Kincir air mekanikal 8 bilah berputar, dermaga kayu, perahu dayung bersandar.
   - **Distrik 4 - Bukit Kincir Angin & Ladang Gandum**: Kincir angin heksagonal berbilah kisi berputar di bukit (+4.2m), hamparan ladang gandum emas, dan gulungan jerami.
   - **Distrik 5 - Pemukiman Warga Lembah**: 6 rumah warga berarsitektur unik (Rumah Pak Lurah, Tabib, Pandai Kayu, Pemburu, Penenun, Menara Jaga) dengan variasi atap dan jendela glow.
   - **Distrik 6 - Kebun & Pertanian Sayur**: Bedengan tanah gembur bercocok tanam kubis dan labu oranye, serta gubuk perkakas.
   - **Sungai Alami & Jembatan Ganda**: Jembatan Lengkung Batu Alun-Alun dan Jembatan Kayu Hilir yang melintasi sungai diagonal beriak air transparan.

4. **Vegetasi Rimbun Instanced 60 FPS (600+ Elemen)**:
   - 220 pohon pinus cemara.
   - 140 pohon ek rindang (broadleaf oak).
   - 160 semak belukar & rumpun perdu.
   - 90 bongkahan batu lumut sungai.
   - Seluruh vegetasi dirender via GPU Instancing (1 draw-call per kategori objek).

5. **Apple Design & UI/UX Pro Max**:
   - Top Bar Dynamic Island dengan Vibrancy Glassmorphism (`backdrop-filter: blur(20px)`).
   - Apple Segmented Control untuk toggle God View 🦅 vs FPV Walk 🚶‍♂️.
   - Modal Sheet Pengaturan Grafis & Performa (Kualitas Bayangan, Kerapatan Vegetasi, Partikel, Kabut, Animasi Air, Jumlah NPC, Toggle Balon Obrolan).
   - Widget Status Desa (jam desa real-time, counter FPS asli, jumlah populasi warga hidup).
   - 6 Tombol Navigasi Landmark Sinematik.
   - 3D Raycasting Hover Tooltip untuk identifikasi bangunan dan penduduk desa.

## Struktur Berkas
- `index.html`: Canvas WebGL, HUD controls, status banner, Apple modal settings, FPV crosshair & guide HUD, importmap Three.js.
- `style.css`: Apple Human Interface Guidelines tokens, dynamic glassmorphism, FPV HUD reticle, responsive rules.
- `main.js`: Core Three.js WebGL engine, Dual Camera controller, living NPC AI behavior engine, ground elevation math, instanced foliage, raycasting, camera lerp transitions.
- `package.json`: Metadata proyek & script runner.

## Cara Menjalankan
Buka berkas `index.html` langsung di peramban web modern atau gunakan server lokal:
```bash
npx serve /naya-shared-folder/isometric-village
```
