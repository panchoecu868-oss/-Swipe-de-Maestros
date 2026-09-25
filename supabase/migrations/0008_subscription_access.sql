-- past_due = periodo de gracia de Whop tras un pago fallido: mantiene el acceso.
create or replace function public.has_active_subscription(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = uid and status in ('active', 'past_due')
      and (current_period_end is null or current_period_end > now())
  );
$$;
