# PRD — Jaga Offline, Layanan Online, dan Apresiasi Agen Pojok Statistik UI

Versi: 1.3, draf untuk tinjauan produk · 24 Oktober 2026 (WIB)

## 1. Ringkasan keputusan

Pertahankan bahasa visual workspace baru, login satu admin, direktori berfoto, dan kalender editorial. Lengkapi kembali alur jaga yang belum terbawa: jadwal mingguan per hari/sesi, pemindahan penugasan dengan geser, jam operasional dinamis, kehadiran sukarela, analitik kontribusi, denda, dan ekspor.

**Model operasional inti:** admin mengatur siapa bertugas pada hari dan sesi tertentu dalam satu minggu. Absensi pada tanggal aktual mengambil penugasan yang berlaku untuk minggu tersebut. Agen yang datang membantu di luar penugasannya dicatat sebagai sukarelawan dan memperoleh apresiasi tersendiri.

**Keputusan pengguna:** susunan agen tetap berulang setiap minggu dan diubah hanya bila diperlukan. Admin menyusun pola satu kali, bukan membuat roster baru atau menekan publikasi setiap pergantian minggu.

Jadwal mingguan menjadi cara utama mengatur penugasan. Tanggal tetap digunakan untuk bukti kehadiran, pengecualian hari libur, dan riwayat; admin tidak perlu memasukkan ulang setiap tanggal satu per satu.

Dokumen ini merumuskan kebutuhan dan kriteria penerimaan, bukan laporan bahwa seluruh fitur sudah tersedia. Revisi 1.2 disertai perbaikan terbatas pada pilihan divisi, pengecualian/persistensi sukarelawan, dan pemisahan durasi sukarela dari sesi reguler. Roster online dan tab klien OA LINE masih spesifikasi untuk implementasi berikutnya; database produksi tidak diubah dalam revisi ini.

**Perluasan yang dikonfirmasi:** jadwal online berulang untuk Instagram dan OA LINE hanya bagi Divisi Pelayanan dan Konsultasi; petugas IG melaksanakan publikasi kalender; PJ klien OA menetap setelah hari kontak pertama. Offline tetap berlaku untuk semua divisi. Sukarelawan hanya menambah durasi apresiasi dan tidak pernah dikenai denda pada sesi bantuannya.

### Catatan versi kode yang ditinjau

Tinjauan awal memakai baseline `fbdcb35`. Saat penyusunan PRD, GitHub sudah memiliki commit baru `e1ed911` yang memulihkan fitur operasional. Checkout diselaraskan tanpa mengubah implementasi tersebut. Karena itu, daftar kesenjangan awal di bawah adalah latar belakang; tabel status terbaru membedakan fitur yang sudah ada dalam kode dari aturan produk yang masih perlu dipenuhi. Keberadaan kode tidak membuktikan migrasi sudah diterapkan atau alur telah berjalan pada produksi.

### Dasar kebutuhan dan status keputusan

- **Dinyatakan pengguna:** UI baru dipertahankan; hanya admin login; agen adalah data anggota; jadwal mingguan hari/sesi; dua sesi per hari; penugasan bisa digeser; bantuan sukarela dicatat; frekuensi dan durasi kontribusi ditampilkan; fitur workspace baru tetap ada.
- **Referensi:** lampiran `implementation_plan.md`, kode legacy `js/app.js` dan `index.html`, serta implementasi workspace baru dan skema `ps_*`.
- **Usulan dalam PRD:** versi jadwal per minggu, pemisahan pengganti vs sukarelawan, pembatasan estimasi durasi, kategori apresiasi, dan koreksi denda tanpa menghilangkan jejak pembayaran.
- **Dikonfirmasi pengguna:** pola jadwal tetap berulang setiap minggu, dengan perubahan seperlunya; toleransi dan tarif denda dapat diatur bertingkat; tidak hadir tanpa izin memiliki tarif tersendiri; izin yang dicatat admin selalu bebas denda.
- **Belum ditetapkan organisasi:** pengecualian denda PJ; cara utama mencatat jam pulang; syarat penghargaan tunggal. Default usulan dijelaskan di bagian 13 dan tidak boleh dianggap keputusan pengguna.

## 2. Tujuan dan batas cakupan

### Tujuan

1. Admin cukup mengatur satu pola hari × sesi yang berlaku berulang, tanpa input tanggal atau penyiapan ulang setiap minggu.
2. Perubahan penugasan mudah dilakukan tanpa mengubah fakta kehadiran yang sudah tercatat.
3. Agen yang membantu secara sukarela mendapat kredit yang terlihat dan dapat dijelaskan.
4. Pengurus dapat membedakan kepatuhan jadwal, jumlah kontribusi, dan lamanya kontribusi.
5. Data jadwal, absensi, aturan, denda, dan dashboard konsisten.
6. Direktori berfoto dan pengelolaan konten tetap terintegrasi dalam UI baru.

### Bukan cakupan rilis ini

Akun per agen, absensi mandiri, GPS/biometrik, publikasi Instagram otomatis, alokasi jadwal otomatis oleh AI, sistem akuntansi kas umum, dan pemindaian QR. Penentuan rotasi otomatis A/B atau beberapa siklus minggu dapat ditambahkan setelah pola organisasi dipastikan.

### Pengguna

Satu akun admin dapat digunakan untuk mengelola seluruh anggota. Agen tidak memiliki kredensial. Keanggotaan, divisi, jabatan organisasi, dan peran PJ sesi adalah data berbeda. Jabatan tidak ditentukan dengan pencocokan nama dalam kode. Penggunaan satu akun berarti audit mengidentifikasi akun admin, bukan membuktikan individu pengurus yang sedang menggunakan akun tersebut.

## 3. Kesenjangan dan kritik terhadap rancangan sebelumnya

| Area                | Temuan                                                                                                       | Perbaikan produk                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Jadwal baru         | `ps_shifts` berfokus pada penugasan bertanggal                                                               | Tambahkan pola mingguan dan jadwal yang berlaku untuk minggu tertentu                                 |
| Pergantian minggu   | Lampiran hanya memiliki hari/sesi tanpa versi atau minggu berlaku                                            | Tambahkan minggu efektif, salin minggu sebelumnya, dan perlindungan riwayat                           |
| Geser penugasan     | SortableJS dimuat di legacy, tetapi inisialisasi drag aktif tidak ditemukan pada checkout yang diperiksa     | Jadikan geser kebutuhan eksplisit; jangan menganggap dependensi terpasang berarti fitur sudah bekerja |
| Jam operasional     | Workspace menampilkan label jam tetap                                                                        | Konfigurasi per hari/sesi dan pengecualian tanggal                                                    |
| Sukarelawan         | Legacy menggunakan parameter ekstra saat pencatatan, tetapi insert absensinya tidak menyimpan penanda ekstra | Simpan jenis kontribusi secara permanen; jangan menebaknya ulang dari jadwal terkini                  |
| Penghargaan bulanan | Label bulanan pada legacy tidak disertai filter bulan pada pengambilan data                                  | Terapkan periode yang sama pada seluruh perhitungan penghargaan                                       |
| Durasi              | Legacy menghitung selisih jam hadir sampai akhir sesi                                                        | Bedakan estimasi dengan durasi berdasarkan jam pulang; batasi durasi pada jendela sesi                |
| Peringkat           | Jumlah hadir dipengaruhi banyaknya penugasan                                                                 | Pisahkan frekuensi kontribusi, rasio kehadiran reguler, dan bantuan sukarela                          |
| Denda               | Pembatalan legacy dapat menghapus berdasarkan nama dan tanggal                                               | Hubungkan denda ke kehadiran/sesi yang tepat; jangan menghapus pembayaran sesi lain                   |
| Hadirkan semua      | Legacy memicu klik tombol berulang dengan jeda                                                               | Gunakan operasi server berbasis data dan hasil yang dapat diverifikasi                                |

Lampiran sudah tepat tentang lima kelompok fitur yang hilang. Namun, klaim durasi “presisi”, pemberian satu sesi penuh tanpa batas waktu, penghapusan denda otomatis, dan penetapan pemenang tunggal memerlukan koreksi agar statistik dan kas tidak menyesatkan.

### Status implementasi terbaru — commit `e1ed911`

| Area            | Sudah terlihat di kode                                                      | Kritik / kebutuhan lanjutan                                                                                                             |
| --------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Jadwal mingguan | `ps_weekly_schedule`, papan hari/sesi, drag native dan tombol Pindah        | Belum ada versi efektif, batas periode, atau pengecualian mingguan yang menjaga sejarah                                                 |
| Jam operasional | `ps_settings`, jam mulai/selesai dan aktif per sesi                         | `getSessionConfig` membaca pengaturan aktif untuk tanggal lama juga; perlu snapshot                                                     |
| Ekstra          | Penanda `is_extra`, tambah sukarelawan, statistik ekstra                    | Perlu membedakan pengganti, melindungi klasifikasi saat koreksi, dan memvalidasi kontribusi di luar jam                                 |
| Durasi          | `calcShiftDuration` menghitung akhir sesi dikurangi jam datang              | Belum memakai jam pulang; kedatangan sebelum sesi menambah menit; wajib label estimasi dan pembatasan jendela sesi                      |
| Dashboard       | Peringkat, grafik frekuensi/durasi, filter bulan berjalan/semua, sertifikat | Perlu filter bulan historis/rentang, rasio kewajiban, kategori sukarela, dan dasar penghargaan yang jelas                               |
| Denda           | `calcShiftFine` serta boolean `fine_paid`                                   | Nominal dihitung ulang dari aturan aktif; pembayaran belum menjadi catatan nominal/waktu yang terpisah                                  |
| Aksi massal     | `Hadirkan semua`, `updateMany`                                              | Pengisian otomatis memakai jam awal sesi dan penulisan berurutan; rawan menghilangkan keterlambatan serta menyimpan sebagian saat gagal |
| Impor profil    | Pemetaan jabatan legacy kembali mencocokkan nama di repository              | Jabatan perlu ditinjau dan disimpan sebagai data, bukan ditebak dari substring nama                                                     |
| Migrasi         | Ada migrasi operasional tambahan `202610230002`                             | Perlu inventarisasi kondisi database aktual sebelum rilis/migrasi lanjutan; jangan mengedit migrasi lama yang sudah diterapkan          |

Kesimpulan tinjauan: banyak fitur dasar sudah dipulihkan pada kode terbaru. Fokus PRD adalah memastikan kesesuaian dengan pola berulang yang dipakai organisasi, keakuratan statistik, perlindungan riwayat, dan pengujian alur nyata. Jangan menulis ulang fitur yang sudah memenuhi kebutuhan; lakukan analisis selisih terhadap kriteria penerimaan.

## 4. Istilah dan aturan dasar

| Istilah            | Definisi                                                                               |
| ------------------ | -------------------------------------------------------------------------------------- |
| Periode organisasi | Kepengurusan/semester yang menjadi konteks jadwal dan laporan                          |
| Pola mingguan      | Susunan hari aktif dan dua sesi yang dapat digunakan berulang                          |
| Minggu jaga        | Rentang Senin–Minggu yang ditampilkan dengan tanggal awal–akhir                        |
| Jadwal berlaku     | Versi susunan agen untuk minggu tertentu, termasuk perubahan yang sudah dipublikasikan |
| Sesi aktual        | Kejadian satu sesi pada satu tanggal, dengan jam dan aturan yang dibekukan             |
| Reguler            | Agen yang mendapat kewajiban pada sesi aktual tersebut                                 |
| Sukarelawan/ekstra | Agen tanpa kewajiban pada sesi itu yang datang membantu                                |
| Pengganti          | Agen yang secara eksplisit mengambil alih penugasan agen lain                          |
| Belum dicatat      | Belum ada keputusan kehadiran, bukan otomatis tidak hadir                              |
| Estimasi menit     | Perkiraan kontribusi sampai akhir sesi tanpa bukti jam pulang                          |

Default hari adalah Senin–Jumat, masing-masing Pagi dan Siang. Setiap hari/sesi dapat diliburkan. Semua waktu operasional menggunakan Asia/Jakarta; waktu pencatatan sistem dan pelaku disimpan terpisah dari waktu kejadian yang diinput admin.

Sukarelawan ditentukan per sesi: agen reguler pada Senin pagi tetap dapat menjadi sukarelawan Senin siang. Satu agen tidak boleh dihitung dua kali pada sesi aktual yang sama.

## 5. Kebutuhan fitur

### F-01. Jadwal mingguan dan rotasi

**Tampilan:** pemilih minggu, periode aktif, papan lima hari × dua sesi, waktu sesi, agen berfoto/inisial, label PJ, dan jumlah penugasan. Tersedia daftar agen untuk menambahkan penugasan.

**Kemampuan wajib:**

- Pola aktif otomatis berulang pada minggu berikutnya selama periode dan masa berlakunya belum berakhir. Tidak perlu menyalin atau mempublikasikan ulang setiap minggu.
- Menyalin pola tersedia saat menyiapkan periode baru atau variasi, bukan kewajiban operasional mingguan.
- Memilih minggu sebelumnya/berikutnya dan melihat tanggal aktual di judul kolom hari.
- Memindahkan agen antarhari/sesi dengan drag-and-drop; mengurutkan kartu dalam sesi.
- Membedakan aksi **pindah** dengan **tambahkan penugasan lain**. Menyalin kartu tidak boleh terjadi tanpa tindakan eksplisit.
- Alternatif tombol “Pindahkan ke…” untuk keyboard, pembaca layar, dan perangkat sentuh.
- Menambah, menghapus, dan mengubah peran PJ tanpa mengganti jabatan organisasi agen.
- Mendeteksi agen ganda dalam slot yang sama, sesi nonaktif, dan bentrok jam pada tanggal yang sama. Tidak melarang agen berjaga dua sesi yang tidak bertabrakan.
- Menampilkan ringkasan jumlah penugasan per agen untuk membantu pemerataan; tidak merotasi agen atau mengubah pembagian secara otomatis.
- Memisahkan perubahan draf dari jadwal yang sudah berlaku. Admin meninjau daftar perubahan lalu mempublikasikan.
- Saat mempublikasikan, memilih **minggu ini saja** atau **jadikan pola mulai minggu ini**. Tidak mengubah minggu yang sudah dikunci.
- Gagal menyimpan atau konflik versi tidak boleh terlihat sebagai perpindahan yang berhasil.

**Pola utama yang disepakati:** susunan yang telah dipublikasikan otomatis berlaku berulang. Bila ada perubahan, admin memilih pengecualian untuk minggu/tanggal tertentu atau versi pola baru mulai minggu tertentu. Perubahan tetap bukan rotasi otomatis; bila pengecualian berakhir, sistem kembali memakai pola yang berlaku. Jadwal berulang juga mempunyai periode/tanggal akhir agar tidak menciptakan kewajiban tanpa batas setelah kepengurusan selesai.

**Contoh:** admin membuka minggu 26–30 Oktober, memindahkan Agen A dari Senin pagi ke Selasa siang untuk minggu itu. Jadwal minggu sebelumnya dan absensi Agen A pada minggu sebelumnya tidak berubah.

### F-02. Jam operasional dan pengecualian

- Aktif/libur, mulai, dan selesai dapat diatur per hari dan sesi; Jumat boleh berbeda dari hari lain.
- Mulai harus sebelum selesai. Dua sesi hari yang sama tidak boleh bertumpang tindih. Sesi lintas tengah malam di luar cakupan awal.
- Toleransi keterlambatan dan nominal denda tidak boleh negatif.
- Libur tanggal tertentu dapat menimpa pola hari biasa; alasan dan rentang tanggal terlihat.
- Perubahan jam/aturan memiliki waktu berlaku. Jam sesi yang sudah dipakai dalam absensi tidak berubah diam-diam.
- Hari yang seluruh sesinya libur tidak membentuk kewajiban atau denda.
- Membuka sesi pengecualian pada hari libur memerlukan tindakan admin dengan jam dan alasan yang eksplisit; bukan menambahkan sukarelawan ke sesi yang tertutup.

### F-03. Absensi harian otomatis

Tanggal digunakan pada halaman absensi untuk memilih kejadian aktual. Daftar petugas dimuat otomatis dari jadwal yang berlaku pada minggu dan hari itu, bukan dengan membaca pola terbaru untuk seluruh sejarah.

Setiap baris menampilkan agen, peran, asal penugasan, status, jam hadir/pulang, jenis durasi, dan indikasi denda. Jenis kontribusi dan status kehadiran disimpan terpisah.

**Status:** Belum dicatat, Hadir, Izin, Sakit, Tidak hadir, dan Dibatalkan untuk jejak koreksi. Keterlambatan adalah atribut terhitung, bukan pengganti Hadir.

- Tombol cepat Hadir mengisi jam WIB sekarang untuk hari ini; admin dapat mengoreksi dengan alasan.
- Untuk tanggal lampau, admin wajib memasukkan jam kejadian, bukan memakai jam sekarang secara otomatis.
- “Tidak hadir” ditetapkan admin; melewati jam mulai tidak otomatis membuktikan seseorang bolos.
- Jam pulang dapat dicatat atau dikoreksi oleh admin. Jam pulang sebelum jam hadir ditolak.
- Perubahan setelah sesi ditutup memerlukan alasan dan tercatat pada audit.
- Hadirkan semua berlaku pada sesi yang dipilih, hanya untuk agen reguler berstatus Belum dicatat. Tampilkan pratinjau nama, jumlah, serta jam yang akan digunakan.
- Bulk tidak menimpa Izin/Sakit/Hadir, tidak memasukkan sukarelawan otomatis, dan tidak mengisi jam pulang fiktif.
- Bulk dijalankan sebagai satu operasi atomik/idempoten; tombol ganda tidak menambah kehadiran atau denda ganda.

### F-04. Sukarelawan dan agen pengganti

Tombol **Tambah sukarelawan** memilih agen aktif yang belum tercatat pada sesi tersebut. Admin mengisi sesi, jam datang, opsional jam pulang, dan catatan bantuan.

- Penanda sukarelawan tersimpan permanen, walaupun pola mingguan diubah kemudian.
- Sukarelawan bebas denda keterlambatan maupun ketidakhadiran untuk sesi sukarela itu. Tidak datang membantu bukan pelanggaran.
- Kehadiran sukarela hanya menambahkan durasi bantuan pada dashboard apresiasi. Tidak menambah jumlah sesi reguler, denominator kewajiban, atau kewajiban baru.
- Satu agen pada satu sesi hanya memiliki satu rekaman kontribusi aktif. Reguler yang datang tidak didaftarkan lagi sebagai ekstra.
- Bantuan sukarela tidak menghapus kewajiban reguler atau ketidakhadiran agen lain.
- Jika memang menggantikan petugas, gunakan aksi **Tetapkan pengganti**. Tautkan pengganti dengan penugasan asal dan alasan; keputusan status petugas asal harus eksplisit.
- Saat bantuan dibatalkan karena salah input, kontribusinya tidak lagi dihitung tetapi jejak koreksi tetap tersedia.
- Kedatangan pada/setelah akhir sesi tidak otomatis menghasilkan satu sesi kontribusi bernilai penuh. Tandai di luar jam; kontribusi tambahan memerlukan sesi/jam pengecualian yang disahkan admin.

**Contoh:** Agen B tidak mendapat jadwal Rabu siang, tetapi membantu pukul 14.15–15.00. Ia tampil sebagai Sukarelawan, memperoleh kontribusi 45 menit terverifikasi tanpa menambah sesi reguler, tidak dikenai denda, dan tidak mengubah status petugas reguler Rabu siang.

### F-05. Durasi yang dapat dijelaskan

Jendela sesi adalah jam mulai–selesai yang dibekukan untuk tanggal tersebut. Definisi berikut berlaku untuk kontribusi dalam sesi; kerja di luar jam memiliki pengecualian tersendiri.

```text
akhir_hitung = jam_pulang, jika tercatat; jika tidak, akhir_sesi
menit = max(0, min(akhir_hitung, akhir_sesi) - max(jam_hadir, awal_sesi))
```

| Situasi                                         | Perlakuan                                                                        |
| ----------------------------------------------- | -------------------------------------------------------------------------------- |
| Hadir dan jam pulang valid dicatat admin        | Durasi tercatat/terverifikasi admin                                              |
| Hadir tanpa jam pulang                          | Estimasi sampai akhir sesi; label estimasi wajib                                 |
| Datang lebih awal                               | Tidak memperoleh menit tambahan sebelum awal sesi tanpa persetujuan jam tambahan |
| Datang setelah sesi selesai                     | Nol menit dalam sesi; periksa apakah perlu sesi pengecualian                     |
| Izin/Sakit/Tidak hadir/Belum dicatat/Dibatalkan | Nol menit kontribusi                                                             |

“Terverifikasi” berarti dicatat/dikonfirmasi admin, bukan verifikasi lokasi atau bukti biometrik. Dashboard menampilkan menit terverifikasi dan estimasi secara terpisah; bila digabung, labelnya “termasuk estimasi”. Sesi yang belum selesai tidak dipresentasikan sebagai durasi aktual yang sudah dikerjakan.

Contoh sesi 10.00–12.30: hadir 09.30 tanpa pulang → estimasi 150 menit, bukan 180; hadir 10.30 tanpa pulang → estimasi 120 menit; hadir 10.30 dan pulang 11.30 → 60 menit tercatat.

Riwayat legacy yang tidak memiliki jam pulang tetap diberi label estimasi. Tidak boleh membuat jam pulang palsu saat migrasi. Kunjungan terpisah/keluar-masuk berulang dalam satu sesi belum didukung pada rilis awal; jika dibutuhkan, diperlukan pencatatan interval terpisah.

### F-06. Dashboard, analitik, dan apresiasi

Pertahankan beranda operasional workspace baru: jadwal hari ini, tindak lanjut, dan agenda konten. Tambahkan ringkasan kontribusi serta apresiasi yang ringkas. Grafik lengkap tersedia melalui “Lihat analitik” agar beranda tidak penuh kartu dan grafik yang berulang.

**Filter bersama:** bulan berjalan, bulan lain, rentang tanggal, periode kepengurusan, dan semua periode. Judul penghargaan harus mengikuti filter. Semua perhitungan memakai kehadiran valid dalam rentang WIB yang sama.

| Metrik                  | Definisi                                                                       |
| ----------------------- | ------------------------------------------------------------------------------ |
| Sesi reguler hadir      | Sesi kewajiban dengan status Hadir dan kontribusi dalam jendela sesi           |
| Durasi bantuan sukarela | Menit bantuan valid; tidak menambah sesi reguler atau kewajiban                |
| Total sesi reguler      | Sesi kewajiban hadir yang valid; sukarelawan tidak menambah angka ini          |
| Menit kontribusi        | Durasi menurut F-05, dengan pemisahan estimasi vs terverifikasi                |
| Rasio hadir reguler     | Reguler hadir / kewajiban reguler yang sudah ditutup; denominator ditampilkan  |
| Ketepatan waktu         | Reguler hadir tepat waktu / reguler hadir; sukarelawan tidak masuk denominator |

Izin/sakit yang disetujui dikeluarkan dari denominator kewajiban efektif dalam usulan default, tetapi jumlahnya tetap ditampilkan. Penugasan masa depan dan hari libur tidak masuk denominator. Nilai tanpa kewajiban ditampilkan “—”, bukan 100%. Pilihan kebijakan denominator harus tertulis dan berlaku konsisten.

**Apresiasi yang disarankan:**

1. **Frekuensi jaga reguler:** jumlah sesi kewajiban yang dipenuhi; sukarelawan tidak menambah jumlah sesi.
2. **Kontribusi sukarela:** menit ekstra secara khusus agar inisiatif membantu terlihat; riwayat kunjungan dapat dibuka sebagai detail, bukan bonus sesi reguler.
3. **Konsistensi jaga:** rasio pemenuhan kewajiban, selalu disertai jumlah penugasan; agen 1/1 tidak otomatis dianggap lebih berprestasi daripada 10/10.
4. **Durasi kontribusi:** total menit, dengan status sumber perhitungan terlihat.

Top 5 ringkas berdasarkan durasi dan Top 10 sesi reguler/durasi tetap tersedia. Total durasi menggabungkan menit reguler dan sukarela dengan rincian keduanya; frekuensi sesi hanya menghitung reguler. Grafik dapat diklik untuk melihat sesi penyusunnya. Nilai seri diberi peringkat bersama; jangan membuat pemenang tersembunyi berdasarkan urutan nama atau nilai denda.

**Star Agent of the Month:** kartu apresiasi dapat dipertahankan, tetapi metrik dasarnya tertulis dan memakai bulan yang benar. Rekomendasi awal adalah menampilkan pemenang per kategori, bukan skor gabungan yang belum disepakati. Jika organisasi tetap menginginkan satu pemenang, aturan dan pemutus seri harus diputuskan sebelum fitur itu aktif. Tidak menerbitkan sertifikat dengan klaim durasi aktual dari data estimasi.

**Penegasan pengguna:** sukarelawan bebas denda kapan pun datang pada sesi bantuannya, termasuk jika tidak menghasilkan durasi positif. Validasi rentang waktu hanya menentukan menit apresiasi, tidak pernah menjadi alasan mendenda sukarelawan. Agen yang memang bertugas tidak boleh diklasifikasikan ulang sebagai sukarelawan untuk menghapus kewajiban.

Total sesi dan total menit menjawab pertanyaan berbeda. Tidak menjumlahkan keduanya menjadi skor tanpa bobot yang disepakati. Kontribusi konten juga tidak langsung dicampurkan ke peringkat kehadiran.

### F-07. Denda fleksibel, koreksi, dan pembayaran

**Keputusan pengguna:** admin dapat menetapkan toleransi menit, beberapa tingkat keterlambatan dengan nominal berbeda, dan denda khusus tidak hadir tanpa izin. Status Izin yang dicatat/disahkan admin selalu bebas denda. Angka berikut hanya ilustrasi, bukan aturan final organisasi.

#### F-07A. Pengaturan kebijakan

Panel **Jam Operasional & Aturan → Kebijakan Denda** menyediakan:

- Sakelar aktif/nonaktif denda keterlambatan dan denda ketidakhadiran secara terpisah. Menonaktifkan aturan baru tidak menghapus tagihan lama.
- Toleransi keterlambatan bebas denda dalam menit.
- Pilihan tarif **satu nominal setelah toleransi** atau **bertingkat menurut menit keterlambatan**.
- Tambah/edit/hapus baris tingkatan. Admin tidak dibatasi hanya satu toleransi dan satu nominal.
- Batas menit tiap tingkatan dan nominal rupiah total yang berlaku pada tingkatan tersebut.
- Batas maksimal nominal denda telat, opsional; jika aktif diterapkan setelah penentuan tarif. Tidak otomatis membatasi denda ketidakhadiran yang mempunyai pengaturan sendiri.
- Nominal khusus **Tidak hadir tanpa izin**, terpisah dari tarif telat.
- PJ offline tetap dikenai denda bolos (status Tidak hadir); pengecualian keterlambatan PJ dipertahankan. Sukarelawan, izin, dan sakit yang disahkan tetap bebas denda.
- Nama kebijakan, periode, tanggal mulai berlaku, dan cakupan hari/sesi.
- Pratinjau/simulator sebelum publikasi: pilih sesi, jam datang, status, dan peran untuk melihat nominal serta alasan perhitungannya.

Admin bisa memakai satu kebijakan untuk seluruh hari/sesi atau menetapkan kebijakan khusus pada slot tertentu. Contoh: Jumat pagi mempunyai toleransi berbeda, sedangkan sesi lain mengikuti kebijakan umum. Kebijakan khusus merupakan satu set aturan utuh, bukan campuran beberapa nominal yang dijumlahkan tanpa kejelasan.

**Urutan penerapan:** periksa kewajiban dan status bebas denda terlebih dahulu; kemudian pilih kebijakan sesi pada tanggal pengecualian, kebijakan hari+sesi, kebijakan hari, atau kebijakan umum periode, dari yang paling spesifik. Pada tingkat yang sama tidak boleh ada dua kebijakan aktif dengan rentang waktu bertabrakan.

#### F-07B. Tarif bertingkat dan batas waktu yang jelas

Contoh kebijakan, sesi mulai 10.00 WIB dan toleransi 15 menit:

| Keterlambatan sejak awal sesi                      | Waktu hadir contoh                           | Total denda telat                  |
| -------------------------------------------------- | -------------------------------------------- | ---------------------------------- |
| 0–15 menit                                         | Sampai 10.15                                 | Rp0                                |
| Lebih dari 15 sampai 30 menit                      | 10.16–10.30                                  | Rp5.000                            |
| Lebih dari 30 sampai 60 menit                      | 10.31–11.00                                  | Rp10.000                           |
| Lebih dari 60 menit                                | Setelah 11.00, selama sesi masih berlangsung | Rp15.000                           |
| Tidak hadir tanpa izin, setelah dikonfirmasi admin | Tidak ada kehadiran yang sah                 | Contoh Rp20.000, diatur tersendiri |

- Ukuran menit dihitung sejak **jam mulai sesi**, bukan sejak akhir toleransi. Label input dan simulator wajib menjelaskan dasar ini.
- Tepat pada batas toleransi bebas denda. Tepat pada batas atas suatu tingkatan masih memakai tarif tingkatan tersebut.
- Nominal yang dipilih adalah **total pada satu tingkatan**, bukan akumulasi semua tingkatan sebelumnya. Datang 10.40 pada contoh di atas menghasilkan Rp10.000, bukan Rp15.000.
- Batas harus berurutan, tidak boleh tumpang tindih atau mempunyai celah setelah toleransi. Tingkatan terakhir mencakup sisa keterlambatan dalam sesi.
- Nilai toleransi/batas menit dan rupiah tidak boleh negatif. Toleransi yang menutupi seluruh sesi perlu peringatan dan konfirmasi karena tidak akan menghasilkan denda telat dalam sesi itu.
- Mengubah toleransi menampilkan kembali rentang seluruh tingkatan untuk ditinjau. Jika batas lama menjadi tidak valid, publikasi ditolak sampai admin memperbaikinya; jangan diam-diam mengubah seluruh nominal atau batas lainnya.
- Rilis awal menggunakan ketelitian menit sesuai input jam hadir. Jangan membulatkan diam-diam antarperangkat. Jika detik kemudian didukung, definisi pembulatan harus ditentukan sebelum aktivasi.
- Datang setelah sesi selesai tidak otomatis dihitung sebagai hadir penuh atau dijumlahkan dengan denda bolos. Kejadian di luar sesi harus ditinjau admin untuk menetapkan status akhirnya sesuai F-04.

**Kritik kebijakan:** bila tarif telat paling tinggi lebih besar daripada denda tidak hadir, sistem menampilkan peringatan karena berpotensi memberi insentif untuk tidak datang. Admin tetap menentukan kebijakan, tetapi konsekuensi tersebut harus terlihat sebelum disimpan.

#### F-07C. Izin, ketidakhadiran, dan pengecualian

| Kondisi                                                   | Perlakuan                                               |
| --------------------------------------------------------- | ------------------------------------------------------- |
| Hadir reguler dalam toleransi                             | Bebas denda                                             |
| Hadir reguler melewati toleransi                          | Pilih satu tarif keterlambatan yang berlaku             |
| Izin yang dicatat/disahkan admin                          | Selalu Rp0, tidak dapat ditimpa aturan telat/bolos      |
| Sakit yang disahkan sebagai izin                          | Rp0                                                     |
| Sukarelawan/ekstra                                        | Rp0; tidak datang sukarela bukan pelanggaran            |
| PJ                                                        | Ikuti pengecualian PJ yang terlihat pada kebijakan sesi |
| Belum dicatat                                             | Tidak otomatis menjadi bolos atau mendapat tagihan      |
| Tidak hadir tanpa izin yang dikonfirmasi admin            | Tarif ketidakhadiran dari kebijakan sesi                |
| Sesi libur/dibatalkan atau agen tidak mempunyai kewajiban | Tidak membentuk denda reguler                           |

Tidak ada pendaftaran izin mandiri oleh agen: admin tetap menjadi satu-satunya pengguna. Catatan izin dapat mencakup alasan dan waktu pemberitahuan. Jika status yang semula Tidak hadir dikoreksi menjadi Izin yang sah, kewajiban dendanya dibatalkan sesuai alur koreksi, bukan tetap ditagihkan karena waktu pemberitahuannya. Catatan tambahan tidak boleh menjadi aturan tersembunyi untuk mendenda Izin.

Satu kejadian tidak menerima denda telat dan denda tidak hadir sekaligus. Agen pengganti mengikuti kewajiban pengganti yang disahkan; kehadirannya tidak otomatis menghapus pelanggaran agen asal. Pengurangan/pembebasan khusus oleh admin memerlukan alasan dan audit, dengan nominal awal dan nominal akhir tetap dapat ditelusuri.

#### F-07D. Perhitungan, riwayat, dan koreksi pembayaran

- Perhitungan final dilakukan di server dari jam sesi, jenis kewajiban, status, jam hadir, dan versi kebijakan yang dibekukan untuk kejadian itu.
- Simpan ID/versi kebijakan, tingkatan terpilih, menit terlambat, nominal dasar, pengecualian/penyesuaian, serta nominal akhir. Rincian alasan tersedia pada baris denda.
- Denda merujuk ID kehadiran/sesi dan agen, bukan nama+tanggal saja. Sesi pagi dan siang tidak saling menghapus denda.
- Perubahan aturan berlaku mulai tanggal yang dipilih. Mengganti toleransi atau tarif sekarang tidak menghitung ulang masa lalu secara otomatis.
- Jika ada kebutuhan penyesuaian historis, admin meninjau daftar record terdampak dan alasan sebelum menjalankan koreksi eksplisit. Transaksi yang sudah dibayar tetap dijaga jejaknya.
- Koreksi kehadiran memperbarui/membatalkan kewajiban denda secara atomik dan idempoten.
- Denda belum dibayar yang tidak berlaku lagi diberi status dibatalkan, bukan dihapus tanpa jejak.
- Denda sudah dibayar tidak otomatis hilang saat absensi dikoreksi. Catat koreksi dan tindak lanjut pengembalian/saldo sesuai keputusan admin; kas yang pernah diterima tetap dapat ditelusuri.
- Pembayaran memiliki nominal, waktu, catatan, dan status; boolean Lunas bukan satu-satunya bukti.
- Cakupan awal adalah pembayaran penuh. Pembayaran parsial dan kas pengeluaran umum di luar cakupan awal.

Tampilan Rekap Denda membedakan tagihan aktif, sudah dibayar, dibatalkan, dan pembayaran yang perlu penyesuaian. Ekspor menyertakan versi kebijakan dan dasar nominal yang digunakan.

### F-08. Profil agen, konten, laporan, dan ekspor

**Pertahankan:** direktori berfoto, filter, edit jabatan/divisi, impor agen ber-ID, media privat, kalender editorial, PIC, brief, caption, materi gambar, status, dan pencatatan tautan Instagram. PIC konten adalah agen, bukan akun login tambahan.

**Tambahkan di profil:** jadwal reguler minggu ini, kehadiran reguler, kontribusi ekstra, menit terverifikasi/estimasi, serta akses riwayat sesuai filter. Menonaktifkan agen tidak menghapus riwayat; penugasan mendatangnya ditinjau admin.

**Ekspor CSV:** daftar agen, jadwal mingguan, kehadiran, kontribusi, dan denda menurut filter aktif. Sertakan periode, zona waktu, jenis kontribusi, waktu datang/pulang, sumber durasi, dan status denda/pembayaran yang relevan. Format harus tetap terbaca di spreadsheet; nilai yang berpotensi menjadi formula diperlakukan sebagai teks.

### F-09. Jadwal online berulang: Instagram dan OA LINE

**Keputusan pengguna:** jadwal offline berlaku untuk seluruh agen dari semua divisi. Jadwal online merupakan roster terpisah, hanya untuk agen aktif **Divisi Pelayanan dan Konsultasi**, dengan dua kanal berbeda: Instagram dan OA LINE. Divisi Analisis Data dan Media Kreatif tetap dapat masuk jaga offline; tidak otomatis berhak menjadi petugas online.

- Admin mengatur satu petugas Instagram dan satu petugas OA LINE per hari online aktif. Pola otomatis berulang setiap minggu.
- Kanal online memakai penanggung jawab harian, bukan otomatis mengikuti dua sesi offline. Hari online aktif dan cakupan waktunya dikonfigurasi terpisah; akhir pekan belum diasumsikan wajib atau libur.
- Instagram dan OA LINE boleh dipegang agen berbeda. Jika agen yang sama dipilih pada kedua kanal, beri peringatan beban kerja; pembatasan keras perlu keputusan organisasi.
- Petugas offline dan online tidak saling menggantikan. Menggeser jadwal offline tidak memindahkan petugas kanal online.
- Form hanya menawarkan agen aktif Pelayanan dan Konsultasi. Server memvalidasi kelayakan yang sama, bukan hanya menyaring dropdown.
- Perubahan divisi/status agen memberi peringatan atas penugasan online mendatang; jangan menghapus kepemilikan klien atau sejarah penugasannya secara otomatis.
- Jadwal online mendukung versi efektif dan pengecualian harian seperti jadwal offline. Kekosongan petugas harus terlihat sebagai tindak lanjut, bukan diisi otomatis dengan nama sembarang.
- Contoh: Senin Instagram A, OA LINE B; Selasa Instagram C, OA LINE D. Pola itu berlaku kembali minggu berikutnya.

### F-10. Petugas Instagram terhubung dengan kalender publikasi

- Pisahkan **PIC produksi konten** (brief/caption/desain) dari **petugas publikasi**. PIC produksi tidak otomatis harus dari Pelayanan dan Konsultasi.
- Tanggal publikasi dalam kalender menentukan petugas Instagram hari itu berdasarkan jadwal online yang berlaku. Semua postingan hari tersebut tampil di antrean petugas tersebut.
- Detail konten menampilkan PIC produksi, petugas publikasi, jam WIB, status, dan tautan/bukti terbit. Tidak membuat akun agen tambahan.
- Mengubah tanggal konten yang belum terbit memperbarui petugas sesuai tanggal baru dan menampilkan perubahan itu sebelum disimpan. Konten terbit menyimpan siapa pelaksana publikasinya saat kejadian; tidak berubah mengikuti roster terbaru.
- Penggantian petugas publikasi pada hari tertentu melalui pengecualian beralasan dan diaudit, tetap memakai agen yang memenuhi syarat.
- Jika jadwal kosong atau agen nonaktif, konten tetap dapat direncanakan tetapi ditandai “petugas publikasi belum ditentukan”; jangan diklaim siap secara operasional.
- Publikasi tetap manual melalui Instagram. Jadwal kalender tidak berarti aplikasi mengirim postingan otomatis.

### F-11. Tab Layanan OA LINE dan PJ klien yang menetap

**Aturan utama:** petugas OA LINE pada saat klien pertama menghubungi menjadi PJ klien tersebut. Kepemilikan ini disimpan dan tidak dihitung ulang ketika hari/piket berganti. Agen yang bukan petugas hari ini tetap menjadi PJ untuk klien lama miliknya.

**Data klien dan layanan:** ID klien internal, nama/display name, identitas OA LINE bila tersedia, waktu pertama chat dalam WIB, waktu input, ringkasan kebutuhan, detail pertanyaan, PJ tetap, asal penugasan, status layanan, pembaruan/catatan, serta waktu respons/penyelesaian jika dicatat.

**Alur:**

1. Admin membuka tab **Layanan OA LINE → Tambah klien/percakapan** dan mencari apakah klien sudah terdaftar.
2. Klien baru: admin memasukkan waktu chat sebenarnya. Sistem mengusulkan petugas OA LINE pada hari/tanggal chat tersebut, bukan hari saat data diinput. Admin meninjau lalu menyimpan PJ pada klien.
3. Jika tidak ada jadwal yang valid atau pemetaan historis tidak tersedia, tandai “perlu penetapan PJ” dan minta pilihan admin; jangan menebak dari jadwal hari ini.
4. Klien lama: percakapan/catatan baru tetap mengikuti PJ klien yang sudah tersimpan. Mengubah tanggal kontak pertama tidak otomatis menimpa PJ tanpa alur koreksi.
5. Status layanan awal: Baru, Dalam penanganan, Menunggu klien, Selesai. Riwayat dapat dibuka kembali tanpa mengganti PJ.
6. Hanya admin dapat melakukan **Alihkan PJ**, dengan agen Pelayanan dan Konsultasi yang memenuhi syarat, alasan, waktu berlaku, dan riwayat PJ lama–baru. Petugas piket harian tidak otomatis mengambil alih semua klien terbuka.

**Contoh:** klien X pertama chat Senin ketika B bertugas OA LINE. Selasa petugas OA adalah D, tetapi X tetap ditangani B; klien baru Y pada Selasa ditugaskan kepada D. Jika B tidak dapat melanjutkan, admin memindahkan X secara eksplisit, bukan melalui pergantian kalender.

**Tampilan:** daftar klien dengan filter PJ/status/tanggal, panel riwayat layanan, jumlah layanan terbuka per PJ, antrean klien tanpa PJ, dan penanda petugas OA hari ini. Penanda “piket hari ini” berbeda dari label “PJ tetap klien”.

Nama klien bukan ID unik; gunakan identitas LINE atau ID internal. Nama mirip memunculkan saran pemeriksaan, tidak otomatis menggabungkan orang berbeda. Jika identitas klien belum lengkap, admin dapat mencatat sementara dan melengkapinya dengan riwayat koreksi.

Tab ini adalah pencatatan/pengelolaan layanan oleh admin. Pembalasan pesan tetap dilakukan agen di OA LINE; aplikasi tidak mengirim, membaca otomatis, atau menyinkronkan chat tanpa integrasi LINE terpisah. Tidak menyimpan token LINE atau data klien pada frontend publik. Batasi detail pribadi pada kebutuhan layanan; penyimpanan data klien memakai RLS admin dan ekspor terkontrol.

### F-12. Struktur divisi yang benar

Direktori, filter, dan form tambah/edit minimal mendukung **Pengurus Inti**, **Pelayanan dan Konsultasi**, **Analisis Data**, dan **Media Kreatif**. Semua divisi tambahan yang memang sudah ada di data tetap ditampilkan. Jangan mengganti dua divisi berbeda menjadi nama gabungan “Analisis & Pelayanan”.

Pemeriksaan sumber legacy pada 24 Oktober 2026 menemukan 5 agen Pengurus Inti dan masing-masing 12 agen pada tiga divisi lainnya. Data `ps_agents` dilindungi RLS dan tidak dapat diperiksa tanpa sesi admin; tidak boleh menganggap seluruh agen legacy sudah diimpor.

Mengedit jabatan/foto tidak boleh memindahkan divisi karena opsi lama tidak tersedia. Label ambigu lama tetap terlihat untuk ditinjau admin, bukan dipetakan otomatis berdasarkan nama. Untuk validasi online di server, gunakan identitas divisi yang dikelola secara eksplisit; label bebas semata tidak menjadi bukti kelayakan.

### F-13. Edit keanggotaan, jabatan PI, filter, dan pencarian ketik

**Kebutuhan pengguna yang dikonfirmasi:** nama, divisi, dan jabatan dapat diedit oleh admin langsung dari direktori. Pengurus Inti mempunyai jabatan yang dapat disunting; di masing-masing divisi terdapat BPH dan Anggota. Pengelompokan/urutan dan filter memudahkan pencarian tanpa menggulir seluruh daftar.

- Tombol Edit profil tersedia pada setiap kartu; edit nama/divisi/jabatan mempertahankan ID agen agar riwayat, jadwal, dan PIC konten tidak terputus.
- Saran jabatan PI: Ketua Agen Pojok Statistik, Wakil Ketua Agen, Sekretaris dan Bendahara, Koordinator Analisis Data dan Pelayanan, serta Koordinator Media Kreatif. Sekretaris dan Bendahara juga dapat dipakai sebagai dua jabatan terpisah. Saran ini bukan daftar nama orang atau batas jabatan tetap; admin dapat mengetik jabatan lain.
- Divisi lainnya menyediakan saran BPH dan Anggota. Jabatan lama/khusus tidak diubah otomatis. Mengubah divisi memperbarui saran, bukan mengganti jabatan tersimpan tanpa tindakan admin.
- Tampilan default dikelompokkan per divisi, dengan PI di awal dan saran urutan jabatan. BPH didahulukan dalam kelompok divisi; nama menjadi urutan berikutnya. Tersedia pilihan Nama A–Z dan Nama Z–A untuk seluruh hasil.
- Filter divisi dan kategori jabatan (PI/BPH/Anggota/jabatan lain) dapat dipakai bersamaan dengan pencarian. Jumlah hasil dan pesan kosong harus terlihat.
- Mengetik `su` menemukan potongan nama di bagian mana pun, misalnya Surya, Nadia Suci, dan Agus Sutanto; huruf besar/kecil tidak dibedakan. Beberapa kata dapat mempersempit potongan nama bersama-sama; divisi dan jabatan dipilih melalui filter agar nama tanpa `su` tidak ikut muncul hanya karena berada di divisi Konsultasi.
- Pemilihan agen pada penugasan harian, jadwal master, sukarelawan, dan PIC konten menggunakan kolom pencarian ketik dengan hasil nama + divisi + jabatan. Nilai yang dikirim tetap ID agen, bukan teks nama.
- Nama yang sama tidak digabung; pengguna memilih hasil yang benar berdasarkan detail. Teks yang belum dipilih dari hasil pencarian tidak boleh disimpan sebagai agen valid.
- Mendukung klik/tap, Arrow Up/Down, Enter, Escape, dan navigasi Tab. Escape pertama menutup hasil pencarian, bukan membuang formulir yang masih diedit.
- Penugasan baru hanya menawarkan agen aktif; penugasan lama dengan agen nonaktif tetap menampilkan identitas yang sudah tersimpan untuk menjaga riwayat.

Perubahan ini berupa UI dan perilaku direktori/pemilih pada model data agen yang sudah ada. Tidak membuat akun login per agen atau mengubah keanggotaan database secara massal.

## 6. Navigasi dan penjagaan kualitas UI

| Area               | Struktur                                                                              |
| ------------------ | ------------------------------------------------------------------------------------- |
| Beranda            | Ringkasan hari ini, tindakan admin, agenda konten, apresiasi ringkas, tautan analitik |
| Jadwal & Kehadiran | Tab Jadwal Mingguan, Absensi Harian, Jam Operasional & Aturan                         |
| Direktori Agen     | Profil, foto, peran organisasi, ringkasan kontribusi                                  |
| Konten & Publikasi | Kalender/daftar, editor konten, PIC, materi, review                                   |
| Rekap Denda        | Tagihan, pembayaran, koreksi, filter dan ekspor                                       |

Tambahkan area **Jaga Online** (tab Instagram dan OA LINE) serta **Layanan OA LINE** (klien dan PJ tetap). Pada desktop keduanya dapat menjadi satu menu Layanan Online dengan sub-tab Jadwal Online, Publikasi IG, dan Klien OA LINE; pada mobile gunakan Lainnya agar navigasi tidak dipaksakan terlalu padat.

Analitik lengkap dibuka dari Beranda tanpa memadatkan layar awal. Pada ponsel, navigasi bawah memakai label pendek; Rekap Denda/Pengaturan dapat berada dalam Lainnya jika lima menu membuat teks sulit dibaca.

Papan mingguan desktop memperlihatkan sepuluh slot. Ponsel memakai pemilih hari atau daftar sesi, dengan aksi pindah yang mudah ditekan. Drag bukan satu-satunya cara mengubah jadwal. Pertahankan warna, tipografi, ruang, dan komponen workspace baru, sambil memperbaiki kebutuhan aksesibilitas bila diperlukan; “pertahankan UI” tidak berarti membekukan setiap piksel.

## 7. Model data konseptual

Ini rancangan entitas, bukan instruksi langsung mengganti schema yang sudah berjalan.

| Entitas                     | Tanggung jawab                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| Periode                     | Kepengurusan dan batas pelaporan                                                          |
| Pola mingguan + versi       | Hari, sesi, agen, PJ, urutan, minggu mulai berlaku                                        |
| Pengecualian minggu/tanggal | Perubahan sementara terhadap pola aktif, cakupan waktu, alasan, status draf/berlaku       |
| Aturan operasional + versi  | Jam per hari/sesi, kebijakan bertingkat, pengecualian PJ, waktu berlaku                   |
| Sesi aktual                 | Tanggal, sesi, snapshot waktu/aturan, status buka/tutup/libur                             |
| Penugasan aktual            | Agen, sumber reguler/pengganti, PJ saat sesi, referensi jadwal asal                       |
| Kehadiran/kontribusi        | Agen, sesi aktual, jenis kontribusi, status, jam hadir/pulang, sumber jam, alasan koreksi |
| Denda                       | Kehadiran asal, jenis, aturan saat terjadi, nominal, status koreksi                       |
| Pembayaran                  | Denda asal, nominal, waktu, catatan, koreksi bila ada                                     |
| Audit                       | Perubahan jadwal, aturan, kehadiran, dan transaksi oleh akun admin                        |

**Invariant wajib:** unik agen–sesi aktual, versi jadwal tidak mengubah sejarah, penanda ekstra tersimpan, tidak ada durasi negatif, tidak ada denda ganda untuk kejadian yang sama, serta setiap pembayaran dapat ditelusuri. `ps_shifts` saat ini memuat penugasan dan status kehadiran; perlu migrasi bertahap untuk memisahkan tanggung jawabnya. Jangan langsung menambahkan semua field denda/pembayaran ke satu baris shift.

Snapshot bukan salinan seluruh data agen: identitas tetap ber-ID, sedangkan jam, aturan, peran sesi, dan sumber kewajiban disimpan sesuai fakta saat kejadian. Koreksi historis tetap mungkin melalui alur koreksi yang diaudit.

### Tambahan entitas online

- **Divisi:** identitas stabil dan keanggotaan agen untuk validasi petugas online.
- **Jadwal online + versi:** hari aktif, kanal Instagram/OA LINE, agen, periode berlaku, dan pengecualian tanggal. Terpisah dari dua sesi offline.
- **Penugasan publikasi:** konten, petugas publikasi, tanggal/jam rencana, pelaksana saat terbit, asal roster/pengecualian.
- **Klien OA LINE:** ID stabil, identitas kanal bila tersedia, waktu chat pertama, PJ tetap, status.
- **Percakapan/catatan layanan:** klien, waktu kejadian/input, kebutuhan, tindak lanjut, respons/penyelesaian yang dicatat.
- **Riwayat alih PJ:** klien, PJ lama/baru, alasan, waktu, pelaku admin.

Roster online tidak menghitung ulang PJ klien yang sudah disimpan. Aktivitas online tidak dikonversi menjadi menit/sesi offline atau dikenai denda offline tanpa kebijakan tambahan yang disepakati. Jangan memberikan menit layanan fiktif hanya karena seseorang terdaftar sebagai piket sehari.

## 8. Integritas, keamanan, dan waktu

- Pertahankan Supabase Auth dan RLS admin tunggal pada tabel baru, fungsi server, serta Storage. Jangan mengganti otorisasi dengan flag localStorage.
- Operasi bulk, perpindahan yang memengaruhi beberapa penugasan, dan perubahan absensi+denda memakai transaksi server serta pemeriksaan versi.
- Pengulangan request tidak menciptakan data ganda; kegagalan tidak ditampilkan sebagai sukses.
- WIB digunakan secara konsisten. Jangan membuat tanggal absensi dengan pemotongan UTC yang dapat menggeser hari lokal.
- Jam server digunakan untuk waktu pencatatan. Input waktu kejadian historis diperbolehkan dengan alasan; ini bukan klaim sistem anti-kecurangan berbasis jam browser.
- Agregasi laporan di database mencakup seluruh hasil filter, bukan hanya halaman pertama hasil API.
- Pilihan tanggal untuk absensi dan publikasi tetap dipertahankan; perubahan utama ada pada cara menyusun kewajiban mingguan.

## 9. Strategi transisi data

1. Inventarisasi tabel legacy dan `ps_*`, cek jumlah record, kelengkapan ID, peran, jam, serta kebijakan akses.
2. Buat pemetaan agen berdasarkan ID sumber; nama duplikat ditinjau, bukan digabung otomatis.
3. Migrasikan jadwal legacy sebagai pola dasar dengan tanggal mulai berlaku yang dinyatakan admin; jangan menebak pola untuk semua minggu masa lalu.
4. Pertahankan data bertanggal yang sudah dibuat di workspace sebagai pengecualian/penugasan eksplisit, setelah ditinjau.
5. Absensi lama tanpa penanda ekstra yang andal diberi status asal kontribusi “belum terklasifikasi”. Admin dapat memverifikasi berdasarkan bukti jadwal historis. Jangan memberi label sukarela hanya karena nama tidak ada pada pola hari ini.
6. Jam pulang tidak diisi secara fiktif; durasi lama tetap estimasi jika dasar waktunya tersedia. Jika jam akhir historis tidak diketahui, nyatakan tidak dapat dihitung, bukan gunakan jam sekarang.
7. Cocokkan denda dan pembayaran per sesi. Record lama yang hanya mempunyai nama+tanggal masuk daftar pengecualian untuk peninjauan.
8. Uji di staging, rekonsiliasi per periode dan per agen, lalu lakukan cutover operasional. Simpan pemetaan dan jalur pemulihan; jangan hapus tabel lama setelah impor pertama.

## 10. Kriteria penerimaan

| ID    | Skenario                                                                  | Hasil yang wajib                                                                                                   |
| ----- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| AC-01 | Salin minggu lalu lalu pindahkan A dari Senin pagi ke Rabu siang          | Minggu terpilih berubah; minggu lalu dan riwayatnya tetap                                                          |
| AC-02 | Minggu berganti tanpa perubahan pola                                      | Daftar reguler terbentuk otomatis; admin tidak menyalin, mempublikasikan ulang, atau mengisi tanggal satu per satu |
| AC-03 | Coba menambahkan A dua kali pada hari/sesi sama                           | Ditolak; tidak menambah sesi kontribusi                                                                            |
| AC-04 | Perubahan pola setelah kehadiran lama tercatat                            | Jenis kontribusi, jam, PJ, dan aturan lama tetap sesuai snapshot                                                   |
| AC-05 | B reguler Senin pagi membantu sukarela Senin siang                        | Pagi dihitung sebagai sesi reguler; siang menambah durasi sukarela saja, tanpa denda                               |
| AC-06 | B membantu sesi A yang tidak hadir                                        | A tidak otomatis dianggap hadir/izin; kewajibannya tetap ditinjau                                                  |
| AC-07 | Relawan datang 14.15 dan pulang 15.00                                     | Kontribusi 45 menit tercatat dan masuk kategori sukarela                                                           |
| AC-08 | Sesi 10.00–12.30; datang 09.30 tanpa jam pulang                           | Estimasi 150 menit, tidak diklaim terverifikasi                                                                    |
| AC-09 | Datang 12.45 untuk sesi yang selesai 12.30                                | Nol menit; tidak otomatis mendapatkan satu sesi apresiasi                                                          |
| AC-10 | Jumat memakai jam berbeda atau tanggal diliburkan                         | Absensi dan durasi memakai aturan hari itu; libur tidak menciptakan denda                                          |
| AC-11 | Hadirkan semua saat satu agen sudah Izin                                  | Hanya Belum dicatat pada sesi terpilih berubah; Izin tetap                                                         |
| AC-12 | Request bulk atau pencatatan dikirim dua kali                             | Kehadiran dan denda tetap satu, hasil konsisten                                                                    |
| AC-13 | Filter apresiasi bulan Oktober                                            | Semua pembilang, denominator, grafik, dan judul memakai Oktober WIB                                                |
| AC-14 | Agen 1/1 dan agen 10/10 sama-sama hadir penuh                             | Keduanya 100%; jumlah penugasan terlihat dan tidak disembunyikan                                                   |
| AC-15 | Absen pagi dikoreksi sementara denda siang ada                            | Hanya denda terkait pagi berubah                                                                                   |
| AC-16 | Denda sudah lunas lalu kehadiran dikoreksi menjadi izin                   | Tagihan dikoreksi; penerimaan pembayaran dan jejak koreksi tetap ada                                               |
| AC-17 | Agen dinonaktifkan                                                        | Tidak muncul untuk penugasan baru; statistik historis tetap                                                        |
| AC-18 | Pengguna tanpa akses admin memanggil endpoint langsung                    | Ditolak oleh server/RLS, bukan hanya disembunyikan UI                                                              |
| AC-19 | Koneksi gagal saat kartu digeser/disimpan                                 | Tidak ada sukses palsu; draf/pemulihan jelas                                                                       |
| AC-20 | Operasi jadwal di ponsel atau keyboard tanpa drag                         | Tetap dapat memindahkan agen dengan kontrol alternatif                                                             |
| AC-21 | Direktori, unggah foto, dan kalender konten setelah penambahan fitur jaga | Alur yang sudah ada tetap berjalan                                                                                 |
| AC-22 | Ekspor dengan filter periode/divisi tertentu                              | Jumlah dan total cocok dengan tampilan serta sumber data yang sama                                                 |
| AC-23 | Pengecualian satu minggu telah berakhir                                   | Susunan kembali ke pola aktif; pengecualian tidak ikut berulang                                                    |
| AC-24 | Periode kepengurusan berakhir                                             | Pola tidak terus membuat kewajiban baru di luar periode                                                            |

### Penerimaan tambahan — denda fleksibel

| ID    | Skenario                                                                      | Hasil yang wajib                                                                                  |
| ----- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| AC-25 | Admin menetapkan toleransi 15 menit, tarif 5.000/10.000/15.000 seperti contoh | Jam 10.15 = 0; 10.30 = 5.000; 10.31 = 10.000; 11.01 = 15.000                                      |
| AC-26 | Admin mengubah batas dan nominal atau menambah tingkatan                      | Simulator dan hitungan server memakai aturan yang sama; batas tidak valid ditolak                 |
| AC-27 | Agen tercatat Izin meskipun sebelumnya dianggap terlambat/tidak hadir         | Nominal kewajiban akhir 0; jejak koreksi/pembayaran tetap ada                                     |
| AC-28 | Admin menetapkan ketidakhadiran tanpa izin Rp20.000                           | Hanya status Tidak hadir yang disahkan mendapat tarif tersebut; Belum dicatat tetap tanpa tagihan |
| AC-29 | Kebijakan khusus Jumat pagi berbeda dari kebijakan umum                       | Hanya sesi yang tercakup memakai aturan khusus; tidak ada penjumlahan dua kebijakan               |
| AC-30 | Toleransi/tarif baru diaktifkan untuk minggu berikutnya                       | Rekap dan pembayaran minggu sebelumnya tidak berubah diam-diam                                    |
| AC-31 | Denda keterlambatan dinonaktifkan, denda bolos tetap aktif                    | Agen hadir terlambat tidak ditagih; tidak hadir tanpa izin tetap mengikuti tarifnya               |
| AC-32 | Agen terkena tingkat kedua dan tingkat pertama juga dilewati                  | Satu tagihan sebesar tarif tingkat kedua, bukan akumulasi dua tarif                               |
| AC-33 | Hadir dikoreksi menjadi Tidak hadir atau sebaliknya                           | Tidak ada dua denda untuk kejadian sama; perhitungan/koreksi mengikuti status final               |
| AC-34 | Tarif telat tertinggi melebihi denda tidak hadir                              | Peringatan konsekuensi tampil pada pratinjau sebelum publikasi                                    |

### Penerimaan tambahan — sukarelawan dan layanan online

| ID    | Skenario                                                                                 | Hasil yang wajib                                                                                           |
| ----- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| AC-35 | Sukarelawan datang kapan pun pada sesi bantuan, termasuk setelah batas toleransi reguler | Denda selalu 0; menit dihitung menurut jendela kontribusi, tidak menambah sesi reguler                     |
| AC-36 | Agen reguler yang terlambat dipilih melalui Tambah Sukarelawan                           | Ditolak; kewajiban reguler tidak dapat dihapus dengan mengganti label                                      |
| AC-37 | Kolom penanda sukarelawan belum tersedia di database                                     | Simpan ditolak dengan petunjuk migrasi; tidak boleh menyimpan ulang dengan membuang penanda ekstra         |
| AC-38 | Filter/tambah/edit agen pada kedua divisi yang disebut pengguna                          | Pelayanan dan Konsultasi serta Analisis Data tersedia secara terpisah; edit jabatan tidak mengganti divisi |
| AC-39 | Agen Analisis Data dipilih untuk offline dan dicoba untuk online                         | Offline diperbolehkan; online ditolak oleh validasi server                                                 |
| AC-40 | Senin IG=A dan OA=B, lalu minggu berganti                                                | Pola online tetap sama; roster offline tidak berubah                                                       |
| AC-41 | Konten dipindah dari Senin ke Selasa sebelum terbit                                      | Petugas publikasi mengikuti roster Instagram Selasa; PIC produksi tetap sesuai penetapannya                |
| AC-42 | Klien X pertama chat Senin saat OA=B; Selasa OA=D                                        | PJ X tetap B, klien baru Selasa ditugaskan D                                                               |
| AC-43 | Chat pertama Senin baru dicatat Rabu                                                     | Rekomendasi PJ berdasarkan waktu chat Senin dan roster yang berlaku saat itu                               |
| AC-44 | Klien lama menghubungi lagi minggu depan                                                 | Memakai PJ tetap yang tersimpan; bukan petugas piket baru                                                  |
| AC-45 | Admin mengalihkan PJ klien                                                               | Riwayat, alasan, PJ lama/baru tersimpan; perubahan jadwal saja tidak menyebabkan alih PJ                   |
| AC-46 | Tanggal klien baru tidak memiliki petugas OA yang valid                                  | Masuk antrean penetapan PJ; tidak ditebak dari hari sekarang                                               |

### Penerimaan tambahan — direktori dan pencarian agen

| ID    | Skenario                                                | Hasil yang wajib                                                             |
| ----- | ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| AC-47 | Admin mengganti nama, divisi, dan jabatan               | ID agen tetap; jadwal/riwayat/PIC konten tetap mengacu agen yang sama        |
| AC-48 | PI memakai jabatan di luar saran                        | Nama jabatan tersimpan sesuai input; tidak ditebak dari nama orang           |
| AC-49 | Mengetik `SU` di direktori                              | Menemukan nama yang mengandung `su` pada bagian mana pun                     |
| AC-50 | Search + filter Media Kreatif + BPH                     | Hanya agen yang memenuhi seluruh kriteria tampil                             |
| AC-51 | Memilih A–Z atau Z–A                                    | Urutan hasil berubah sesuai pilihan, tanpa mengubah record agen              |
| AC-52 | Mengetik nama pada form penugasan dan memilih hasil     | Yang tersimpan adalah ID agen hasil pilihan; nama sama tetap dapat dibedakan |
| AC-53 | Teks tidak cocok atau belum dipilih pada form penugasan | Simpan ditolak dan formulir tetap ada                                        |
| AC-54 | Memilih hasil melalui keyboard atau tap ponsel          | Hasil ID sama dengan klik desktop dan tidak menimbulkan overflow horizontal  |

## 11. Prioritas dan urutan implementasi

Semua kemampuan berikut termasuk target pemulihan operasional; urutannya bukan penghapusan kebutuhan.

1. **Fondasi jadwal:** pola berulang otomatis, versi dan batas periode berlaku, jam operasional, pengecualian libur, dan snapshot sesi.
2. **Operasi admin:** papan geser dan pindah alternatif, absensi dari jadwal, relawan/pengganti, bulk, koreksi dan durasi berlabel.
3. **Apresiasi:** dashboard sesi/menit, rincian reguler–sukarela, filter periode, kategori penghargaan dan drill-down.
4. **Denda dan laporan:** toleransi dan tarif bertingkat yang dapat dikonfigurasi, pengecualian izin yang wajib, simulator, versi kebijakan, transaksi terkait sesi, pembayaran/koreksi, serta CSV.
5. **Online:** identitas divisi, roster Instagram/OA LINE berulang, pemetaan publikasi, klien OA dengan kepemilikan tetap dan alih PJ.
6. **Transisi:** migrasi/review riwayat, uji regresi fitur workspace, rekonsiliasi, dan aktivasi produksi.

Pengujian model periode dan waktu dimulai di tahap 1; jangan menunggu tahap dashboard untuk memperbaiki definisi kontribusi. Dashboard operasional dapat dirilis bertahap, tetapi jangan menyatakan fitur legacy lengkap sebelum denda, ekspor, dan rekonsiliasi selesai.

## 12. Ukuran keberhasilan

Ukuran awal berupa kriteria teramati, bukan klaim angka hasil yang belum diukur:

- Pola yang sudah disimpan otomatis tersedia minggu berikutnya tanpa salin, publikasi ulang, atau pembuatan sepuluh tanggal/sesi manual.
- Pengecualian sementara tidak mengubah pola normal pada minggu berikutnya.
- Setiap bantuan sukarela yang valid muncul pada profil dan laporan periode yang benar.
- Total pada grafik dapat ditelusuri ke record kehadiran dan sama dengan ekspor.
- Perubahan pola baru tidak mengubah total laporan yang sudah ditutup tanpa koreksi eksplisit.
- Seluruh AC wajib lulus, termasuk regresi foto agen dan kalender konten.
- Setelah digunakan, ukur waktu penyusunan minggu, jumlah koreksi salah klasifikasi, serta selisih rekonsiliasi; tetapkan target numerik dari baseline penggunaan nyata.

## 13. Keputusan yang sudah disepakati dan yang masih perlu ditinjau

| Pertanyaan                              | Default usulan PRD                                                                               | Dampak                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Susunan jadwal — sudah dikonfirmasi     | Tetap berulang setiap minggu; perubahan hanya bila diperlukan                                    | Pola tersimpan berlaku otomatis, pengecualian bersifat opsional |
| Aturan denda — sudah dikonfirmasi       | Toleransi dan nominal bertingkat dapat diedit; tarif bolos terpisah; izin sah selalu bebas denda | Konfigurasi fleksibel tidak boleh menimpa pengecualian izin     |
| Haruskah jam pulang dicatat?            | Opsional pada rilis awal; ketiadaannya selalu berlabel estimasi                                  | Mengurangi beban admin tanpa mengklaim durasi presisi           |
| PJ bebas denda?                         | Koreksi pengguna: bolos tetap didenda; pengecualian keterlambatan dipertahankan                    | Tidak dijadikan asumsi permanen tersembunyi                     |
| Satu Star Agent atau beberapa kategori? | Beberapa kategori; pemenang tunggal menunggu aturan                                              | Menjaga apresiasi sukarela dan kepatuhan tetap bermakna         |
| Izin/sakit masuk denominator?           | Dikeluarkan dari kewajiban efektif; jumlahnya tetap ditampilkan                                  | Rasio transparan dan dapat diaudit                              |

Nominal denda, toleransi, jam sesi aktual, dan syarat penghargaan adalah konfigurasi organisasi; angka contoh di lampiran bukan nilai final yang otomatis diterapkan.

## 14. Keputusan online yang masih perlu ditinjau

Hari aktif/akhir pekan dan jam pergantian piket online belum disebutkan pengguna; jangan otomatis menyalin jam offline. Usulan awal penentuan tanggal memakai WIB kalender, dengan hari aktif dan jam cakupan yang dapat diatur. Tidak menambahkan denda online otomatis. Mekanisme cadangan saat PJ klien cuti/nonaktif memerlukan alih PJ oleh admin; integrasi pengambilan/pembalasan pesan LINE dan publikasi otomatis Instagram tetap di luar cakupan awal.


## Status implementasi layanan online — 27 Oktober 2026

Menu Layanan Online telah diimplementasikan: pola mingguan terpisah per kanal dan jam, masa berlaku, pengecualian tanggal, validasi server untuk agen aktif Pelayanan dan Konsultasi, antrean IG, snapshot petugas saat Terbit, klien dengan PJ tetap, alih PJ beralasan, filter nama/status/PJ, dan catatan serta audit. Bagian dokumen yang sebelumnya menyebut online masih spesifikasi merupakan riwayat tahap sebelumnya.

Batas versi ini: jam tidak lintas tengah malam; tidak ada integrasi API LINE/Instagram; tidak ada denda/durasi offline untuk layanan online. Snapshot publikasi merekam petugas roster saat status Terbit dicatat, bukan identitas pelaksana yang diverifikasi platform. Tidak ada migrasi atau penebakan penugasan historis tanpa roster. Nama divisi resmi dikelola admin pada ps_agents dan kelayakan diperiksa dengan ID agen serta nama divisi persis di server; belum ada tabel master divisi terpisah. UI audit tersedia untuk klien, sementara audit perubahan roster tersimpan di database. Koreksi kontak pertama dan penghapusan riwayat tidak tersedia dalam UI ini.
