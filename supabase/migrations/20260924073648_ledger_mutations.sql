-- Apply after ledger_queries. The server authenticates the caller before using
-- this service-role-only RPC; browsers can still read the existing ledger.
begin;

alter table public.transactions add column if not exists version integer not null default 1;
alter table public.transactions alter column version set default 1;
alter table public.transactions alter column version set not null;
comment on column public.transactions.version is 'Optimistic write version; every update increments it, including legacy direct writes.';

create or replace function public.ledger_increment_version()
returns trigger language plpgsql security invoker set search_path = ''
as $function$
begin
  new.version := old.version + 1;
  return new;
end;
$function$;
revoke all on function public.ledger_increment_version() from public, anon, authenticated;
grant execute on function public.ledger_increment_version() to service_role;
drop trigger if exists ledger_increment_version on public.transactions;
create trigger ledger_increment_version before update on public.transactions
  for each row execute function public.ledger_increment_version();

-- Keep receipts even after their transaction was deleted. No FK/cascade: a
-- retry must return its original result and must never resurrect a deleted row.
create table if not exists public.ledger_mutation_receipts (
  request_id uuid primary key,
  payload jsonb not null,
  response jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.ledger_mutation_receipts enable row level security;
revoke all on public.ledger_mutation_receipts from public, anon, authenticated;
revoke all on public.ledger_mutation_receipts from service_role;
grant select, insert on public.ledger_mutation_receipts to service_role;

create or replace function public.ledger_mutate(
  p_action text,
  p_request_id uuid,
  p_id uuid,
  p_expected_version integer,
  p_fields jsonb
)
returns jsonb language plpgsql security invoker set search_path = ''
as $function$
declare
  fields jsonb := '{}'::jsonb;
  field_name text;
  text_value text;
  amount_value numeric;
  time_value timestamptz;
  payload_value jsonb;
  receipt public.ledger_mutation_receipts%rowtype;
  transaction_row public.transactions%rowtype;
  response_value jsonb;
begin
  if p_action is null or p_action not in ('add', 'edit', 'delete')
    or p_request_id is null or p_fields is null or jsonb_typeof(p_fields) <> 'object'
    or (p_action = 'add' and (p_id is not null or p_expected_version is not null))
    or (p_action in ('edit', 'delete') and (p_id is null or p_expected_version is null or p_expected_version < 1)) then
    return jsonb_build_object('success', false, 'code', 'INVALID_INPUT', 'error', '请提供有效的操作、请求 ID 和记录版本');
  end if;
  if exists (select 1 from jsonb_object_keys(p_fields) as keys(name)
    where name not in ('amount', 'type', 'brand', 'product', 'category', 'note', 'transaction_time'))
    or (p_action = 'delete' and p_fields <> '{}'::jsonb)
    or (p_action = 'edit' and p_fields = '{}'::jsonb) then
    return jsonb_build_object('success', false, 'code', 'INVALID_INPUT', 'error', '账单字段不合法');
  end if;

  if p_action = 'add' or p_fields ? 'amount' then
    if jsonb_typeof(p_fields -> 'amount') is null or jsonb_typeof(p_fields -> 'amount') not in ('number', 'string')
      or (p_fields ->> 'amount') !~ '^[0-9]+(\.[0-9]{1,2})?$'
      or length(p_fields ->> 'amount') > 32 then
      return jsonb_build_object('success', false, 'code', 'INVALID_INPUT', 'error', '金额必须大于 0，且最多保留两位小数');
    end if;
    amount_value := (p_fields ->> 'amount')::numeric;
    if amount_value <= 0 or amount_value > 999999999.99 then
      return jsonb_build_object('success', false, 'code', 'INVALID_INPUT', 'error', '金额须大于 0 且不超过 999999999.99');
    end if;
    fields := fields || jsonb_build_object('amount', amount_value);
  end if;
  if p_action = 'add' or p_fields ? 'type' then
    if (p_fields ->> 'type') is null or (p_fields ->> 'type') not in ('expense', 'income') then
      return jsonb_build_object('success', false, 'code', 'INVALID_INPUT', 'error', '收支类型不合法');
    end if;
    fields := fields || jsonb_build_object('type', p_fields ->> 'type');
  end if;
  foreach field_name in array array['brand', 'product', 'category', 'note'] loop
    if p_action = 'add' or p_fields ? field_name then
      if p_fields ? field_name and jsonb_typeof(p_fields -> field_name) not in ('string', 'null') then
        return jsonb_build_object('success', false, 'code', 'INVALID_INPUT', 'error', field_name || ' 必须是文本或 null');
      end if;
      text_value := nullif(btrim(p_fields ->> field_name), '');
      if length(text_value) > (case field_name when 'note' then 10000 when 'product' then 2000 else 200 end) then
        return jsonb_build_object('success', false, 'code', 'INVALID_INPUT', 'error', field_name || ' 内容过长');
      end if;
      if field_name = 'category' and text_value is not null then
        text_value := public.ledger_category_label(text_value);
      end if;
      fields := fields || jsonb_build_object(field_name, text_value);
    end if;
  end loop;
  if p_action = 'add' or p_fields ? 'transaction_time' then
    if jsonb_typeof(p_fields -> 'transaction_time') not in ('string', 'null') then
      return jsonb_build_object('success', false, 'code', 'INVALID_INPUT', 'error', '交易时间必须是包含时区的 ISO 8601 字符串或 null');
    end if;
    text_value := nullif(p_fields ->> 'transaction_time', '');
    if text_value is not null then
      if text_value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}(:[0-9]{2}(\.[0-9]{1,6})?)?(Z|[+-][0-9]{2}:[0-9]{2})$' then
        return jsonb_build_object('success', false, 'code', 'INVALID_INPUT', 'error', '交易时间必须是包含时区的 ISO 8601 字符串或 null');
      end if;
      if substring(text_value from 1 for 4)::integer not between 1000 and 9998
        or substring(text_value from 12 for 2)::integer > 23
        or substring(text_value from 15 for 2)::integer > 59
        or (substring(text_value from 17 for 1) = ':' and substring(text_value from 18 for 2)::integer > 59) then
        return jsonb_build_object('success', false, 'code', 'INVALID_INPUT', 'error', '交易日期或时间不合法');
      end if;
      begin
        time_value := text_value::timestamptz;
      exception when invalid_datetime_format or datetime_field_overflow then
        return jsonb_build_object('success', false, 'code', 'INVALID_INPUT', 'error', '交易日期或时间不合法');
      end;
      fields := fields || jsonb_build_object('transaction_time', to_char(time_value at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'));
    else
      fields := fields || jsonb_build_object('transaction_time', null);
    end if;
  end if;

  payload_value := jsonb_build_object('action', p_action, 'id', p_id, 'expected_version', p_expected_version, 'fields', fields);
  -- This transaction-scoped lock serializes matching request IDs even before
  -- a receipt exists. Hash collisions only serialize unrelated requests.
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  select * into receipt from public.ledger_mutation_receipts where request_id = p_request_id;
  if found then
    if receipt.payload is distinct from payload_value then
      return jsonb_build_object('success', false, 'code', 'IDEMPOTENCY_CONFLICT', 'error', '请求 ID 已用于另一笔操作，请刷新后重试');
    end if;
    return receipt.response || jsonb_build_object('replayed', true);
  end if;

  if p_action = 'add' then
    insert into public.transactions(amount, type, brand, product, category, note, transaction_time)
      values (amount_value, fields ->> 'type', fields ->> 'brand', fields ->> 'product', fields ->> 'category', fields ->> 'note', (fields ->> 'transaction_time')::timestamptz)
      returning * into transaction_row;
    response_value := jsonb_build_object('success', true, 'data', to_jsonb(transaction_row), 'replayed', false);
  else
    -- Lock and read together so different request IDs cannot both pass the
    -- same expected version. PostgreSQL rechecks a row changed while waiting.
    select * into transaction_row from public.transactions where id = p_id for update;
    if not found then
      response_value := jsonb_build_object('success', false, 'code', 'LEDGER_NOT_FOUND', 'error', '账单不存在或已被删除');
    elsif transaction_row.version <> p_expected_version then
      response_value := jsonb_build_object('success', false, 'code', 'LEDGER_CONFLICT', 'error', '账单已被其他操作修改，请核对最新内容', 'current', to_jsonb(transaction_row));
    elsif p_action = 'delete' then
      delete from public.transactions where id = p_id returning * into transaction_row;
      response_value := jsonb_build_object('success', true, 'data', to_jsonb(transaction_row), 'replayed', false);
    else
      update public.transactions set
        amount = case when fields ? 'amount' then amount_value else transaction_row.amount end,
        type = case when fields ? 'type' then fields ->> 'type' else transaction_row.type end,
        brand = case when fields ? 'brand' then fields ->> 'brand' else transaction_row.brand end,
        product = case when fields ? 'product' then fields ->> 'product' else transaction_row.product end,
        category = case when fields ? 'category' then fields ->> 'category' else transaction_row.category end,
        note = case when fields ? 'note' then fields ->> 'note' else transaction_row.note end,
        transaction_time = case when fields ? 'transaction_time' then (fields ->> 'transaction_time')::timestamptz else transaction_row.transaction_time end
      where id = p_id returning * into transaction_row;
      response_value := jsonb_build_object('success', true, 'data', to_jsonb(transaction_row), 'replayed', false);
    end if;
  end if;
  -- Receipts and row changes commit or roll back together, including failures
  -- from constraints/triggers/receipt insertion. Business conflicts are stable.
  insert into public.ledger_mutation_receipts(request_id, payload, response)
    values (p_request_id, payload_value, response_value);
  return response_value;
end;
$function$;
revoke all on function public.ledger_mutate(text, uuid, uuid, integer, jsonb) from public, anon, authenticated;
grant execute on function public.ledger_mutate(text, uuid, uuid, integer, jsonb) to service_role;
commit;
