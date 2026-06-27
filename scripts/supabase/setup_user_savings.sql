create table if not exists user_savings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{"funds":[]}'::jsonb,
  updated_at timestamptz default now()
);

alter table user_savings enable row level security;

create policy "user_savings_own" on user_savings
  for all using (auth.uid() = user_id);
