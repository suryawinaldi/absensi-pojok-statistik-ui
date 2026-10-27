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

PJ sesi tetap dikenai denda bolos bila statusnya Tidak hadir. Pengecualian keterlambatan PJ, izin/sakit, serta sesi sukarelawan dipertahankan. Koreksi berlaku pada perhitungan seluruh catatan, termasuk PJ Tidak hadir yang sudah tersimpan; nominal tetap mengikuti rules_snapshot jika tersedia. Tidak ada perubahan status pembayaran atau penulisan ulang record. Layanan jaga online IG/OA LINE tersedia pada menu Layanan Online setelah migrasi fitur online diterapkan.


## Layanan Online — Instagram & OA LINE

Migrasi: `supabase/migrations/20261026151157_online_duty_and_client_services.sql`. Hanya admin workspace dapat membaca atau menulis data online. Migrasi menambah empat tabel online, trigger validasi/audit, serta kolom petugas publikasi pada konten. Data offline dan aturan dendanya tidak diubah.

- **Jadwal Online:** pilih kanal, hari, periode berlaku, jam mulai/selesai WIB, dan agen aktif Pelayanan dan Konsultasi. Tidak ada hari/jam default yang dianggap wajib. Jadwal berulang mingguan. Akhiri masa berlaku untuk pergantian pola; pengecualian harian wajib beralasan dan dapat menandai tidak ada petugas. Satu kanal/hari tidak boleh memiliki dua pola yang rentang berlakunya bertabrakan. Waktu akhir tidak termasuk cakupan. Jam lintas tengah malam belum didukung.
- **Publikasi IG:** antrean mengikuti tanggal konten, membedakan PIC produksi dari petugas publikasi. Form/detail konten menampilkan petugas sesuai tanggal/jam. Saat pertama ditandai Terbit, database menyimpan petugas yang ditentukan roster; perubahan jadwal selanjutnya tidak menimpanya. Publikasi lama atau publikasi tanpa jadwal ditandai belum tercatat, bukan ditebak. Ini pencatatan petugas terjadwal; bukan bukti API bahwa orang tersebut benar-benar menekan tombol publikasi.
- **Klien OA LINE:** waktu kontak pertama dimasukkan dalam WIB dan disimpan sebagai timestamptz. Database menetapkan PJ dari jadwal pada waktu tersebut, bukan waktu input. Jika tidak ada petugas, klien masuk daftar belum ditetapkan atau dapat diberi PJ manual dengan alasan. Nama tidak unik; ID LINE yang diisi tidak boleh duplikat. Identitas/ringkasan dapat diperbaiki, sedangkan kontak pertama tidak ditimpa melalui form.
- **Alih PJ:** hanya admin, ke agen aktif Pelayanan dan Konsultasi, dengan alasan. Pergantian hari atau roster tidak mengalihkan klien lama. Riwayat perubahan dan catatan layanan tersimpan secara append-only; tidak ada tombol menghapus riwayat. Agen yang menjadi nonaktif/berpindah divisi ditandai perlu ditinjau; data klien tidak dihapus.
- **Batas integrasi:** belum membaca atau mengirim pesan LINE, belum memposting ke Instagram, tidak menambah menit/sesi offline, tidak menerapkan denda online.

Validasi lokal: tes database untuk RLS anon/nonadmin, kelayakan petugas, benturan jadwal, prioritas pengecualian, PJ tetap, alasan transfer, keunikan ID LINE, catatan append-only, dan petugas publikasi tersimpan. Tes browser menggunakan HTTP simulasi untuk alur UI, kegagalan simpan, timezone WIB, serta desktop/mobile. Konektivitas produksi diperiksa terpisah.


Verifikasi penerapan 27 Oktober 2026: migrasi online sudah diterapkan melalui koneksi Supabase pada proyek yang digunakan aplikasi. Uji transaksi dengan role admin pada database produksi berhasil membuat roster, menetapkan PJ klien, mengalihkan PJ beserta audit, dan menambah catatan; seluruh record uji di-rollback. Tes browser tetap memakai mock HTTP dan tidak membuktikan login UI produksi. Security Advisor tidak menambahkan temuan untuk objek online baru; temuan lama masih ada pada pengaturan_sistem (RLS belum aktif), hak eksekusi fungsi legacy, dan pengaturan proteksi password. Temuan lama memerlukan peninjauan terpisah dan bukan alasan membuka akses tabel online.


## Keandalan operasional — 27 Oktober 2026

Migrasi `20261027053625_operational_reliability.sql` menutup akses anon ke pengaturan_sistem, menambahkan kebijakan admin yang restriktif, membatasi eksekusi fungsi trigger, menambah pembatalan/koreksi jadwal online, dan jurnal pembayaran denda.

- **Koreksi jadwal:** gunakan Koreksi atau Batalkan. Alasan wajib; koreksi menandai jadwal lama dibatalkan dan menyimpan pengganti secara atomik. Jika pengganti tidak valid, jadwal lama tetap aktif. Pembatalan pengecualian membuat pola mingguan kembali berlaku. Jadwal terbit dan PJ klien yang sudah tersimpan tidak dihitung ulang.
- **Pembayaran:** tombol Tandai lunas membuka form waktu bayar WIB, penerima, dan catatan. Nominal ditentukan database dari aturan kehadiran tersimpan. Pembatalan membutuhkan alasan, menambah transaksi reversal, dan mempertahankan pembayaran asli. Penanda fine_paid hanya dapat berubah mengikuti jurnal. Permintaan pembayaran memiliki UUID tetap agar retry tidak membuat transaksi ganda; versi baris dan row lock melindungi perubahan dari perangkat lain. Pembayaran parsial belum didukung.
- **Data lunas lama:** dimigrasikan menjadi legacy_baseline. Nominal diinferensikan dari aturan tersimpan saat migrasi, bukan bukti transaksi historis. Waktu bayar dan penerima asli tidak dikarang. UI menandai keterbatasan ini. Riwayat serta ekspor kas tersedia pada Rekap Denda.
- **Form:** konfirmasi buang perubahan melindungi perpindahan menu, pergantian tab online, penutupan panel, refresh, dan logout. beforeunload memakai peringatan bawaan browser. Draft hanya berada di memori halaman; tidak disimpan di localStorage. Perubahan pada form lain harus ditinjau sebelum penyimpanan memuat ulang panel.
- **Statistik:** satu sesi reguler berarti satu catatan Hadir non-sukarelawan, termasuk durasi nol. Menit dihitung terpisah. Kartu agen dan analitik memakai fungsi kontribusi yang sama.
- **Prioritas layar:** beranda memuat petugas online hari ini dan layanan terbuka, sementara analitik dapat dibuka sesuai kebutuhan. Label navigasi mobile dipendekkan. Daftar klien menampilkan usia sejak waktu kontak/catatan layanan; indikator ini bukan ukuran waktu respons yang diverifikasi LINE.

Pengujian mencakup RLS lama, larangan mengubah jurnal langsung, nominal dari server, idempotensi pembayaran, reversal, koreksi atomik dan konflik versi, guard navigasi yang ditolak pengguna, serta UI desktop/mobile. Tes browser menggunakan HTTP simulasi; verifikasi produksi dilakukan terpisah. Pengaturan leaked password protection Supabase belum diubah melalui revisi ini.

Verifikasi penerapan keandalan: migrasi berhasil diterapkan. Pemeriksaan produksi memastikan pengaturan_sistem memakai RLS, anon tidak memiliki hak SELECT/UPDATE, dan fungsi audit tidak dapat dieksekusi anon. Transaksi uji dengan role admin membuktikan pembayaran, retry idempoten, reversal, serta koreksi jadwal atomik; seluruh data uji di-rollback. Security Advisor tidak lagi melaporkan RLS tabel lama nonaktif atau fungsi definer yang dapat dipanggil anon. Peringatan fungsi definer yang dapat dipanggil authenticated tetap ada untuk endpoint transaksi yang sengaja tersedia dan memeriksa ps_is_admin di server; proteksi leaked password masih belum aktif.
