-- =========================================================
-- SRL MONITORING DASHBOARD
-- SUPABASE SCHEMA FIXED V3
-- Fix order: drop old policies BEFORE dropping public.current_user_role()
-- Netlify + Supabase
-- =========================================================

create extension if not exists "pgcrypto";

-- =========================================================
-- 1. TABLES
-- =========================================================

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
  status text not null default 'Not Started' check (
    status in ('Approved', 'In Review', 'In Progress', 'Revision Needed', 'Not Started')
  ),
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
  status text not null default 'In Review' check (
    status in ('Approved', 'In Review', 'Revision Needed')
  ),
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

-- =========================================================
-- 2. ENABLE ROW LEVEL SECURITY
-- =========================================================

alter table public.profiles enable row level security;
alter table public.stages enable row level security;
alter table public.submissions enable row level security;
alter table public.activities enable row level security;

-- =========================================================
-- 3. DROP OLD POLICIES FIRST
-- Harus dilakukan sebelum drop public.current_user_role().
-- =========================================================

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

-- =========================================================
-- 4. PRIVATE ROLE FUNCTION
-- Function dipindahkan ke schema private agar tidak exposed di /rest/v1/rpc.
-- =========================================================

create schema if not exists private;

drop function if exists public.current_user_role();

create or replace function private.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

revoke all on function private.current_user_role() from public;
revoke all on function private.current_user_role() from anon;
revoke all on function private.current_user_role() from authenticated;

grant usage on schema private to authenticated;
grant execute on function private.current_user_role() to authenticated;

-- =========================================================
-- 5. PROFILES POLICIES
-- =========================================================

create policy "profiles select own or mentor"
on public.profiles for select
using (
  auth.uid() = id
  or private.current_user_role() in ('mentor', 'admin')
);

create policy "profiles insert own"
on public.profiles for insert
with check (
  auth.uid() = id
);

create policy "profiles update own"
on public.profiles for update
using (
  auth.uid() = id
)
with check (
  auth.uid() = id
);

-- =========================================================
-- 6. STAGES POLICIES
-- =========================================================

create policy "stages select own or mentor"
on public.stages for select
using (
  auth.uid() = user_id
  or private.current_user_role() in ('mentor', 'admin')
);

create policy "stages insert own"
on public.stages for insert
with check (
  auth.uid() = user_id
);

create policy "stages update own or mentor"
on public.stages for update
using (
  auth.uid() = user_id
  or private.current_user_role() in ('mentor', 'admin')
)
with check (
  auth.uid() = user_id
  or private.current_user_role() in ('mentor', 'admin')
);

-- =========================================================
-- 7. SUBMISSIONS POLICIES
-- =========================================================

create policy "submissions select own or mentor"
on public.submissions for select
using (
  auth.uid() = user_id
  or private.current_user_role() in ('mentor', 'admin')
);

create policy "submissions insert own"
on public.submissions for insert
with check (
  auth.uid() = user_id
);

create policy "submissions update mentor"
on public.submissions for update
using (
  private.current_user_role() in ('mentor', 'admin')
)
with check (
  private.current_user_role() in ('mentor', 'admin')
);

-- =========================================================
-- 8. ACTIVITIES POLICIES
-- =========================================================

create policy "activities select own or mentor"
on public.activities for select
using (
  auth.uid() = user_id
  or private.current_user_role() in ('mentor', 'admin')
);

create policy "activities insert own or mentor"
on public.activities for insert
with check (
  auth.uid() = user_id
  or private.current_user_role() in ('mentor', 'admin')
);

-- =========================================================
-- 9. STORAGE BUCKET
-- =========================================================

insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', true)
on conflict (id) do update set public = true;

-- =========================================================
-- 10. STORAGE POLICIES
-- =========================================================

drop policy if exists "evidence read all authenticated" on storage.objects;
drop policy if exists "evidence upload own folder" on storage.objects;
drop policy if exists "evidence update own folder" on storage.objects;
drop policy if exists "evidence delete own folder" on storage.objects;

create policy "evidence read all authenticated"
on storage.objects for select
using (
  bucket_id = 'evidence'
  and auth.role() = 'authenticated'
);

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
)
with check (
  bucket_id = 'evidence'
  and auth.role() = 'authenticated'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "evidence delete own folder"
on storage.objects for delete
using (
  bucket_id = 'evidence'
  and auth.role() = 'authenticated'
  and split_part(name, '/', 1) = auth.uid()::text
);
