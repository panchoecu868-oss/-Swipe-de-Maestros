-- Temas de autoevaluación que cubre cada lección (ids de config/self-assessment.ts o 'aperturas').
-- Es lo que conecta la lección con theme_weights.
alter table public.lessons add column topics text[] not null default '{}';
create index lessons_topics_gin on public.lessons using gin (topics);
