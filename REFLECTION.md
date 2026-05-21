# REFLECTION.md — MONEVSRL

## 1. Tantangan Teknis Terbesar

Tantangan teknis terbesar adalah menghubungkan frontend statis dengan backend Supabase agar fitur register, login, upload evidence, dan mentor review dapat berjalan seperti aplikasi nyata. Selain itu, Row Level Security perlu diatur agar data student tidak bocor ke user lain.

## 2. Cara Menyelesaikan Tantangan

Saya menggunakan Supabase untuk Authentication, PostgreSQL Database, dan Storage. Database dibuat dengan tabel profiles, stages, submissions, dan activities. Setelah itu, RLS policy dibuat untuk membatasi akses data berdasarkan user yang sedang login dan role user.

## 3. Kesalahan AI / Debugging yang Berkesan

Salah satu kendala adalah error pada policy Supabase seperti infinite recursion dan permission issue pada function role checking. Solusinya adalah memperbaiki urutan SQL, memindahkan function role checking ke schema private, dan menyesuaikan policy agar aman dan tetap bisa dipakai oleh authenticated user.

## 4. Hal yang Saya Pelajari

Saya belajar bahwa membuat aplikasi web bukan hanya soal tampilan, tetapi juga database, authentication, authorization, storage, deployment, dan security. Saya juga belajar pentingnya membuat fitur secara bertahap dan melakukan testing setelah setiap perubahan besar.

## 5. Rencana V2

Untuk versi berikutnya, saya ingin menambahkan:
- Export laporan progress ke PDF
- Notifikasi email untuk feedback mentor
- Reminder deadline otomatis
- Komentar dua arah antara mentor dan student
- Dashboard admin untuk seluruh kelas
- Integrasi Google Calendar
