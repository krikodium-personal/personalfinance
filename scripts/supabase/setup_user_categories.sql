-- Persistencia de categorias/subcategorias por usuario.
-- Ejecutar una sola vez en Supabase SQL Editor.

create table if not exists public.user_categories (
  user_id uuid primary key references auth.users(id) on delete cascade,
  categories jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_categories enable row level security;

drop policy if exists "read own user_categories" on public.user_categories;
create policy "read own user_categories"
on public.user_categories
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "insert own user_categories" on public.user_categories;
create policy "insert own user_categories"
on public.user_categories
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "update own user_categories" on public.user_categories;
create policy "update own user_categories"
on public.user_categories
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
