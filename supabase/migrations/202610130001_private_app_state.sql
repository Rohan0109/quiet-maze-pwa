create table if not exists public.app_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state_json jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

create policy "Users can read their own app state"
  on public.app_state for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own app state"
  on public.app_state for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own app state"
  on public.app_state for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  enabled jsonb not null default '{"morning":true,"evening":true,"night":false}'::jsonb,
  times jsonb not null default '{"morning":"08:00","evening":"20:00","night":"22:00"}'::jsonb,
  timezone text not null default 'UTC',
  last_sent jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;

create policy "Users can read their own push subscriptions"
  on public.push_subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own push subscriptions"
  on public.push_subscriptions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own push subscriptions"
  on public.push_subscriptions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own push subscriptions"
  on public.push_subscriptions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.app_state from anon;
revoke all on public.push_subscriptions from anon;
grant select, insert, update on public.app_state to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;