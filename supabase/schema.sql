-- ============================================================
-- DETECTIVE MONDRAGÓN — SCHEMA COMPLETO
-- Correr en Supabase SQL Editor (una sola vez por proyecto).
-- Luego habilitar: Authentication → Providers → Anonymous → Enable.
-- ============================================================

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- 1. PROFILES (extensión 1:1 de auth.users)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  display_name         text,
  detective_rank       text default 'Aprendiz',
  total_score          integer default 0,
  cases_solved         integer default 0,
  hints_used_lifetime  integer default 0,
  opt_in_leaderboard   boolean default false,
  is_anonymous         boolean default true,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create or replace function public.tg_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.tg_touch_updated_at();

-- Auto-crear profile cuando nace un auth.user
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, is_anonymous)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', 'Detective Anónimo'),
    coalesce(new.is_anonymous, true)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- 2. CASE_COMPLETIONS (historial de partidas)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.case_completions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  case_id             text not null,
  score               integer not null check (score between 0 and 100),
  correct_accusation  boolean not null,
  accused_suspect     text,
  hints_used          integer default 0,
  clues_found         text[] default '{}',
  time_taken_seconds  integer,
  chapter_reached     integer default 4,
  completed_at        timestamptz default now()
);

create index if not exists idx_completions_user  on public.case_completions(user_id);
create index if not exists idx_completions_case  on public.case_completions(case_id);
create index if not exists idx_completions_score on public.case_completions(case_id, score desc);

-- ─────────────────────────────────────────────────────────────
-- 3. CASE_PROGRESS (partidas en curso, sync cross-device)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.case_progress (
  user_id     uuid not null references auth.users(id) on delete cascade,
  case_id     text not null,
  state       jsonb not null,
  updated_at  timestamptz default now(),
  primary key (user_id, case_id)
);

drop trigger if exists case_progress_touch on public.case_progress;
create trigger case_progress_touch
  before update on public.case_progress
  for each row execute function public.tg_touch_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 4. CASE_FEEDBACK (rating 1-5 + comment opcional)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.case_feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  case_id     text not null,
  rating      smallint check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- 5. RLS
-- ─────────────────────────────────────────────────────────────
alter table public.profiles          enable row level security;
alter table public.case_completions  enable row level security;
alter table public.case_progress     enable row level security;
alter table public.case_feedback     enable row level security;

drop policy if exists "profiles_own_select" on public.profiles;
create policy "profiles_own_select" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_own_update" on public.profiles;
create policy "profiles_own_update" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_public_leaderboard" on public.profiles;
create policy "profiles_public_leaderboard" on public.profiles
  for select using (opt_in_leaderboard = true);

drop policy if exists "completions_insert_own" on public.case_completions;
create policy "completions_insert_own" on public.case_completions
  for insert with check (auth.uid() = user_id);

drop policy if exists "completions_select_own" on public.case_completions;
create policy "completions_select_own" on public.case_completions
  for select using (auth.uid() = user_id);

drop policy if exists "progress_all_own" on public.case_progress;
create policy "progress_all_own" on public.case_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "feedback_insert" on public.case_feedback;
create policy "feedback_insert" on public.case_feedback
  for insert with check (auth.uid() = user_id or user_id is null);

-- ─────────────────────────────────────────────────────────────
-- 6. VIEWS — Leaderboard y analytics
-- ─────────────────────────────────────────────────────────────
create or replace view public.leaderboard as
select distinct on (cc.case_id, cc.user_id)
  cc.case_id,
  cc.user_id,
  p.display_name,
  p.detective_rank,
  cc.score,
  cc.hints_used,
  cc.time_taken_seconds,
  cc.completed_at
from public.case_completions cc
join public.profiles p on p.id = cc.user_id
where p.opt_in_leaderboard = true
  and cc.correct_accusation = true
order by cc.case_id, cc.user_id, cc.score desc;

grant select on public.leaderboard to anon, authenticated;

create or replace view public.clue_stats as
select
  case_id,
  unnest(clues_found) as clue_key,
  count(*) as times_found,
  count(*) * 100.0 / sum(count(*)) over (partition by case_id) as pct
from public.case_completions
group by case_id, clue_key;

create or replace view public.accusation_stats as
select
  case_id,
  accused_suspect,
  count(*) as accusation_count,
  sum(case when correct_accusation then 1 else 0 end) as correct_count,
  round(100.0 * sum(case when correct_accusation then 1 else 0 end) / count(*), 1) as accuracy_pct
from public.case_completions
where accused_suspect is not null
group by case_id, accused_suspect;
