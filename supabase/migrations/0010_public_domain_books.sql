-- Libros de dominio público (Project Gutenberg) junto a los PDFs del dueño.
alter table public.books
  add column source_format text not null default 'pdf' check (source_format in ('pdf', 'gutenberg_txt')),
  add column source_url text,
  add column citation_unit text not null default 'página' check (citation_unit in ('página', 'sección')),
  add column public_domain boolean not null default false,
  add column gutenberg_id int unique;

-- Catálogo público (/libros): título, autor, licencia y cuántas lecciones aprobadas salen de cada libro.
-- security definer para contar lecciones aprobadas sin exponer las pendientes.
create or replace function public.book_catalog()
returns table (id uuid, title text, author text, year int, license_note text, public_domain boolean, source_url text, citation_unit text, approved_lessons bigint)
language sql stable security definer set search_path = public as $$
  select b.id, b.title, b.author, b.year, b.license_note, b.public_domain, b.source_url, b.citation_unit,
         count(l.id) filter (where l.reviewed) as approved_lessons
  from public.books b left join public.lessons l on l.book_id = b.id
  group by b.id
  having count(l.id) filter (where l.reviewed) > 0 or b.public_domain
  order by b.public_domain desc, b.year nulls last, b.title;
$$;
grant execute on function public.book_catalog() to anon, authenticated;
