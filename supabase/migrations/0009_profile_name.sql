-- Nombre visible: del formulario de registro (full_name) o de Google (full_name / name).
alter table public.profiles add column display_name text check (char_length(display_name) <= 60);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    left(nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), ''), 60)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
