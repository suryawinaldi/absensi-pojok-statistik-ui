# Pojok Statistik UI

Aplikasi operasional Pojok Statistik UI. **Hanya satu akun admin yang login.** Agen merupakan data anggota, bukan akun pengguna.

## Struktur saat ini

| Rute          | Fungsi                                                                                                           |
| ------------- | ---------------------------------------------------------------------------------------------------------------- |
| `/`           | Workspace admin baru                                                                                             |
| `/admin/`     | Workspace baru: Supabase Auth, direktori agen, jadwal bertanggal, kehadiran, kalender konten, foto/materi privat |
| `/prototype/` | Demo desain dengan data fiktif dan penyimpanan lokal                                                             |

Workspace `/admin/` tidak menggunakan data demo. Database baru memakai tabel `ps_*`, terpisah dari tabel aplikasi lama. Login lama tidak dapat digunakan untuk masuk ke workspace baru.

## Menjalankan

Gunakan Node.js 22 atau lebih baru dan npm. `npm run dev` menjalankan server lokal yang melayani file web sekaligus API login username.

```bash
npm ci
npm run dev
```

`npm run build` menghasilkan folder `public/`. Workspace langsung tampil di `/`; `/admin/` juga tetap tersedia. Browser mengambil SDK Supabase dari bundle lokal; tidak bergantung pada CDN untuk UI baru.

Build membaca URL dan **anon/publishable key** yang sudah ada di `js/supabase.js`. Untuk staging/proyek lain, set `PUBLIC_SUPABASE_URL` dan `PUBLIC_SUPABASE_ANON_KEY` di lingkungan build. Kedua nilai ini adalah konfigurasi publik, bukan kredensial admin. Build menolak JWT dengan role selain `anon` dan key `sb_secret_*`.

## Aktivasi Supabase

Belum dilakukan otomatis. Gunakan proyek staging terlebih dahulu untuk uji langsung.

1. Di **Supabase → SQL Editor**, tinjau lalu jalankan [migrasi workspace](supabase/migrations/202610230001_admin_workspace.sql). Jalankan sekali; seluruh migrasi dalam transaksi. Migrasi menambah tabel dan bucket privat, tanpa mengubah tabel lama.
2. Ikuti [panduan membuat username dan password admin](docs/ADMIN_LOGIN.md): buat satu akun Supabase Auth, daftarkan UID di `ps_admin`, lalu set `ADMIN_USERNAME` dan `ADMIN_EMAIL` di Vercel.
3. Redeploy Vercel setelah konfigurasi disimpan. Masuk memakai username pilihan dan password akun Auth; email tidak diketik pada form login.
4. Uji profil, foto, penugasan, absensi, dan konten di staging. Pastikan sesi nonadmin dan permintaan tanpa login ditolak.

Verifikasi produksi belum selesai. Koneksi tool Vercel terakhir ditolak dengan 403 pada pemeriksaan akses deployment; keberhasilan tes lokal bukan bukti akses atau konfigurasi produksi.

## Memindahkan daftar agen lama

Di Direktori Agen, gunakan **Impor agen lama**. Aplikasi membaca tabel `agen`, menampilkan pratinjau nama/divisi/jabatan awal, lalu menyalin data hanya setelah tombol impor ditekan. ID sumber disimpan sebagai pemetaan, sehingga impor ulang melewati agen yang telah disalin. Nama sama dengan ID berbeda tetap dipertahankan sebagai dua profil untuk ditinjau admin.

Impor merupakan satu transaksi dan dibatasi 500 profil per permintaan. Data tidak lengkap membatalkan operasi. Akun admin perlu hak baca pada tabel lama; bila kebijakan lama menolak akses, tinjau kebijakan tersebut sebagai pemilik database, jangan menonaktifkan RLS. Jabatan awal berasal dari flag BPH dan dapat diedit. Jadwal mingguan, absensi, dan denda lama belum dimigrasikan karena memerlukan pemetaan tanggal dan ID agen yang ditinjau terlebih dahulu.

## Direktori dan pemilihan agen

Direktori mendukung edit nama/divisi/jabatan dari setiap kartu, kelompok divisi, filter jabatan, serta urutan nama A–Z/Z–A. Pengurus Inti memiliki saran jabatan yang dapat diedit; divisi lainnya menawarkan BPH/Anggota. Nama jabatan khusus yang sudah ada tetap dipertahankan.

Ketik potongan nama seperti `su` untuk menemukan nama yang mengandungnya. Pada form jadwal, sukarelawan, dan konten, ketik lalu pilih hasil pencarian (nama, divisi, jabatan). Arrow Up/Down dan Enter juga dapat digunakan. Sistem menyimpan ID agen; mengganti nama tidak memutus riwayat. Tidak perlu migrasi database baru untuk fitur direktori ini.

## Perilaku data

- Login username diverifikasi melalui `/api/admin-login` di server Vercel, kemudian SDK Supabase menyimpan sesi. Password tidak disimpan di source atau environment variable.
- RLS mengizinkan hanya UUID admin terdaftar. Agen tidak dihubungkan ke `auth.users`.
- Kehadiran dengan status Hadir wajib memiliki jam WIB. Agen/tanggal/sesi harus unik.
- Penjadwalan konten menyimpan tanggal/jam **Asia/Jakarta**. Publikasi Instagram masih manual; status Terbit membutuhkan tautan Instagram.
- Foto dan gambar disimpan di bucket privat `pojok-media`. URL tampilan bertanda tangan berlaku satu jam. Kembali ke tab setelah 45 menit memuat ulang data bila tidak sedang mengedit. Tombol Muat ulang tersedia untuk penyegaran manual.
- Penyimpanan memeriksa nomor versi baris. Bila data berubah di perangkat lain, formulir dipertahankan dan admin diminta memuat ulang.
- Kegagalan jaringan tidak dianggap sukses. Bila respons terputus setelah server menerima perubahan, muat ulang untuk memeriksa hasil sebelum mengulangi input.
- Penggantian/hapus media membersihkan file lama setelah perubahan database terkonfirmasi. Kegagalan cleanup dapat meninggalkan file yatim; cleanup otomatis lanjutan belum tersedia.
- Audit menyimpan aktor, objek, tindakan, dan waktu. Belum menyimpan diff seluruh kolom atau menyediakan UI audit.
- Tidak ada salinan record operasional dalam localStorage. SDK menyimpan sesi login; logout menghapus record dan formulir dari tampilan.

## Pengujian

```bash
npm test
npm run build
python3 -m http.server 8001 --bind 127.0.0.1 --directory public
```

Dengan Python Playwright dan Chromium tersedia, jalankan di terminal lain:

```bash
python3 tests/browser_admin.py --base-url http://127.0.0.1:8001
python3 prototype/tests/smoke.py --base-url http://127.0.0.1:8001
```

`npm test` menjalankan migrasi asli pada PostgreSQL lokal melalui PGlite (schema Auth/Storage platform disimulasikan), lalu memeriksa RLS, admin tunggal, constraint, audit, impor atomik, dan konflik versi. Tes adapter memeriksa batas sukses penyimpanan serta cleanup media. Tes browser **mensimulasikan respons HTTP Supabase** untuk menguji alur UI; hasilnya bukan bukti konektivitas proyek Supabase produksi.

## Vercel

`vercel.json` menetapkan build `npm run build` dan output `public`. Setelah perubahan dikirim ke GitHub dan Vercel selesai membangun, workspace baru langsung tampil di halaman utama `/` dan tetap tersedia di `/admin/`. Aplikasi lama tidak lagi disalin ke output publik; `/legacy/` tidak tersedia pada deployment baru. Source dan data lama tetap dipertahankan untuk kebutuhan migrasi. Endpoint `api/admin-login.js` dijalankan sebagai Vercel Function. File SQL, konfigurasi pemetaan akun, dan script migrasi tidak disalin ke output statis publik. Status push GitHub dan deployment perlu diverifikasi terpisah dari keberhasilan build lokal.

## Tahap berikutnya

Pengujian staging/produksi, migrasi riwayat lama, UI audit perubahan, dan backup/restore. Workspace sudah menyediakan jam operasional, toleransi, denda, status pembayaran, ekspor CSV, periode aktif, serta filter periode direktori. Arsip periode untuk seluruh laporan belum tersedia; laporan semua waktu diberi label sesuai cakupannya.


## Pembaruan histori dan periode — 26 Oktober 2026

Sebelum menerbitkan frontend ini, terapkan migrasi `supabase/migrations/20261026070244_preserve_attendance_rules_and_period.sql` pada staging setelah migrasi sebelumnya. Migrasi harus dijalankan sekali, dalam transaksi, menggunakan pemilik database. Backup dahulu, periksa hasil di staging, lalu terapkan ke produksi sebelum deployment frontend. Frontend meminta kolom baru secara eksplisit sehingga schema lama menghasilkan pesan migrasi, bukan keberhasilan perlindungan histori yang semu.

- `active_period` mengatur label workspace dan periode awal profil baru. Profil lama tidak dipindahkan otomatis. Periode profil dapat diedit dan direktori dapat difilter per periode; ID agen tetap sama.
- `rules_snapshot` ditentukan trigger database pada kehadiran pertama yang dicatat. Denda dan estimasi durasi menggunakan salinan aturan tersebut, termasuk saat catatan dikoreksi. Request browser tidak dapat menimpa snapshot. Tanggal/sesi catatan bersnapshot tidak dapat dipindah.
- Catatan lama menerima baseline dari konfigurasi saat migrasi, ditandai `source = migration_baseline`. Ini bukan rekonstruksi aturan historis yang tidak pernah disimpan. Tinjau nominal lama sebelum migrasi dan bandingkan rekap setelahnya.
- Catatan lunas harus dibatalkan status lunasnya sebelum kehadiran diubah atau dihapus. Trigger mencatat perubahan melalui mekanisme audit yang sudah tersedia.
- Perubahan pengaturan divalidasi di form dan database: format jam harus benar dan jam tutup harus setelah jam buka. Sesi yang belum diatur tetap memakai default aplikasi.
- Aplikasi lama tidak dipublikasikan lagi. Langkah ini tidak mencabut akses tabel legacy atau menonaktifkan deployment lama yang sudah terbit; audit kebijakan RLS legacy dan akses deployment lama tetap diperlukan.
- Ekspor denda mengikuti filter pencarian dan pembayaran. Pengujian browser memeriksa file unduhan sebenarnya. Nilai teks CSV dinetralkan agar tidak menjadi formula spreadsheet.

Pengujian: `npm test`, `npm run build`, lalu `python3 tests/browser_admin.py` dengan server statis lokal. Tes database mencakup snapshot historis, penolakan manipulasi snapshot, penguncian pembayaran, validasi periode/jam, dan akses nonadmin. Browser mencakup periode aktif, validasi jam, serta ekspor terfilter. Semua tes tetap lokal/simulasi.


## Koreksi denda PJ offline

PJ sesi tetap dikenai denda bolos bila statusnya Tidak hadir. Pengecualian keterlambatan PJ, izin/sakit, serta sesi sukarelawan dipertahankan. Koreksi berlaku pada perhitungan seluruh catatan, termasuk PJ Tidak hadir yang sudah tersimpan; nominal tetap mengikuti rules_snapshot jika tersedia. Tidak ada perubahan status pembayaran atau penulisan ulang record. Layanan jaga online IG/OA LINE khusus Pelayanan dan Konsultasi masih berupa spesifikasi, belum fitur aplikasi.
