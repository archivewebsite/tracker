-- Run this file once in Supabase SQL Editor.
-- It creates private per-user tracker storage with Row Level Security.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  university text,
  study_program text,
  logo_url text,
  theme jsonb not null default '{
    "name": "Minimal",
    "background": "#f7f7f4",
    "surface": "#ffffff",
    "surfaceStrong": "#eef0ec",
    "text": "#20231f",
    "muted": "#6e746c",
    "primary": "#466653",
    "accent": "#71796f",
    "success": "#47765c",
    "warning": "#8a6d3b",
    "graphA": "#466653",
    "graphB": "#68798a",
    "graphC": "#9a8054"
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checklist_states (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  field text not null check (field in ('belajar', 'latsol', 'review')),
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id, field)
);

create table if not exists public.tryout_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_no integer not null check (entry_no between 1 and 100),
  tanggal date,
  platform text,
  pu numeric(7,2) check (pu is null or (pu >= 0 and pu <= 1200)),
  pbm numeric(7,2) check (pbm is null or (pbm >= 0 and pbm <= 1200)),
  ppu numeric(7,2) check (ppu is null or (ppu >= 0 and ppu <= 1200)),
  pk numeric(7,2) check (pk is null or (pk >= 0 and pk <= 1200)),
  lbi numeric(7,2) check (lbi is null or (lbi >= 0 and lbi <= 1200)),
  lbe numeric(7,2) check (lbe is null or (lbe >= 0 and lbe <= 1200)),
  pm numeric(7,2) check (pm is null or (pm >= 0 and pm <= 1200)),
  average_score numeric(7,2) check (average_score is null or (average_score >= 0 and average_score <= 1200)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, entry_no)
);

alter table public.profiles enable row level security;
alter table public.checklist_states enable row level security;
alter table public.tryout_entries enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;

create policy "profiles_select_own"
  on public.profiles for select
  using ((select auth.uid()) = user_id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check ((select auth.uid()) = user_id);

create policy "profiles_update_own"
  on public.profiles for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "profiles_delete_own"
  on public.profiles for delete
  using ((select auth.uid()) = user_id);

drop policy if exists "checklist_select_own" on public.checklist_states;
drop policy if exists "checklist_insert_own" on public.checklist_states;
drop policy if exists "checklist_update_own" on public.checklist_states;
drop policy if exists "checklist_delete_own" on public.checklist_states;

create policy "checklist_select_own"
  on public.checklist_states for select
  using ((select auth.uid()) = user_id);

create policy "checklist_insert_own"
  on public.checklist_states for insert
  with check ((select auth.uid()) = user_id);

create policy "checklist_update_own"
  on public.checklist_states for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "checklist_delete_own"
  on public.checklist_states for delete
  using ((select auth.uid()) = user_id);

drop policy if exists "tryout_select_own" on public.tryout_entries;
drop policy if exists "tryout_insert_own" on public.tryout_entries;
drop policy if exists "tryout_update_own" on public.tryout_entries;
drop policy if exists "tryout_delete_own" on public.tryout_entries;

create policy "tryout_select_own"
  on public.tryout_entries for select
  using ((select auth.uid()) = user_id);

create policy "tryout_insert_own"
  on public.tryout_entries for insert
  with check ((select auth.uid()) = user_id);

create policy "tryout_update_own"
  on public.tryout_entries for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "tryout_delete_own"
  on public.tryout_entries for delete
  using ((select auth.uid()) = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    user_id,
    display_name,
    university,
    study_program,
    logo_url,
    theme
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    case
      when lower(new.email) = 'unvermicular@gmail.com'
        then 'Bandung Institute of Technology'
      else null
    end,
    case
      when lower(new.email) = 'unvermicular@gmail.com'
        then 'School of Electrical Engineering and Informatics'
      else null
    end,
    case
      when lower(new.email) = 'unvermicular@gmail.com'
        then null
      else null
    end,
    case
      when lower(new.email) = 'unvermicular@gmail.com'
        then '{
          "name": "Bandung Institute of Technology",
          "background": "#f4f8ff",
          "surface": "#ffffff",
          "surfaceStrong": "#e8f1ff",
          "text": "#162033",
          "muted": "#687186",
          "primary": "#3f7fc4",
          "accent": "#f0b66d",
          "success": "#55a783",
          "warning": "#d79a4a",
          "graphA": "#3f7fc4",
          "graphB": "#55a783",
          "graphC": "#f0b66d"
        }'::jsonb
      else '{
        "name": "Minimal",
        "background": "#f7f7f4",
        "surface": "#ffffff",
        "surfaceStrong": "#eef0ec",
        "text": "#20231f",
        "muted": "#6e746c",
        "primary": "#466653",
        "accent": "#71796f",
        "success": "#47765c",
        "warning": "#8a6d3b",
        "graphA": "#466653",
        "graphB": "#68798a",
        "graphC": "#9a8054"
      }'::jsonb
    end
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (
  user_id,
  display_name,
  university,
  study_program,
  logo_url,
  theme
)
select
  users.id,
  coalesce(users.raw_user_meta_data ->> 'display_name', ''),
  case
    when lower(users.email) = 'unvermicular@gmail.com'
      then 'Bandung Institute of Technology'
    else null
  end,
  case
    when lower(users.email) = 'unvermicular@gmail.com'
      then 'School of Electrical Engineering and Informatics'
    else null
  end,
  case
    when lower(users.email) = 'unvermicular@gmail.com'
      then null
    else null
  end,
  case
    when lower(users.email) = 'unvermicular@gmail.com'
      then '{
        "name": "Bandung Institute of Technology",
        "background": "#f4f8ff",
        "surface": "#ffffff",
        "surfaceStrong": "#e8f1ff",
        "text": "#162033",
        "muted": "#687186",
        "primary": "#3f7fc4",
        "accent": "#f0b66d",
        "success": "#55a783",
        "warning": "#d79a4a",
        "graphA": "#3f7fc4",
        "graphB": "#55a783",
        "graphC": "#f0b66d"
      }'::jsonb
    else '{
      "name": "Minimal",
      "background": "#f7f7f4",
      "surface": "#ffffff",
      "surfaceStrong": "#eef0ec",
      "text": "#20231f",
      "muted": "#6e746c",
      "primary": "#466653",
      "accent": "#71796f",
      "success": "#47765c",
      "warning": "#8a6d3b",
      "graphA": "#466653",
      "graphB": "#68798a",
      "graphC": "#9a8054"
    }'::jsonb
  end
from auth.users
on conflict (user_id) do update set
  university = coalesce(nullif(public.profiles.university, ''), excluded.university),
  study_program = coalesce(nullif(public.profiles.study_program, ''), excluded.study_program),
  logo_url = coalesce(nullif(public.profiles.logo_url, ''), excluded.logo_url),
  theme = case
    when public.profiles.theme = '{}'::jsonb then excluded.theme
    else public.profiles.theme
  end,
  updated_at = now();
