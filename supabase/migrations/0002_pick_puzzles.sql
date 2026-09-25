-- Selección aleatoria de puzzles por tema y rango de rating, ensanchando el rango si faltan.
-- p_themes vacío = cualquier tema. Devuelve como mucho p_limit filas.
create or replace function public.pick_puzzles(
  p_themes text[],
  p_rating_min int,
  p_rating_max int,
  p_limit int,
  p_exclude text[] default '{}',
  p_widen_step int default 150,
  p_widen_max_steps int default 4
) returns setof public.puzzles
language plpgsql stable
set search_path = public
as $$
declare
  step int := 0;
  lo int;
  hi int;
  found int;
begin
  loop
    lo := p_rating_min - step * p_widen_step;
    hi := p_rating_max + step * p_widen_step;
    select count(*) into found from public.puzzles p
      where (cardinality(p_themes) = 0 or p.themes && p_themes)
        and p.rating between lo and hi
        and not (p.id = any (p_exclude));
    exit when found >= p_limit or step >= p_widen_max_steps;
    step := step + 1;
  end loop;

  return query
    select p.* from public.puzzles p
    where (cardinality(p_themes) = 0 or p.themes && p_themes)
      and p.rating between lo and hi
      and not (p.id = any (p_exclude))
    order by random()
    limit p_limit;
end;
$$;

grant execute on function public.pick_puzzles(text[], int, int, int, text[], int, int) to anon, authenticated, service_role;
