-- Jalankan semua SQL ini di Supabase SQL Editor.
-- Setelah itu buat bucket Storage bernama: evidence
-- Untuk demo mudah, buat bucket evidence menjadi PUBLIC.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null default 'student' check (role in ('student', 'mentor', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.stages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stage_number int not null check (stage_number between 1 and 9),
  title text not null,
  description text not null,
  status text not null default 'Not Started' check (status in ('Approved', 'In Review', 'In Progress', 'Revision Needed', 'Not Started')),
  file_name text,
  file_path text,
  file_url text,
  feedback text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(user_id, stage_number)
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stage_id uuid not null references public.stages(id) on delete cascade,
  title text not null,
  notes text,
  file_name text,
  file_path text,
  file_url text,
  status text not null default 'In Review' check (status in ('Approved', 'In Review', 'Revision Needed')),
  created_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'system',
  title text not null,
  subtitle text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.stages enable row level security;
alter table public.submissions enable row level security;
alter table public.activities enable row level security;

drop policy if exists "profiles select own or mentor" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "stages select own or mentor" on public.stages;
drop policy if exists "stages insert own" on public.stages;
drop policy if exists "stages update own or mentor" on public.stages;
drop policy if exists "submissions select own or mentor" on public.submissions;
drop policy if exists "submissions insert own" on public.submissions;
drop policy if exists "submissions update mentor" on public.submissions;
drop policy if exists "activities select own or mentor" on public.activities;
drop policy if exists "activities insert own or mentor" on public.activities;

create policy "profiles select own or mentor"
on public.profiles for select
using (
  auth.uid() = id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('mentor', 'admin')
  )
);

create policy "profiles insert own"
on public.profiles for insert
with check (auth.uid() = id);

create policy "profiles update own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "stages select own or mentor"
on public.stages for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('mentor', 'admin')
  )
);

create policy "stages insert own"
on public.stages for insert
with check (auth.uid() = user_id);

create policy "stages update own or mentor"
on public.stages for update
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('mentor', 'admin')
  )
);

create policy "submissions select own or mentor"
on public.submissions for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('mentor', 'admin')
  )
);

create policy "submissions insert own"
on public.submissions for insert
with check (auth.uid() = user_id);

create policy "submissions update mentor"
on public.submissions for update
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('mentor', 'admin')
  )
);

create policy "activities select own or mentor"
on public.activities for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('mentor', 'admin')
  )
);

create policy "activities insert own or mentor"
on public.activities for insert
with check (
  auth.uid() = user_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('mentor', 'admin')
  )
);

-- Storage policies untuk bucket public "evidence".
-- Jika muncul error karena bucket belum ada, buat bucket evidence dulu di Storage, lalu jalankan bagian ini lagi.

insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', true)
on conflict (id) do update set public = true;

drop policy if exists "evidence read all authenticated" on storage.objects;
drop policy if exists "evidence upload own folder" on storage.objects;
drop policy if exists "evidence update own folder" on storage.objects;

create policy "evidence read all authenticated"
on storage.objects for select
using (bucket_id = 'evidence' and auth.role() = 'authenticated');

create policy "evidence upload own folder"
on storage.objects for insert
with check (
  bucket_id = 'evidence'
  and auth.role() = 'authenticated'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "evidence update own folder"
on storage.objects for update
using (
  bucket_id = 'evidence'
  and auth.role() = 'authenticated'
  and split_part(name, '/', 1) = auth.uid()::text
);
