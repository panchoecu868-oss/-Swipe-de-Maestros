-- El texto fuente del libro y los detalles de generación NO deben ser legibles por usuarios:
-- lessons es pública cuando reviewed=true, así que se separan a una tabla sin políticas (solo service role).
create table public.lesson_sources (
  lesson_id uuid primary key references public.lessons (id) on delete cascade,
  model text not null,
  position_source text not null,
  position_quote text not null,
  moves_san text[] not null default '{}',
  moves_uci text[] not null default '{}',
  start_fen text,
  source_pages_text text not null,
  generation jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.lesson_sources enable row level security;

alter table public.lessons drop column generation_log;
-- Evita duplicados si se re-ejecuta el pipeline sobre el mismo capítulo.
alter table public.lessons add column dedupe_key text unique;
