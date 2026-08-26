-- Normalized Fish Egg health records.
-- Run health-schema.sql first so yudan_vaccine_catalog exists.

create table if not exists public.yudan_dashboards (
  user_id uuid primary key references auth.users(id) on delete cascade,
  birthday date not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.yudan_weight_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_on date not null,
  weight_kg numeric(6, 3) not null check (weight_kg >= 0.1 and weight_kg <= 200),
  height_cm numeric(5, 2) check (height_cm is null or height_cm > 0),
  head_circumference_cm numeric(5, 2) check (
    head_circumference_cm is null or head_circumference_cm > 0
  ),
  note text not null default '',
  legacy_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, measured_on)
);

create table if not exists public.yudan_vaccine_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.yudan_vaccine_catalog(id)
    on update cascade on delete restrict,
  administered_on date not null,
  place text not null default '',
  batch_no text not null default '',
  manufacturer text not null default '',
  note text not null default '',
  legacy_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_id)
);

create index if not exists yudan_vaccine_records_plan_id_idx
  on public.yudan_vaccine_records (plan_id);

-- Existing installations may still have the former JSONB array columns.
-- Copy them once into normalized rows, validate the row counts, then remove the
-- legacy columns so the final schema never keeps health records as JSON arrays.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'yudan_dashboards'
      and column_name = 'weight_records'
  ) then
    execute $migration$
      insert into public.yudan_weight_records (
        user_id, measured_on, weight_kg, height_cm, head_circumference_cm,
        note, legacy_id, updated_at
      )
      select
        dashboard.user_id,
        (record.item ->> 'date')::date,
        (record.item ->> 'weight')::numeric,
        case when nullif(record.item ->> 'height', '')::numeric > 0
          then (record.item ->> 'height')::numeric end,
        case when nullif(record.item ->> 'head', '')::numeric > 0
          then (record.item ->> 'head')::numeric end,
        coalesce(record.item ->> 'note', ''),
        nullif(record.item ->> 'id', ''),
        dashboard.updated_at
      from public.yudan_dashboards as dashboard
      cross join lateral jsonb_array_elements(dashboard.weight_records) as record(item)
      where jsonb_typeof(dashboard.weight_records) = 'array'
        and record.item ->> 'date' ~ '^\d{4}-\d{2}-\d{2}$'
        and jsonb_typeof(record.item -> 'weight') = 'number'
      on conflict (user_id, measured_on) do update
      set
        weight_kg = excluded.weight_kg,
        height_cm = excluded.height_cm,
        head_circumference_cm = excluded.head_circumference_cm,
        note = excluded.note,
        legacy_id = coalesce(public.yudan_weight_records.legacy_id, excluded.legacy_id),
        updated_at = excluded.updated_at
    $migration$;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'yudan_dashboards'
      and column_name = 'vaccine_records'
  ) then
    execute $migration$
      insert into public.yudan_vaccine_records (
        user_id, plan_id, administered_on, legacy_id, updated_at
      )
      select
        dashboard.user_id,
        catalog.id,
        (record.item ->> 'doneDate')::date,
        nullif(record.item ->> 'id', ''),
        dashboard.updated_at
      from public.yudan_dashboards as dashboard
      cross join lateral jsonb_array_elements(dashboard.vaccine_records) as record(item)
      join public.yudan_vaccine_catalog as catalog
        on catalog.id = coalesce(record.item ->> 'planId', record.item ->> 'id')
        or (
          catalog.vaccine = record.item ->> 'vaccine'
          and catalog.dose = record.item ->> 'dose'
          and catalog.age_label = record.item ->> 'ageLabel'
        )
      where jsonb_typeof(dashboard.vaccine_records) = 'array'
        and record.item ->> 'doneDate' ~ '^\d{4}-\d{2}-\d{2}$'
      on conflict (user_id, plan_id) do update
      set
        administered_on = excluded.administered_on,
        legacy_id = coalesce(public.yudan_vaccine_records.legacy_id, excluded.legacy_id),
        updated_at = excluded.updated_at
    $migration$;
  end if;
end
$$;

do $$
declare
  mismatch_count integer;
  has_weight_records boolean;
  has_vaccine_records boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'yudan_dashboards'
      and column_name = 'weight_records'
  ) into has_weight_records;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'yudan_dashboards'
      and column_name = 'vaccine_records'
  ) into has_vaccine_records;

  if has_weight_records <> has_vaccine_records then
    raise exception 'Legacy Yudan JSON columns are incomplete; refusing cleanup';
  end if;

  if has_weight_records and has_vaccine_records then
    execute $validation$
      select count(*)
      from public.yudan_dashboards d
      where jsonb_array_length(coalesce(d.weight_records, '[]'::jsonb))
            <> (select count(*) from public.yudan_weight_records w where w.user_id = d.user_id)
         or jsonb_array_length(coalesce(d.vaccine_records, '[]'::jsonb))
            <> (select count(*) from public.yudan_vaccine_records v where v.user_id = d.user_id)
    $validation$ into mismatch_count;

    if mismatch_count <> 0 then
      raise exception 'Normalized rows do not match legacy JSON for % dashboard(s)', mismatch_count;
    end if;

    execute 'alter table public.yudan_dashboards drop column weight_records, drop column vaccine_records';
  end if;
end
$$;

alter table public.yudan_dashboards enable row level security;
alter table public.yudan_weight_records enable row level security;
alter table public.yudan_vaccine_records enable row level security;

revoke all on table public.yudan_dashboards from anon, authenticated;
revoke all on table public.yudan_weight_records from anon, authenticated;
revoke all on table public.yudan_vaccine_records from anon, authenticated;
grant select, insert, update, delete on table public.yudan_dashboards to authenticated;
grant select, insert, update, delete on table public.yudan_weight_records to authenticated;
grant select, insert, update, delete on table public.yudan_vaccine_records to authenticated;

drop policy if exists "Owner manages the Yudan dashboard" on public.yudan_dashboards;
create policy "Owner manages the Yudan dashboard"
on public.yudan_dashboards for all to authenticated
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

drop policy if exists "Owner manages Yudan weights" on public.yudan_weight_records;
create policy "Owner manages Yudan weights"
on public.yudan_weight_records for all to authenticated
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

drop policy if exists "Owner manages Yudan vaccines" on public.yudan_vaccine_records;
create policy "Owner manages Yudan vaccines"
on public.yudan_vaccine_records for all to authenticated
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

comment on table public.yudan_dashboards is
  'One private Fish Egg profile per authenticated owner.';
comment on table public.yudan_weight_records is
  'One normalized growth measurement per user and measurement date.';
comment on table public.yudan_vaccine_records is
  'One normalized vaccination record per user and canonical vaccine plan.';
