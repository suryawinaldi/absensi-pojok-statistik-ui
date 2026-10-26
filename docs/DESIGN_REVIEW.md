# Audit UI dan fitur — 26 Oktober 2026

Perubahan lokal: palet biru #263B8E dan navy #182D6B, aksen oranye #FF9408, latar #F6F8FC; status tetap semantik. Target tombol utama minimum 44 px, sidebar dapat digulir, reduced motion dihormati. Ekspor denda mengikuti filter tabel dan CSV menetralkan teks yang dapat ditafsirkan sebagai formula spreadsheet.

Validasi: npm test (6 berkas lulus), npm run build, node --check, git diff --check, serta tests/browser_admin.py lulus. Browser menguji login, admin gate, agen, media, jadwal, absensi, konten, konflik, impor, pencarian, keyboard, logout, serta layout desktop/mobile 390 px. Screenshot login dan direktori ditinjau. Tes browser memakai mock HTTP, tes database memakai PGlite; produksi belum terverifikasi. Ekspor memakai fungsi filter bersama dengan tabel, tetapi unduhan terfilter belum diuji end-to-end.

Prioritas:
1. P0: js/auth.js legacy memeriksa kredensial di browser. /legacy/ masih diterbitkan. Audit RLS lama dan autentikasi server sebelum mempertahankan akses operasional. Risiko data aktual belum diverifikasi; jangan menganggap login browser sebagai otorisasi.
2. P1: denda dihitung dari aturan aktif; perubahan nominal/toleransi berpotensi mengubah rekap historis. Gunakan aturan bertanggal efektif atau snapshot yang dimigrasikan dengan hati-hati.
3. P1: periode default profil dan label 2026 / 2027 masih hardcoded. Tambahkan periode aktif dan arsip.
4. P1: uji Auth, RLS, Storage, dan simpan ulang pada staging/produksi dengan akses resmi. Koneksi tool Vercel mendapat 403 saat pemeriksaan akses deployment.
5. P2: label/keterangan mobile masih kecil; lakukan audit ukuran teks, zoom 200%, dan kontras seluruh komponen. Belum ada klaim kepatuhan WCAG penuh.
6. P2: tambahkan UI audit, histori pembayaran, pemulihan tindakan, serta prosedur backup/restore teruji.
7. P2: README tertinggal: source sudah memiliki pengaturan jam, denda, dan ekspor tetapi dokumentasi menyebutnya belum tersedia.

Logo masih memakai JPG lama dari logo.txt. PNG lampiran terlihat di chat tetapi tidak ditemukan sebagai file lokal; belum diintegrasikan. Warna baru merupakan interpretasi visual, bukan kode brand resmi. Perubahan belum di-push atau di-deploy. Tidak ada penulisan data produksi.


## Tindak lanjut yang sudah diimplementasikan

Build tidak lagi menerbitkan /legacy/. Periode aktif dapat diubah, profil menyimpan periode pilihan, dan direktori dapat difilter per periode. Label laporan semua waktu tidak lagi menyebut tahun tetap. Migrasi baru menyimpan aturan kehadiran di server, mempertahankannya saat konfigurasi berubah, menolak manipulasi snapshot, serta melindungi catatan lunas dari perubahan/penghapusan. Jam operasional divalidasi di form dan database. Input pencarian denda mempertahankan fokus saat mengetik. Tes browser telah memeriksa unduhan CSV sesuai filter dan pengaturan periode. Label mobile dan input diperbesar.

Penerapan masih lokal: migrasi Supabase perlu diterapkan sebelum frontend baru dipublikasikan. Catatan lama diberi baseline aturan saat migrasi, bukan rekonstruksi historis. UI menampilkan penjelasan baseline pada pengaturan. Penonaktifan akses tabel legacy dan deployment lama, UI audit lengkap, serta backup/restore masih memerlukan pekerjaan lanjutan. Logo PNG baru belum tersedia sebagai file lokal.
