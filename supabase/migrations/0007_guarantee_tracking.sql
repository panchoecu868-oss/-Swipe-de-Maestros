-- Inscripción a la garantía: se crea al activar la suscripción. Si la API pública falla,
-- queda 'pending' y el cron la reintenta (nunca se inventa un rating inicial).
alter table public.guarantee_enrollments
  alter column start_rating drop not null,
  alter column start_games drop not null,
  add column status text not null default 'active' check (status in ('pending', 'active')),
  add column started_on date,
  add column ends_on date,
  add column last_error text,
  add column broken_at timestamptz,
  add column last_checked_at timestamptz;
