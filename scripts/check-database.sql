-- Read-only preflight/post-upgrade inspection. Does not call application RPCs,
-- read personal records, or mark migrations as applied. Every required row must pass.
begin read only;
with required_functions(signature, migration, service_only) as (values
  ('public.mutate_yudan_health_record(uuid,text,text,text,jsonb,boolean,timestamptz,uuid)', '202609240001', true),
  ('public.ledger_monthly_summary(integer,integer)', '202609240002', false),
  ('public.ledger_list(integer,timestamptz,uuid,timestamptz,timestamptz,text,text,text,boolean)', '202609240002', false),
  ('public.ledger_category_label(text)', '202609240002', false),
  ('public.blog_chat_status(text,text,integer,integer)', '202609240003', true),
  ('public.blog_chat_reserve(text,text,integer,integer,integer,integer)', '202609240003', true),
  ('public.blog_chat_finish(uuid,boolean)', '202609240003', true),
  ('public.ledger_mutate(text,uuid,uuid,integer,jsonb)', '20260924073648', true),
  ('public.total_expense()', '20260924081517', false)
), function_checks as (
  select 'rpc:' || signature as check_name, migration as required_version,
    coalesce(to_regprocedure(signature) is not null
      and has_function_privilege('service_role', to_regprocedure(signature), 'execute')
      and has_function_privilege('anon', to_regprocedure(signature), 'execute') = not service_only
      and has_function_privilege('authenticated', to_regprocedure(signature), 'execute') = not service_only, false) as ok
  from required_functions
), required_tables(name, browser_read, migration) as (values
  ('transactions', true, 'baseline'), ('yudan_dashboards', true, 'baseline'),
  ('yudan_weight_records', true, 'baseline'), ('yudan_vaccine_records', true, 'baseline'),
  ('yudan_vaccine_catalog', true, 'baseline'), ('yudan_health_mutation_receipts', false, '202609240001'),
  ('ledger_mutation_receipts', false, '20260924073648')
), table_checks as (
  select 'table:' || name as check_name, migration as required_version,
    coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.' || name))
      and has_table_privilege('authenticated', to_regclass('public.' || name), 'select') = browser_read
      and not has_table_privilege('authenticated', to_regclass('public.' || name), 'insert,update,delete,truncate,references,trigger')
      and not has_table_privilege('anon', to_regclass('public.' || name), 'insert,update,delete,truncate,references,trigger')
      and (name = 'transactions' or not has_table_privilege('anon', to_regclass('public.' || name), 'select'))
      and has_table_privilege('service_role', to_regclass('public.' || name), 'select'), false) as ok
  from required_tables
), required_indexes(name, migration) as (values
  ('public.idx_transactions_created_at', 'baseline'),
  ('public.idx_transactions_transaction_time', '20260924081517'),
  ('public.yudan_vaccine_records_plan_id_idx', 'baseline'),
  ('public.transactions_created_id_desc_idx', '202609240002'),
  ('public.transactions_effective_time_idx', '202609240002'),
  ('public.transactions_effective_id_desc_idx', '202609240002'),
  ('public.transactions_type_effective_id_idx', '202609240002'),
  ('public.transactions_category_effective_id_idx', '202609240002'),
  ('blog_chat_private.blog_chat_pending_expiry', '202609240003'),
  ('public.ledger_mutation_receipts_pkey', '20260924073648')
), index_checks as (
  select 'index:' || name as check_name, migration as required_version,
    coalesce((select indisvalid and indisready from pg_index where indexrelid = to_regclass(name)), false) as ok
  from required_indexes
), required_unique_keys(table_name, key_columns) as (values
  ('public.yudan_weight_records', array['user_id', 'measured_on']),
  ('public.yudan_vaccine_records', array['user_id', 'plan_id'])
), unique_key_checks as (
  -- Older normalized databases used different constraint names. ON CONFLICT
  -- depends on a valid, immediate, non-partial unique key over these columns,
  -- not on its name or column order. INCLUDE columns do not affect uniqueness.
  select 'unique:' || table_name || '(' || array_to_string(key_columns, ',') || ')' as check_name,
    'baseline' as required_version,
    exists(select 1 from pg_index i
      where i.indrelid = to_regclass(table_name)
        and i.indisunique and i.indimmediate and i.indisvalid and i.indisready
        and i.indpred is null and i.indexprs is null
        and i.indnkeyatts = cardinality(key_columns)
        and (select array_agg(a.attname::text order by a.attname)
          from unnest(i.indkey) with ordinality as k(attnum, position)
          join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum
          where k.position <= i.indnkeyatts)
          = array(select unnest(key_columns) order by 1)) as ok
  from required_unique_keys
), extra_checks as (
  select 'ledger:brand+product' as check_name, '20260908031942' as required_version,
    (select count(*) = 2 from information_schema.columns where table_schema = 'public'
      and table_name = 'transactions' and column_name in ('brand', 'product')) as ok
  union all
  select 'ledger:write-version', '20260924073648',
    exists(select 1 from information_schema.columns where table_schema = 'public'
      and table_name = 'transactions' and column_name = 'version' and data_type = 'integer'
      and is_nullable = 'NO' and column_default = '1')
    and exists(select 1 from pg_trigger where tgrelid = to_regclass('public.transactions')
      and tgname = 'ledger_increment_version' and tgenabled = 'O' and not tgisinternal
      and tgfoid = to_regprocedure('public.ledger_increment_version()'))
  union all
  select 'ledger:mutation-permissions', '20260924073648',
    coalesce((select not prosecdef and proconfig @> array['search_path=""'] from pg_proc
      where oid = to_regprocedure('public.ledger_mutate(text,uuid,uuid,integer,jsonb)'))
      and has_table_privilege('service_role', to_regclass('public.ledger_mutation_receipts'), 'insert')
      and not has_table_privilege('service_role', to_regclass('public.ledger_mutation_receipts'), 'update,delete,truncate'), false)
  union all
  select 'health:legacy-arrays-removed', 'baseline',
    not exists(select 1 from information_schema.columns where table_schema = 'public'
      and table_name = 'yudan_dashboards' and column_name in ('weight_records', 'vaccine_records'))
  union all
  select 'chat:private-schema', '202609240003',
    coalesce(not has_schema_privilege('anon', to_regnamespace('blog_chat_private'), 'usage')
      and not has_schema_privilege('authenticated', to_regnamespace('blog_chat_private'), 'usage'), false)
), chat_checks as (
  select 'table:blog_chat_private.' || name as check_name, '202609240003' as required_version,
    coalesce((select relrowsecurity from pg_class where oid = to_regclass('blog_chat_private.' || name))
      and not has_table_privilege('anon', to_regclass('blog_chat_private.' || name), 'select,insert,update,delete')
      and not has_table_privilege('authenticated', to_regclass('blog_chat_private.' || name), 'select,insert,update,delete')
      and has_table_privilege('service_role', to_regclass('blog_chat_private.' || name), 'select'), false) as ok
  from (values ('daily_global'), ('daily_visitor'), ('request_rate'), ('reservations')) as tables(name)
)
select * from function_checks union all select * from table_checks
union all select * from index_checks union all select * from extra_checks
union all select * from chat_checks
union all select * from unique_key_checks
order by required_version, check_name;

-- Object checks above prove the required contract, not the identity of the SQL
-- file executed. Keep file SHA-256 + application commit in the deployment log.
-- SQL Editor does not populate Supabase CLI migration history automatically.
-- MCP apply_migration may assign a server version different from the local file
-- timestamp; match its migration name and deployment SHA-256, not timestamps alone.
select to_regclass('supabase_migrations.schema_migrations') is not null as cli_history_available,
  array['20260908031942', '202609240001', '202609240002', '202609240003', '20260924073648', '20260924081517'] as expected_versions,
  array['ledger_brand_product', 'health_record_mutations', 'ledger_queries', 'blog_chat_limits', 'ledger_mutations', 'ledger_baseline_objects'] as expected_names;
-- If cli_history_available is true, also inspect the actual history:
-- select version, name from supabase_migrations.schema_migrations order by version;
commit;
