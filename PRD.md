# PRD: MONEVSRL - SRL Monitoring Dashboard

## 1. Problem Statement

Mahasiswa sering kesulitan memantau progress pengerjaan SRL 1 sampai SRL 9 karena informasi mengenai status evidence, deadline, dan feedback mentor tidak terpusat dalam satu sistem yang mudah dibaca. Akibatnya, mahasiswa bisa terlambat mengunggah evidence, tidak mengetahui status review terbaru, atau bingung bagian mana yang harus diperbaiki.

Di sisi lain, mentor membutuhkan sistem monitoring yang lebih ringkas untuk melihat progress setiap mahasiswa, evidence yang sedang menunggu review, riwayat approval/revision, serta mahasiswa yang belum mengumpulkan evidence. Tanpa dashboard yang terstruktur, proses review menjadi kurang efisien dan sulit dipantau secara menyeluruh.

## 2. Target User

### Primer
Mahasiswa yang sedang mengerjakan MONEV/SRL dan perlu memantau progress SRL 1 sampai SRL 9, mengunggah evidence, serta menerima feedback dari mentor.

### Sekunder
Mentor atau pembimbing yang bertugas memantau progress mahasiswa, mengecek evidence, memberi feedback, melakukan approval, dan meminta revisi bila evidence belum sesuai.

## 3. User Stories

1. Sebagai mahasiswa, saya ingin melihat progress SRL 1 sampai SRL 9 dalam satu dashboard, supaya saya mengetahui tahap mana yang sudah selesai, sedang direview, atau belum dikerjakan.
2. Sebagai mahasiswa, saya ingin mengunggah evidence untuk setiap SRL, supaya mentor dapat melakukan review terhadap bukti pengerjaan saya.
3. Sebagai mahasiswa, saya ingin melihat feedback dan status review dari mentor, supaya saya tahu apakah evidence saya sudah approved atau perlu revisi.
4. Sebagai mentor, saya ingin melihat daftar mahasiswa beserta progress SRL mereka, supaya saya bisa memantau siapa yang sudah submit, siapa yang menunggu review, dan siapa yang belum mengumpulkan evidence.
5. Sebagai mentor, saya ingin memberi status Approved, Revision Needed, atau In Review pada evidence mahasiswa, supaya proses monitoring dan feedback menjadi lebih terstruktur.

## 4. Features MVP

### 1. Authentication Student dan Mentor
User dapat register dan login menggunakan email dengan domain `@binus.ac.id`. Sistem memiliki dua role utama: Student dan Mentor. Role Student digunakan untuk upload evidence dan melihat progress, sedangkan role Mentor digunakan untuk monitoring dan review.

Tidak termasuk dalam MVP:
- Login SSO resmi
- Reset password custom
- Verifikasi NIM otomatis

### 2. Student Dashboard
Mahasiswa dapat melihat ringkasan progress SRL dalam bentuk angka, progress bar, status SRL, activity timeline, dan deadline terdekat.

Tidak termasuk dalam MVP:
- Analytics lanjutan
- Export laporan student
- Notifikasi email otomatis

### 3. Upload Evidence
Mahasiswa dapat memilih SRL stage, mengisi judul evidence, memilih file, menambahkan catatan, lalu mengirim evidence ke mentor. File tersimpan di Supabase Storage dan data submission tersimpan di Supabase Database.

Tidak termasuk dalam MVP:
- Validasi isi dokumen otomatis
- Upload multi-file dalam satu submission
- OCR atau AI document checking

### 4. Review & Feedback
Mahasiswa dapat melihat status evidence seperti Approved, In Review, Revision Needed, In Progress, dan Not Started. Feedback mentor juga ditampilkan di halaman Review & Feedback.

Tidak termasuk dalam MVP:
- Diskusi komentar dua arah
- Chat real-time
- Push notification

### 5. Mentor Dashboard
Mentor dapat melihat ringkasan jumlah mahasiswa, pending review, approved stages, mahasiswa yang belum submit, progress report, submission queue, approval history, dan deadline watch. Mentor juga dapat melakukan quick approve/revision serta memberi feedback manual.

Tidak termasuk dalam MVP:
- Dashboard multi-mentor kompleks
- Export Excel/PDF
- Notifikasi otomatis ke mahasiswa

## 5. Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend/Database: Supabase PostgreSQL
- Authentication: Supabase Auth
- File Storage: Supabase Storage
- Hosting: Netlify
- Version Control: GitHub
- AI Tools: ChatGPT untuk ideasi, debugging, dokumentasi, dan pengembangan website

## 6. Success Metrics

1. Minimal 3 akun student dapat register, login, dan melihat dashboard masing-masing.
2. Student dapat mengunggah minimal 1 evidence ke Supabase Storage.
3. Mentor dapat melihat submission student di dashboard mentor.
4. Mentor dapat mengubah status evidence menjadi Approved atau Revision Needed.
5. Feedback mentor berhasil muncul di halaman Review & Feedback milik student.
6. Website dapat diakses melalui live URL Netlify.
7. Tidak ada error fatal saat alur utama diuji: register, login, upload evidence, review mentor, logout.
8. Data student tidak tercampur dengan data student lain karena Row Level Security aktif.

## 7. Out of Scope

- Integrasi SSO resmi
- Mobile app native Android/iOS
- Chat real-time antara mentor dan mahasiswa
- Notifikasi WhatsApp atau email otomatis
- Payment gateway
- Multi-language
- AI document scoring
- Export laporan PDF/Excel
- Dashboard admin super kompleks
- Integrasi kalender eksternal
- Sistem penilaian otomatis berbasis rubrik

## 8. Future Roadmap

1. Export progress report ke PDF.
2. Notifikasi email saat mentor memberi feedback.
3. Reminder otomatis sebelum deadline.
4. Admin dashboard untuk melihat seluruh mentor dan student.
5. Integrasi Google Calendar.
6. Sistem komentar antara student dan mentor.
7. AI assistant untuk mengecek kelengkapan evidence.
8. Analytics visual untuk performa mahasiswa.
