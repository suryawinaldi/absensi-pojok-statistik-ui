# Membuat username dan password admin

Web meminta **username + password**. Email tetap dipakai oleh Supabase Auth sebagai identitas internal dan untuk pengelolaan akun. Pemetaan username ke email dilakukan di server Vercel; email tidak perlu diketik di form login. Setelah berhasil login, informasi akun di sesi Supabase tetap dapat dibaca oleh admin yang bersangkutan.

Tidak ada username/password bawaan yang aktif. Memilih `adminpojokui` di konfigurasi tidak otomatis membuat akun Supabase.

## 1. Buat satu akun Supabase Auth

1. Buka proyek Supabase yang dipakai website.
2. Pilih **Authentication → Users → Add user → Create new user**.
3. Isi email yang kamu kuasai, sebaiknya email organisasi. Contoh di dokumentasi bukan alamat yang harus dipakai.
4. Tentukan password sendiri, disarankan minimal 12 karakter dan unik. Simpan di pengelola password; jangan masukkan ke kode, SQL, atau chat.
5. Aktifkan **Auto Confirm User**, kemudian buat akun.
6. Salin **User UID** akun tersebut.

Email ini harus akun Auth, bukan hanya entri di tabel agen. Agen tidak perlu dibuatkan akun.

## 2. Aktifkan akses admin di database

Jika database workspace belum disiapkan, jalankan [migrasi workspace](../supabase/migrations/202610230001_admin_workspace.sql) satu kali melalui **SQL Editor**. Jika sudah diterapkan, jangan jalankan ulang migrasi pertama. Gunakan [pemeriksaan metadata](../supabase/verify_workspace.sql) untuk memeriksa kondisi tabel tanpa mengubah data.

Daftarkan UID dari langkah pertama:

```sql
insert into public.ps_admin (user_id)
values ('GANTI_DENGAN_USER_UID_DARI_AUTH_USERS');
```

SQL ini tidak membuat password; password sudah dibuat melalui Supabase Auth. Tabel hanya mengizinkan satu admin. Jika ada error karena admin sudah terdaftar, periksa baris yang ada terlebih dahulu. Jangan menghapus/mengganti admin lama secara otomatis.

Nonaktifkan pendaftaran pengguna umum di pengaturan Auth. Akses workspace tetap ditentukan oleh UID dalam `ps_admin`, bukan sekadar keberadaan akun Auth.

## 3. Pilih username melalui Vercel

Buka **proyek Vercel → Settings → Environment Variables**, lalu tambahkan untuk lingkungan **Production**:

| Nama variabel    | Isi                                                   |
| ---------------- | ----------------------------------------------------- |
| `ADMIN_USERNAME` | Username pilihanmu, misalnya `adminpojokui`           |
| `ADMIN_EMAIL`    | Email persis dari akun Supabase Auth yang dibuat tadi |

Username: 3–32 karakter, huruf, angka, titik, garis bawah, atau tanda minus. Huruf besar/kecil dianggap sama. Gunakan `ADMIN_USERNAME`, bukan `PUBLIC_ADMIN_USERNAME`.

**Jangan menambahkan password ke Vercel.** Server hanya meneruskan password yang dimasukkan saat login ke Supabase untuk diverifikasi. Tidak perlu service-role key.

Jika proyek Supabase berbeda dari konfigurasi repository, set juga `PUBLIC_SUPABASE_URL` dan `PUBLIC_SUPABASE_ANON_KEY` untuk proyek yang sama. Ini konfigurasi publik, bukan password akun. Server dan browser harus menunjuk proyek yang sama.

Setelah menyimpan variabel, lakukan **Redeploy** deployment terbaru yang sudah memuat endpoint `/api/admin-login`. Perubahan variabel tidak berlaku pada deployment lama secara otomatis.

## 4. Masuk ke web

- **Username:** nilai `ADMIN_USERNAME`, misalnya `adminpojokui`.
- **Password:** password yang kamu buat pada langkah 1.

Tidak perlu memasukkan email di form. Mengganti username dilakukan lewat variabel Vercel dan redeploy. Mengubah password dilakukan melalui pengelolaan akun Supabase, bukan dengan mengedit JavaScript. Alur pemulihan password melalui email belum tersedia dalam UI workspace.

## Jika login gagal

| Pesan                                    | Yang diperiksa                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| Login admin belum dikonfigurasi          | Dua variabel `ADMIN_USERNAME` dan `ADMIN_EMAIL`, kemudian redeploy             |
| Username atau password tidak sesuai      | Username sesuai konfigurasi, password akun Auth, email terkonfirmasi           |
| Akun/database workspace belum diaktifkan | Migrasi tabel dan kebijakan akses di Supabase                                  |
| Akun belum terdaftar sebagai admin       | UID akun yang benar ada di `ps_admin`                                          |
| Terlalu banyak percobaan                 | Tunggu sebelum mencoba lagi; jangan mengulang terus-menerus                    |
| Endpoint login belum tersedia            | Gunakan deployment Vercel terbaru, atau `npm run dev` untuk pengembangan lokal |

## Catatan pengoperasian

Endpoint memeriksa keanggotaan admin sebelum mengembalikan sesi, tidak mengembalikan password/email penghubung, menolak metode selain POST, dan memakai `Cache-Control: no-store`. SDK Supabase tetap mengelola token sesi dan RLS tetap berlaku.

Pembatas percobaan di kode bekerja per instance server dan bukan pembatas global antar-instance Vercel. Untuk pembatasan terdistribusi, tambahkan aturan rate limit untuk `/api/admin-login` melalui Vercel Firewall atau layanan pembatas terpusat. Batas bawaan Supabase Auth tetap berlaku.

Pengembangan lokal: jalankan `npm run dev`, bukan hanya server statis Python, karena login membutuhkan endpoint server. Untuk uji dengan akun nyata, buat `.env.local` yang diabaikan Git:

```dotenv
ADMIN_USERNAME=adminpojokui
ADMIN_EMAIL=email-yang-kamu-daftarkan
```

Password tetap diketik di form. Jangan menggunakan email contoh ini sebagai akun nyata.
