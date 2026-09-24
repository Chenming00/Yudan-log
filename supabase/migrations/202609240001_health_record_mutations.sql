-- Requires health-schema.sql and yudan-schema.sql. Apply after taking a backup.
-- Service-only transactional writes; authenticated clients retain their existing RLS reads.
begin;

create table if not exists public.yudan_health_mutation_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  command jsonb not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, request_id)
);
alter table public.yudan_health_mutation_receipts enable row level security;
revoke all on public.yudan_health_mutation_receipts from public, anon, authenticated;
grant select, insert, delete on public.yudan_health_mutation_receipts to service_role;

create or replace function public.mutate_yudan_health_record(
  p_user_id uuid, p_kind text, p_key text, p_action text, p_changes jsonb,
  p_check_version boolean default false, p_expected_updated_at timestamptz default null,
  p_request_id uuid default null
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  old_row jsonb;
  saved_row jsonb;
  result jsonb;
  prior_command jsonb;
  command jsonb := jsonb_build_object('kind', p_kind, 'key', p_key, 'action', p_action,
    'changes', p_changes, 'check_version', p_check_version, 'expected_updated_at', p_expected_updated_at);
  write_time timestamptz;
begin
  if p_kind not in ('weight', 'vaccine') or p_action not in ('save', 'delete') then
    raise exception 'Invalid health mutation' using errcode = '22023';
  end if;
  -- A per-owner lock also covers two inserts for a previously absent natural key.
  perform pg_advisory_xact_lock(hashtextextended('yudan-health:' || p_user_id::text, 0));
  if p_request_id is not null then
    select r.command, r.response into prior_command, result from public.yudan_health_mutation_receipts r
      where user_id = p_user_id and request_id = p_request_id;
    if found then
      if prior_command <> command then raise exception 'Mutation ID reused' using errcode = '22023'; end if;
      return result;
    end if;
  end if;
  if p_kind = 'weight' then
    select to_jsonb(r) into old_row from public.yudan_weight_records r
      where user_id = p_user_id and measured_on = p_key::date for update;
  else
    select to_jsonb(r) into old_row from public.yudan_vaccine_records r
      where user_id = p_user_id and plan_id = p_key for update;
  end if;
  if p_check_version and (old_row ->> 'updated_at')::timestamptz is distinct from p_expected_updated_at then
    return jsonb_build_object('conflict', true, 'current', old_row);
  end if;
  write_time := greatest(clock_timestamp(), coalesce((old_row ->> 'updated_at')::timestamptz + interval '1 microsecond', '-infinity'::timestamptz));
  if p_action = 'delete' then
    if p_kind = 'weight' then
      delete from public.yudan_weight_records where user_id = p_user_id and measured_on = p_key::date;
    else
      delete from public.yudan_vaccine_records where user_id = p_user_id and plan_id = p_key;
    end if;
  elsif p_kind = 'weight' then
    if p_key::date > (now() at time zone 'Asia/Shanghai')::date
       or jsonb_typeof(p_changes -> 'weight_kg') is distinct from 'number'
       or not ((p_changes ->> 'weight_kg')::numeric between 0.1 and 200) then
      raise exception 'Invalid weight or date' using errcode = '22023';
    end if;
    insert into public.yudan_weight_records(user_id, measured_on, weight_kg, updated_at)
      values(p_user_id, p_key::date, (p_changes ->> 'weight_kg')::numeric, write_time)
      on conflict(user_id, measured_on) do update set weight_kg = excluded.weight_kg, updated_at = excluded.updated_at
      returning to_jsonb(yudan_weight_records.*) into saved_row;
  else
    if nullif(p_changes ->> 'administered_on', '') is null or (p_changes ->> 'administered_on')::date > (now() at time zone 'Asia/Shanghai')::date then
      raise exception 'Invalid vaccine date' using errcode = '22023';
    end if;
    insert into public.yudan_vaccine_records(user_id, plan_id, administered_on, updated_at)
      values(p_user_id, p_key, (p_changes ->> 'administered_on')::date, write_time)
      on conflict(user_id, plan_id) do update set administered_on = excluded.administered_on, updated_at = excluded.updated_at
      returning to_jsonb(yudan_vaccine_records.*) into saved_row;
  end if;
  insert into public.yudan_dashboards(user_id, birthday, updated_at) values(p_user_id, '2026-08-12', write_time)
    on conflict(user_id) do update set updated_at = excluded.updated_at;
  result := jsonb_build_object('conflict', false, 'created', old_row is null and p_action = 'save', 'record', saved_row);
  if p_request_id is not null then
    insert into public.yudan_health_mutation_receipts(user_id, request_id, command, response)
      values(p_user_id, p_request_id, command, result);
  end if;
  return result;
end;
$$;
revoke all on function public.mutate_yudan_health_record(uuid,text,text,text,jsonb,boolean,timestamptz,uuid) from public, anon, authenticated;
grant execute on function public.mutate_yudan_health_record(uuid,text,text,text,jsonb,boolean,timestamptz,uuid) to service_role;
-- Retire old direct browser writes, which bypass version checks and can delete another device's rows.
revoke insert, update, delete on public.yudan_weight_records, public.yudan_vaccine_records, public.yudan_dashboards from authenticated;

commit;
