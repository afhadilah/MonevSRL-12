# CLAUDE.md — MONEVSRL

## Project Overview

MONEVSRL adalah SRL Monitoring Dashboard untuk membantu mahasiswa memantau progress SRL 1 sampai SRL 9, mengunggah evidence, melihat deadline, dan menerima feedback dari mentor. Aplikasi ini juga memiliki mentor dashboard untuk melihat progress mahasiswa, submission queue, approval history, dan mahasiswa yang belum submit evidence.

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Supabase PostgreSQL
- Authentication: Supabase Auth
- Storage: Supabase Storage
- Hosting: Netlify
- Version Control: GitHub

## Project Structure

- `index.html`: struktur halaman website
- `style.css`: seluruh styling, responsive layout, dashboard UI
- `app.js`: logic aplikasi, auth, Supabase queries, upload evidence, mentor review
- `config.js`: Supabase URL dan anon public key
- `supabase-schema-fixed.sql`: schema database, RLS policies, dan storage policy
- `netlify.toml`: konfigurasi deployment Netlify
- `README.md`: dokumentasi project
- `PRD.md`: product requirements
- `TASKS.md`: daftar task development
- `SECURITY-AUDIT.md`: audit keamanan
- `DEMO_VIDEO_SCRIPT.md`: script demo video 2 menit

## Coding Conventions

- Gunakan nama variable yang jelas dan deskriptif.
- Jangan memakai nama variable ambigu seperti `x`, `temp`, atau `data` jika konteksnya tidak jelas.
- Setiap async function harus memakai try-catch atau error handling yang jelas.
- Tampilkan error kepada user dengan toast.
- Jangan mengubah struktur database tanpa memperbarui `supabase-schema-fixed.sql`.
- Jangan menambah dependency eksternal jika tidak diperlukan.
- Semua fitur harus tetap responsive untuk desktop dan mobile.

## Design Guidelines

- Brand name: MONEVSRL
- Style: clean, modern, dashboard-like, edukatif, profesional
- Warna utama: biru, putih, navy, soft gray
- Layout: card-based dashboard
- Font: system UI stack
- Gunakan spacing yang konsisten
- Pastikan sidebar, dashboard, form, dan mentor panel tetap terbaca di mobile

## Supabase Guidelines

- Gunakan Supabase anon public key saja di frontend.
- Jangan pernah memakai service_role key di frontend.
- Tabel utama:
  - profiles
  - stages
  - submissions
  - activities
- Storage bucket utama:
  - evidence
- Row Level Security wajib aktif.
- Student hanya boleh mengakses datanya sendiri.
- Mentor dapat melihat data student untuk kebutuhan review.

## Do's

- DO gunakan Plan Mode sebelum perubahan besar.
- DO baca rencana AI sebelum approve.
- DO test register, login, upload evidence, mentor review setelah perubahan besar.
- DO cek console browser setelah deploy.
- DO commit perubahan kecil dan sering.
- DO simpan screenshot milestone.

## Don'ts

- DON'T hardcode service role key.
- DON'T upload `.env` ke GitHub.
- DON'T mematikan RLS.
- DON'T membuat fitur besar sekaligus tanpa test.
- DON'T mengubah file yang sudah stabil tanpa alasan.
- DON'T memakai package yang tidak jelas.
- DON'T menghapus field database yang sudah dipakai frontend.

## Commands / Manual Workflow

Karena project ini static frontend, tidak wajib menjalankan build command.

Local preview:
- Buka `index.html` langsung di browser, atau
- Gunakan VS Code Live Server

Deploy:
- Upload folder project ke Netlify melalui Deploy manually

Supabase:
- Jalankan `supabase-schema-fixed.sql` di Supabase SQL Editor
- Isi `config.js` dengan Project URL dan anon public key

## Testing Checklist

- Register student dengan email `@binus.ac.id`
- Login student
- Upload evidence
- Cek status In Review
- Login mentor
- Review evidence
- Approve atau Revision Needed
- Login student kembali
- Cek feedback muncul
- Cek tampilan mobile
