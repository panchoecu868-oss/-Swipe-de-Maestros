-- Swipe de Maestros — esquema inicial.
-- Regla de seguridad: las tablas que alimentan el progreso, los días cumplidos y la garantía
-- (card_states, card_events, daily_log, discard_rounds, theme_weights, subscriptions, guarantee_*)
-- solo se escriben desde el servidor con la service role, después de validar la acción.
-- El usuario autenticado solo puede LEER sus filas. Así nadie se marca un descarte ganado desde la consola.

create extension if not exists pgcrypto;

-- ───────────────────────── Tipos ─────────────────────────
create type elo_source as enum ('fide', 'chesscom', 'lichess');
create type rating_platform as enum ('chesscom', 'lichess');
create type time_control as enum ('blitz', 'rapid');
create type lesson_type as enum ('apertura', 'estrategia', 'final');
create type card_status as enum ('new', 'learning', 'discarded', 'forced');
create type gesture as enum ('receive', 'discard', 'play');
create type gesture_outcome as enum ('pass', 'fail', 'win', 'loss', 'timeout', 'objective_met', 'objective_failed');
create type engine_objective as enum ('convert', 'draw', 'survive');
create type subscription_plan as enum ('monthly', 'yearly');
create type subscription_status as enum ('active', 'canceled', 'past_due', 'expired');

-- ───────────────────────── Usuario ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  fide_elo int check (fide_elo between 0 and 3000),
  declared_elo int check (declared_elo between 0 and 3500),
  elo_source elo_source,
  working_elo int check (working_elo between 1000 and 2200),
  platform rating_platform,
  platform_username text,
  time_control time_control,
  timezone text not null default 'UTC',
  onboarded_at timestamptz,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.repertoire (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  white_first text not null,
  black_vs_e4 text not null,
  black_vs_d4 text not null,
  updated_at timestamptz not null default now()
);

create table public.self_assessment (
  user_id uuid not null references public.profiles (id) on delete cascade,
  topic text not null,
  score smallint not null check (score between 1 and 5),
  primary key (user_id, topic)
);

create table public.theme_weights (
  user_id uuid not null references public.profiles (id) on delete cascade,
  theme text not null,
  weight real not null check (weight > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, theme)
);

-- ───────────────────────── Puzzles (Lichess, CC0) ─────────────────────────
-- Columnas según https://database.lichess.org/#puzzles
-- (fuente: github.com/lichess-org/database, web/index.html.tpl).
-- fen = posición ANTES de la jugada del rival; moves[1] (1-indexado en SQL) es la jugada del rival.
create table public.puzzles (
  id text primary key,
  fen text not null,
  moves text[] not null check (cardinality(moves) >= 2),
  rating int not null,
  rating_dev int not null,
  popularity smallint not null check (popularity between -100 and 100),
  nb_plays int not null,
  themes text[] not null default '{}',
  game_url text,
  opening_tags text[] not null default '{}',
  daily_date timestamptz
);
create index puzzles_themes_gin on public.puzzles using gin (themes);
create index puzzles_opening_tags_gin on public.puzzles using gin (opening_tags);
create index puzzles_rating_idx on public.puzzles (rating);

-- ───────────────────────── Libros y lecciones ─────────────────────────
create table public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  year int,
  license_note text not null,
  file_hash text not null unique,
  created_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  type lesson_type not null,
  title text not null,
  summary text not null,
  body text not null check (
    cardinality(regexp_split_to_array(btrim(body), '\s+')) <= 150
  ),
  fen text not null,
  lichess_themes text[] not null default '{}',
  opening_tags text[] not null default '{}',
  elo_min int not null default 1000,
  elo_max int not null default 2200,
  book_id uuid not null references public.books (id) on delete restrict,
  chapter text not null,
  page_start int not null,
  page_end int not null,
  reviewed boolean not null default false,
  rejected boolean not null default false,
  reviewer_notes text,
  generation_log jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (elo_min <= elo_max),
  check (page_start <= page_end),
  check (not (reviewed and rejected))
);
create index lessons_reviewed_idx on public.lessons (reviewed) where reviewed;
create index lessons_themes_gin on public.lessons using gin (lichess_themes);

-- ───────────────────────── Progreso por carta ─────────────────────────
create table public.card_states (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  status card_status not null default 'new',
  ef real not null default 2.5,
  interval_days int not null default 0,
  repetitions int not null default 0,
  due_on date,
  forced_until_seen boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index card_states_due_idx on public.card_states (user_id, due_on);

create table public.card_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  gesture gesture not null,
  outcome gesture_outcome not null,
  local_day date not null,
  created_at timestamptz not null default now()
);
create index card_events_user_day_idx on public.card_events (user_id, local_day);

create table public.discard_rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  theme text not null,
  puzzle_ids text[] not null,
  time_limit_ms int not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  elapsed_ms int,
  per_puzzle_ms int[],
  results jsonb,
  won boolean
);

create table public.checkpoint_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  puzzle_id text not null references public.puzzles (id),
  solved boolean not null,
  elapsed_ms int not null,
  created_at timestamptz not null default now()
);

create table public.engine_games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  start_fen text not null,
  objective engine_objective not null,
  target_plies int,
  engine_mode jsonb not null,
  pgn text not null default '',
  result text,
  objective_met boolean,
  created_at timestamptz not null default now()
);

create table public.daily_log (
  user_id uuid not null references public.profiles (id) on delete cascade,
  local_day date not null,
  cards_resolved int not null default 0,
  completed boolean not null default false,
  primary key (user_id, local_day)
);

-- ───────────────────────── Pagos y garantía ─────────────────────────
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  provider text not null,
  provider_membership_id text not null unique,
  provider_user_email text,
  plan subscription_plan,
  status subscription_status not null,
  current_period_end timestamptz,
  activated_at timestamptz,
  updated_at timestamptz not null default now(),
  raw jsonb not null default '{}'::jsonb
);
create index subscriptions_user_idx on public.subscriptions (user_id);

create table public.webhook_events (
  id text primary key,
  provider text not null,
  type text not null,
  received_at timestamptz not null default now(),
  payload jsonb not null
);

create table public.guarantee_enrollments (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  platform rating_platform not null,
  username text not null,
  time_control time_control not null,
  start_rating int not null,
  start_games int not null,
  started_at timestamptz not null,
  ends_at timestamptz not null,
  target_delta int not null
);

create table public.rating_snapshots (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  taken_at timestamptz not null default now(),
  rating int not null,
  games_count int not null,
  source_url text not null
);
create index rating_snapshots_user_idx on public.rating_snapshots (user_id, taken_at desc);

-- ───────────────────────── Helpers ─────────────────────────
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.has_active_subscription(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = uid and status = 'active'
      and (current_period_end is null or current_period_end > now())
  );
$$;

-- Perfil automático al registrarse (patrón estándar de Supabase Auth).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── RLS ─────────────────────────
alter table public.profiles enable row level security;
alter table public.repertoire enable row level security;
alter table public.self_assessment enable row level security;
alter table public.theme_weights enable row level security;
alter table public.puzzles enable row level security;
alter table public.books enable row level security;
alter table public.lessons enable row level security;
alter table public.card_states enable row level security;
alter table public.card_events enable row level security;
alter table public.discard_rounds enable row level security;
alter table public.checkpoint_attempts enable row level security;
alter table public.engine_games enable row level security;
alter table public.daily_log enable row level security;
alter table public.subscriptions enable row level security;
alter table public.webhook_events enable row level security;
alter table public.guarantee_enrollments enable row level security;
alter table public.rating_snapshots enable row level security;

-- Datos editables por el propio usuario (onboarding).
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
-- is_admin no se puede auto-asignar: el WITH CHECK exige que siga igual al valor guardado.
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and is_admin = (select p.is_admin from public.profiles p where p.id = auth.uid()));

create policy repertoire_rw_own on public.repertoire for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy self_assessment_rw_own on public.self_assessment for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Solo lectura propia (escritura vía service role tras validar en servidor).
create policy theme_weights_select_own on public.theme_weights for select to authenticated using (user_id = auth.uid());
create policy card_states_select_own on public.card_states for select to authenticated using (user_id = auth.uid());
create policy card_events_select_own on public.card_events for select to authenticated using (user_id = auth.uid());
create policy discard_rounds_select_own on public.discard_rounds for select to authenticated using (user_id = auth.uid());
create policy checkpoint_select_own on public.checkpoint_attempts for select to authenticated using (user_id = auth.uid());
create policy engine_games_select_own on public.engine_games for select to authenticated using (user_id = auth.uid());
create policy daily_log_select_own on public.daily_log for select to authenticated using (user_id = auth.uid());
create policy subscriptions_select_own on public.subscriptions for select to authenticated using (user_id = auth.uid());
create policy guarantee_select_own on public.guarantee_enrollments for select to authenticated using (user_id = auth.uid());
create policy rating_snapshots_select_own on public.rating_snapshots for select to authenticated using (user_id = auth.uid());

-- Contenido.
create policy puzzles_read on public.puzzles for select to anon, authenticated using (true);
create policy books_read on public.books for select to authenticated using (true);
create policy lessons_read_reviewed on public.lessons for select to anon, authenticated
  using (reviewed or public.is_admin());
create policy lessons_admin_update on public.lessons for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- webhook_events: sin políticas → solo service role.
