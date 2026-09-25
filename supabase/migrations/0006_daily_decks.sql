-- Mazo del día congelado: se arma una vez por día local para que recargar no lo baraje.
create table public.daily_decks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  local_day date not null,
  lesson_ids uuid[] not null,
  created_at timestamptz not null default now(),
  primary key (user_id, local_day)
);
alter table public.daily_decks enable row level security;
create policy daily_decks_select_own on public.daily_decks for select to authenticated using (user_id = auth.uid());
