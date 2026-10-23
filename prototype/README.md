# Pojok Statistik UI — prototipe workspace admin

Versi desain interaktif untuk mengevaluasi empat modul sebelum integrasi dengan aplikasi produksi. Buka `prototype/index.html` melalui server HTTP dari root repository:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Rute prototipe: `/prototype/`. Tidak memerlukan npm, CDN, atau koneksi Supabase.

## Model pengguna

- Hanya **satu akun admin** yang mengelola aplikasi.
- Agen merupakan record anggota organisasi, bukan pengguna yang memiliki akun.
- Profil agen, PIC konten, dan petugas shift merujuk ID agen.
- Tampilan AD adalah representasi admin dalam desain, bukan implementasi login baru.

## Alur yang dapat dicoba

1. **Beranda:** ringkasan dari data demo, jadwal hari ini, tindak lanjut review, dan agenda publikasi.
2. **Direktori agen:** cari/filter, tambah/edit profil, unggah/hapus foto, lihat penugasan dan kontribusi konten.
3. **Jadwal & kehadiran:** pilih tanggal/sesi, tambah penugasan, cegah duplikasi agen pada sesi yang sama, catat status dan jam hadir secara manual.
4. **Konten & publikasi:** kalender bulanan atau daftar, filter status, buat konten pada tanggal tertentu, edit tanggal/jam/PIC/brief/caption, unggah gambar, hapus konten, dan catat tautan publikasi.

Data contoh bersifat fiktif. Kalender awal mengikuti tanggal WIB saat pertama kali dimuat. Seluruh perubahan disimpan di localStorage dengan key `pojok-workspace-prototype-v1`, terpisah dari aplikasi lama. Reset demo menghapus perubahan contoh di browser ini setelah konfirmasi. Reset tidak mengakses database produksi.

Gambar JPG/PNG/WebP maksimal 5 MB per berkas. Foto dipotong persegi 256 px; materi konten diperkecil maksimal 900 px. Demo mendukung hingga empat gambar per konten. Batas browser tetap berlaku; kegagalan penyimpanan dilaporkan dan tidak dinyatakan berhasil. Foto dan materi ini tidak diunggah ke server.

Status Terbit membutuhkan tautan HTTPS Instagram. Status Dijadwalkan hanya merepresentasikan rencana; tidak ada publikasi otomatis. Data contoh memakai nama dan tautan ilustrasi, bukan bukti publikasi nyata.

## Arah desain

- Sidebar biru gelap, latar netral, aksen hijau, dan dekorasi terbatas.
- Dashboard memprioritaskan pekerjaan admin yang perlu ditindaklanjuti.
- Tabel untuk operasi; kartu untuk direktori; kalender dan daftar untuk editorial.
- Detail/edit di panel samping; navigasi bawah untuk ponsel.
- Status mempunyai label teks, kontrol berlabel, fokus keyboard, dialog native, dan dukungan reduced motion.

## Batas tahap ini

Ini prototipe desain, belum pengganti aplikasi produksi. Belum ada autentikasi admin baru, integrasi Supabase/Storage, migrasi data, denda, laporan lintas periode, audit log, notifikasi, kalender berulang, atau unggah video. Data lokal tidak tersinkron antarperangkat dan bukan tempat penyimpanan data organisasi.

## Integrasi berikutnya

1. Satu akun admin memakai Supabase Auth; pendaftaran umum dinonaktifkan. RLS dan Storage policies memeriksa admin yang diizinkan, bukan hanya keberadaan sesi. Jangan menaruh password admin di frontend.
2. Pisahkan entitas `agents` dari `auth.users`. Pertahankan profil agen sebagai entitas tanpa akun. Petakan nama pada data lama ke ID dengan pemeriksaan duplikasi.
3. Tambahkan tabel jadwal bertanggal, kehadiran, konten, dan media melalui migrasi. Operasi penting memakai validasi server, unique constraints, serta catatan perubahan.
4. Ganti penyimpanan demo dengan Supabase dan Storage. Simpan waktu terjadwal dengan zona waktu yang konsisten; tampilkan WIB.
5. Validasi alur terhadap data staging sebelum mengubah halaman produksi atau deployment.

## Pengujian browser

Dengan server lokal berjalan, Python Playwright dan Chromium tersedia:

```bash
python3 prototype/tests/smoke.py
```

Opsi: `--base-url` untuk alamat server uji dan `--screenshots` untuk direktori hasil. Setiap pengujian memakai browser context baru; tidak mengubah database. Mencakup tambah/edit agen, foto, persistensi, jadwal bertanggal, absensi, pembuatan/edit/hapus konten, validasi tautan, dan empat layar mobile tanpa overflow horizontal. Tanggal uji mengikuti bulan berikutnya secara dinamis.
