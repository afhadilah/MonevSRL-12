# SECURITY-AUDIT.md — MONEVSRL

## Audit Scope

Security audit ini dilakukan untuk aplikasi MONEVSRL, yaitu web app berbasis HTML, CSS, JavaScript, Supabase, dan Netlify. Fokus audit adalah keamanan dasar sesuai kebutuhan MVP dan assignment.

## 1. API Key / Secret Check

Status: PASS

Aplikasi hanya menggunakan Supabase anon public key di frontend. Anon public key memang digunakan untuk client-side app dan dikontrol oleh Row Level Security.

Tidak boleh ada:
- service_role key
- database password
- private key
- `.env`
- `.env.local`

Catatan:
Jika service_role key pernah terupload, key harus langsung di-rotate dari Supabase Dashboard.

## 2. Row Level Security

Status: PASS

RLS digunakan pada tabel:
- profiles
- stages
- submissions
- activities

Policy dibuat agar:
- Student hanya dapat mengakses data miliknya sendiri.
- Mentor dapat melihat data student untuk kebutuhan review.
- Insert dan update dibatasi berdasarkan user login dan role.

## 3. Authentication

Status: PASS

Authentication menggunakan Supabase Auth.

Fitur:
- Register
- Login
- Logout
- Role student
- Role mentor
- Validasi email `@binus.ac.id`
- Mentor Code untuk membuat akun mentor

## 4. Storage Security

Status: PASS WITH NOTE

File evidence disimpan di Supabase Storage bucket `evidence`.

Catatan:
Bucket dibuat public untuk kebutuhan demo agar mentor dapat membuka file evidence. Untuk production yang lebih serius, bucket dapat dibuat private dan file dibuka melalui signed URL.

## 5. SQL Injection

Status: LOW RISK

Frontend menggunakan Supabase JavaScript Client, bukan raw SQL dari input user. Query dilakukan menggunakan method Supabase seperti `.select()`, `.insert()`, dan `.update()`.

## 6. XSS

Status: LOW RISK

Aplikasi tidak menggunakan `dangerouslySetInnerHTML`. Input user ditampilkan dalam layout dashboard sebagai teks di HTML template. Untuk production lebih serius, sanitasi input tambahan dapat ditambahkan.

## 7. Role Access

Status: PASS

Role disimpan di tabel profiles. Mentor dapat mengakses mentor dashboard, student menggunakan student dashboard.

## 8. Known Limitations

- Belum memakai SSO resmi.
- Belum memakai email notification.
- Belum memakai signed URL untuk evidence private.
- Belum memakai backend server khusus.
- Belum ada audit otomatis dependency karena project ini tidak memakai npm package lokal.

## 9. Final Result

Tidak ditemukan issue Critical atau High untuk kebutuhan demo MVP.

Kesimpulan:
Aplikasi aman untuk kebutuhan tugas, demo, dan deployment MVP selama service_role key tidak pernah dimasukkan ke frontend atau GitHub.
