-- Safe to reapply before or after the numbered migrations.
-- Browser health writes always go through the service-only mutation RPC.
begin;
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

alter table public.transactions enable row level security;
revoke all on public.transactions from public, anon, authenticated;
grant select on public.transactions to anon, authenticated;
grant select, insert, update, delete on public.transactions to service_role;
drop policy if exists "Public can read transactions" on public.transactions;
create policy "Public can read transactions" on public.transactions for select to anon, authenticated using (true);

alter table public.yudan_dashboards enable row level security;
alter table public.yudan_weight_records enable row level security;
alter table public.yudan_vaccine_records enable row level security;

revoke all on table public.yudan_dashboards from public, anon, authenticated;
revoke all on table public.yudan_weight_records from public, anon, authenticated;
revoke all on table public.yudan_vaccine_records from public, anon, authenticated;
grant select on table public.yudan_dashboards to authenticated;
grant select on table public.yudan_weight_records to authenticated;
grant select on table public.yudan_vaccine_records to authenticated;

grant select, insert, update, delete on public.yudan_dashboards, public.yudan_weight_records, public.yudan_vaccine_records to service_role;

-- Retire all known browser write policies from earlier installations.
drop policy if exists "Users can read their own Yudan dashboard" on public.yudan_dashboards;
drop policy if exists "Users can create their own Yudan dashboard" on public.yudan_dashboards;
drop policy if exists "Users can update their own Yudan dashboard" on public.yudan_dashboards;
drop policy if exists "Users can delete their own Yudan dashboard" on public.yudan_dashboards;
drop policy if exists "Owner can read the Yudan dashboard" on public.yudan_dashboards;
drop policy if exists "Owner can create the Yudan dashboard" on public.yudan_dashboards;
drop policy if exists "Owner can update the Yudan dashboard" on public.yudan_dashboards;
drop policy if exists "Owner can delete the Yudan dashboard" on public.yudan_dashboards;

drop policy if exists "Owner manages the Yudan dashboard" on public.yudan_dashboards;
create policy "Owner manages the Yudan dashboard"
on public.yudan_dashboards for select to authenticated
using (
  (select auth.uid()) = user_id
  and lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'william.chen@utah.edu'
  and (
    (select auth.jwt()) -> 'app_metadata' ->> 'provider' = 'github'
    or ((select auth.jwt()) -> 'app_metadata' -> 'providers') ? 'github'
  )
);

drop policy if exists "Owner manages Yudan weights" on public.yudan_weight_records;
create policy "Owner manages Yudan weights"
on public.yudan_weight_records for select to authenticated
using (
  (select auth.uid()) = user_id
  and lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'william.chen@utah.edu'
  and (
    (select auth.jwt()) -> 'app_metadata' ->> 'provider' = 'github'
    or ((select auth.jwt()) -> 'app_metadata' -> 'providers') ? 'github'
  )
);

drop policy if exists "Owner manages Yudan vaccines" on public.yudan_vaccine_records;
create policy "Owner manages Yudan vaccines"
on public.yudan_vaccine_records for select to authenticated
using (
  (select auth.uid()) = user_id
  and lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'william.chen@utah.edu'
  and (
    (select auth.jwt()) -> 'app_metadata' ->> 'provider' = 'github'
    or ((select auth.jwt()) -> 'app_metadata' -> 'providers') ? 'github'
  )
);


commit;
