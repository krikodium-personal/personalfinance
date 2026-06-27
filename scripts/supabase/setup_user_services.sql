-- Control de servicios por propiedad (alquileres).
-- Ejecutar una sola vez en Supabase SQL Editor.

create table if not exists public.user_services (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{"properties":[],"statuses":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_services enable row level security;

drop policy if exists "read own user_services" on public.user_services;
create policy "read own user_services"
on public.user_services
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "insert own user_services" on public.user_services;
create policy "insert own user_services"
on public.user_services
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "update own user_services" on public.user_services;
create policy "update own user_services"
on public.user_services
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
