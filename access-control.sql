-- Access controls for an existing YUDAN database.
-- Fresh installations receive the same rules from schema.sql and yudan-schema.sql.

alter table public.transactions enable row level security;

revoke all on table public.transactions from anon;
revoke all on table public.transactions from authenticated;
grant select on table public.transactions to anon;
grant select on table public.transactions to authenticated;

drop policy if exists "Public can read transactions" on public.transactions;
create policy "Public can read transactions"
on public.transactions
for select
to anon, authenticated
using (true);

drop policy if exists "Users can read their own Yudan dashboard" on public.yudan_dashboards;
drop policy if exists "Users can create their own Yudan dashboard" on public.yudan_dashboards;
drop policy if exists "Users can update their own Yudan dashboard" on public.yudan_dashboards;
drop policy if exists "Users can delete their own Yudan dashboard" on public.yudan_dashboards;

drop policy if exists "Owner can read the Yudan dashboard" on public.yudan_dashboards;
create policy "Owner can read the Yudan dashboard"
on public.yudan_dashboards for select to authenticated
using (
  (select auth.uid()) = user_id
  and lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'william.chen@utah.edu'
  and (
    (select auth.jwt()) -> 'app_metadata' ->> 'provider' = 'github'
    or ((select auth.jwt()) -> 'app_metadata' -> 'providers') ? 'github'
  )
);

drop policy if exists "Owner can create the Yudan dashboard" on public.yudan_dashboards;
create policy "Owner can create the Yudan dashboard"
on public.yudan_dashboards for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'william.chen@utah.edu'
  and (
    (select auth.jwt()) -> 'app_metadata' ->> 'provider' = 'github'
    or ((select auth.jwt()) -> 'app_metadata' -> 'providers') ? 'github'
  )
);

drop policy if exists "Owner can update the Yudan dashboard" on public.yudan_dashboards;
create policy "Owner can update the Yudan dashboard"
on public.yudan_dashboards for update to authenticated
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

drop policy if exists "Owner can delete the Yudan dashboard" on public.yudan_dashboards;
create policy "Owner can delete the Yudan dashboard"
on public.yudan_dashboards for delete to authenticated
using (
  (select auth.uid()) = user_id
  and lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'william.chen@utah.edu'
  and (
    (select auth.jwt()) -> 'app_metadata' ->> 'provider' = 'github'
    or ((select auth.jwt()) -> 'app_metadata' -> 'providers') ? 'github'
  )
);
