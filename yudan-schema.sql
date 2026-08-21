-- Fish Egg dashboard cloud data.
-- Run this file once in the Supabase SQL Editor.

create table if not exists public.yudan_dashboards (
  user_id uuid primary key references auth.users(id) on delete cascade,
  birthday date not null,
  vaccine_records jsonb not null default '[]'::jsonb,
  weight_records jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.yudan_dashboards enable row level security;

revoke all on table public.yudan_dashboards from anon;
revoke all on table public.yudan_dashboards from authenticated;
grant select, insert, update, delete on table public.yudan_dashboards to authenticated;

drop policy if exists "Users can read their own Yudan dashboard" on public.yudan_dashboards;
create policy "Users can read their own Yudan dashboard"
on public.yudan_dashboards
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own Yudan dashboard" on public.yudan_dashboards;
create policy "Users can create their own Yudan dashboard"
on public.yudan_dashboards
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own Yudan dashboard" on public.yudan_dashboards;
create policy "Users can update their own Yudan dashboard"
on public.yudan_dashboards
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own Yudan dashboard" on public.yudan_dashboards;
create policy "Users can delete their own Yudan dashboard"
on public.yudan_dashboards
for delete
to authenticated
using ((select auth.uid()) = user_id);

comment on table public.yudan_dashboards is
  'One private vaccine and weight dashboard per authenticated user.';
