# MONEVSRL - SRL Monitoring Dashboard

MONEVSRL adalah aplikasi web untuk membantu mahasiswa memantau progress SRL 1 sampai SRL 9, mengunggah evidence, melihat deadline, serta menerima feedback dari mentor. Aplikasi ini juga menyediakan dashboard mentor untuk melihat progress mahasiswa, submission queue, approval history, dan mahasiswa yang belum submit evidence.

## Live Website

Isi dengan link Netlify terakhir kamu:

```text
https://monevsrlkel12.netlify.app/
```

## GitHub Repository

Isi setelah repository dibuat:

```text

```

## Main Features

### Student
- Register dan login menggunakan email `@binus.ac.id`
- Melihat progress SRL 1 sampai SRL 9
- Upload evidence
- Melihat status review
- Melihat feedback mentor
- Melihat calendar dan deadline

### Mentor
- Melihat total students
- Melihat pending review
- Melihat approved stages
- Melihat mahasiswa yang belum submit
- Melihat progress report
- Melihat submission queue
- Quick approve / revision
- Memberikan feedback manual
- Melihat approval history

## Tech Stack

- HTML
- CSS
- JavaScript
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- Netlify
- GitHub

## Database Tables

- `profiles`
- `stages`
- `submissions`
- `activities`

## Storage Bucket

- `evidence`

## Setup Supabase

1. Buat Supabase project.
2. Buka SQL Editor.
3. Jalankan file `supabase-schema-fixed.sql`.
4. Buka Authentication → Providers → Email.
5. Aktifkan Email Provider.
6. Untuk demo, matikan Confirm Email.
7. Buka Storage dan pastikan bucket `evidence` ada.

## Setup Website

1. Buka file `config.js`.
2. Isi:

```js
const SUPABASE_URL = "https://PROJECT_ID_KAMU.supabase.co";
const SUPABASE_ANON_KEY = "ANON_PUBLIC_KEY_KAMU";
```

3. Simpan file.
4. Upload folder project ke Netlify.

## Demo Accounts

Isi setelah kamu membuat akun demo:

### Student
```text
Email: student1@binus.ac.id
Password: 123456
```

### Mentor
```text
Email: mentor@binus.ac.id
Password: 123456
```

## Documentation

- `PRD.md`
- `CLAUDE.md`
- `TASKS.md`
- `SECURITY-AUDIT.md`
- `DEMO_VIDEO_SCRIPT.md`
- `REFLECTION.md`
