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
grant select on table public.yudan_dashboards to anon;
grant select, insert, update, delete on table public.yudan_dashboards to authenticated;

drop policy if exists "Users can read their own Yudan dashboard" on public.yudan_dashboards;
drop policy if exists "Public can read the Yudan dashboard" on public.yudan_dashboards;
drop policy if exists "Owner can read the Yudan dashboard" on public.yudan_dashboards;
create policy "Public can read the Yudan dashboard"
on public.yudan_dashboards
for select
to anon, authenticated
using (true);

drop policy if exists "Users can create their own Yudan dashboard" on public.yudan_dashboards;
drop policy if exists "Owner can create the Yudan dashboard" on public.yudan_dashboards;
create policy "Owner can create the Yudan dashboard"
on public.yudan_dashboards
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'william.chen@utah.edu'
  and (
    (select auth.jwt()) -> 'app_metadata' ->> 'provider' = 'github'
    or ((select auth.jwt()) -> 'app_metadata' -> 'providers') ? 'github'
  )
);

drop policy if exists "Users can update their own Yudan dashboard" on public.yudan_dashboards;
drop policy if exists "Owner can update the Yudan dashboard" on public.yudan_dashboards;
create policy "Owner can update the Yudan dashboard"
on public.yudan_dashboards
for update
to authenticated
using (
  (select auth.uid()) = user_id
  and lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'william.chen@utah.edu'
  and (
    (select auth.jwt()) -> 'app_metadata' ->> 'provider' = 'github'
    or ((select auth.jwt()) -> 'app_metadata' -> 'providers') ? 'github'
  )
)
with check (
  (select auth.uid()) = user_id
  and lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'william.chen@utah.edu'
  and (
    (select auth.jwt()) -> 'app_metadata' ->> 'provider' = 'github'
    or ((select auth.jwt()) -> 'app_metadata' -> 'providers') ? 'github'
  )
);

drop policy if exists "Users can delete their own Yudan dashboard" on public.yudan_dashboards;
drop policy if exists "Owner can delete the Yudan dashboard" on public.yudan_dashboards;
create policy "Owner can delete the Yudan dashboard"
on public.yudan_dashboards
for delete
to authenticated
using (
  (select auth.uid()) = user_id
  and lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'william.chen@utah.edu'
  and (
    (select auth.jwt()) -> 'app_metadata' ->> 'provider' = 'github'
    or ((select auth.jwt()) -> 'app_metadata' -> 'providers') ? 'github'
  )
);

comment on table public.yudan_dashboards is
  'Private vaccine and weight dashboard for the authorized GitHub owner.';
