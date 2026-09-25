-- Aplica el resultado de un gesto de forma atómica. SOLO service role: el servidor ya validó
-- (jugadas re-verificadas con chess.js, tiempo del descarte medido con el reloj del servidor).
create or replace function public.apply_gesture(
  p_user uuid,
  p_lesson uuid,
  p_gesture gesture,
  p_outcome gesture_outcome,
  p_local_day date,
  p_daily_target int,
  p_card jsonb default null,
  p_weight_topics text[] default '{}',
  p_weight_factor real default 1,
  p_weight_min real default 0.1,
  p_weight_max real default 5,
  p_discard jsonb default null
) returns table (cards_resolved int, day_completed boolean)
language plpgsql security definer set search_path = public
as $$
declare
  v_resolved int;
begin
  -- Cierre de ronda de descarte: solo una vez por ronda y solo del propio usuario.
  if p_discard is not null then
    update public.discard_rounds r set
      finished_at = now(),
      won = (p_discard ->> 'won')::boolean,
      elapsed_ms = (p_discard ->> 'elapsed_ms')::int,
      per_puzzle_ms = array(select jsonb_array_elements_text(p_discard -> 'per_puzzle_ms')::int),
      results = p_discard -> 'results'
    where r.id = (p_discard ->> 'round_id')::uuid and r.user_id = p_user and r.lesson_id = p_lesson and r.finished_at is null;
    if not found then
      raise exception 'ronda de descarte inexistente o ya cerrada';
    end if;
  end if;

  if p_card is not null then
    insert into public.card_states as c (user_id, lesson_id, status, ef, interval_days, repetitions, due_on, forced_until_seen, updated_at)
    values (
      p_user, p_lesson,
      (p_card ->> 'status')::card_status,
      coalesce((p_card ->> 'ef')::real, 2.5),
      coalesce((p_card ->> 'interval_days')::int, 0),
      coalesce((p_card ->> 'repetitions')::int, 0),
      (p_card ->> 'due_on')::date,
      coalesce((p_card ->> 'forced_until_seen')::boolean, false),
      now()
    )
    on conflict (user_id, lesson_id) do update set
      status = excluded.status, ef = excluded.ef, interval_days = excluded.interval_days,
      repetitions = excluded.repetitions, due_on = excluded.due_on,
      forced_until_seen = excluded.forced_until_seen, updated_at = now();
  end if;

  if cardinality(p_weight_topics) > 0 and p_weight_factor <> 1 then
    insert into public.theme_weights as w (user_id, theme, weight, updated_at)
    select p_user, t, least(p_weight_max, greatest(p_weight_min, p_weight_factor)), now() from unnest(p_weight_topics) t
    on conflict (user_id, theme) do update set
      weight = least(p_weight_max, greatest(p_weight_min, w.weight * p_weight_factor)), updated_at = now();
  end if;

  insert into public.card_events (user_id, lesson_id, gesture, outcome, local_day)
  values (p_user, p_lesson, p_gesture, p_outcome, p_local_day);

  -- Día cumplido = N cartas DISTINTAS resueltas ese día local (por cualquier gesto).
  select count(distinct e.lesson_id)::int into v_resolved
  from public.card_events e where e.user_id = p_user and e.local_day = p_local_day;

  insert into public.daily_log as d (user_id, local_day, cards_resolved, completed)
  values (p_user, p_local_day, v_resolved, v_resolved >= p_daily_target)
  on conflict (user_id, local_day) do update set
    cards_resolved = excluded.cards_resolved,
    completed = d.completed or excluded.completed;

  return query select d.cards_resolved, d.completed from public.daily_log d
    where d.user_id = p_user and d.local_day = p_local_day;
end;
$$;

revoke all on function public.apply_gesture(uuid, uuid, gesture, gesture_outcome, date, int, jsonb, text[], real, real, real, jsonb) from public, anon, authenticated;
grant execute on function public.apply_gesture(uuid, uuid, gesture, gesture_outcome, date, int, jsonb, text[], real, real, real, jsonb) to service_role;
