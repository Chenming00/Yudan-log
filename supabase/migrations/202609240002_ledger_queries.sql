-- Read-only ledger RPCs run with the caller's existing transactions RLS policies.
-- Apply before deploying the list/monthly/daily APIs. Missing RPCs return 503.
begin;

create or replace function public.ledger_category_label(p_category text)
returns text language sql immutable parallel safe security invoker set search_path = ''
as $function$
  select case regexp_replace(btrim(coalesce(p_category, '')), '^[^[:alnum:]]+', '')
    when 'feeding' then '喂养用品' when '喂养用品' then '喂养用品'
    when 'care' then '护理清洁' when '护理清洁' then '护理清洁'
    when 'food' then '辅食零食' when '辅食零食' then '辅食零食'
    when 'medical' then '医疗健康' when '医疗健康' then '医疗健康'
    when 'clothing' then '衣物穿戴' when '衣物穿戴' then '衣物穿戴'
    when 'gear' then '大件用品' when '大件用品' then '大件用品'
    when 'outing' then '外出相关' when '外出相关' then '外出相关'
    when 'other' then '其他' when '其他' then '其他'
    else coalesce(nullif(btrim(p_category), ''), '未分类') end;
$function$;

create index if not exists transactions_created_id_desc_idx
  on public.transactions (created_at desc, id desc);
create index if not exists transactions_effective_time_idx
  on public.transactions ((coalesce(transaction_time, created_at)));
create index if not exists transactions_effective_id_desc_idx
  on public.transactions ((coalesce(transaction_time, created_at)) desc, id desc);
create index if not exists transactions_type_effective_id_idx
  on public.transactions (type, (coalesce(transaction_time, created_at)) desc, id desc);
create index if not exists transactions_category_effective_id_idx
  on public.transactions ((public.ledger_category_label(category)), (coalesce(transaction_time, created_at)) desc, id desc);

-- JSON keeps the limit+1 sentinel independent of the Data API row-count setting.
-- Search is a literal substring, so punctuation/%/_ never become query operators.
create or replace function public.ledger_list(
  p_limit integer default 30,
  p_cursor_time timestamptz default null,
  p_cursor_id uuid default null,
  p_start timestamptz default null,
  p_end timestamptz default null,
  p_type text default null,
  p_category text default null,
  p_search text default null,
  p_include_categories boolean default true
)
returns jsonb language plpgsql stable security invoker set search_path = ''
as $function$
declare result jsonb;
begin
  if p_limit is null or p_limit < 1 or p_limit > 100
    or (p_cursor_time is null) <> (p_cursor_id is null)
    or (p_start is null) <> (p_end is null)
    or p_start >= p_end
    or (p_type is not null and p_type not in ('expense', 'income'))
    or length(p_category) > 200 or length(p_search) > 200 then
    raise exception 'Invalid ledger query parameters' using errcode = '22023';
  end if;
  select jsonb_build_object(
    'data', coalesce((
      select jsonb_agg(to_jsonb(page) order by coalesce(page.transaction_time, page.created_at) desc, page.id desc)
      from (
        select t.* from public.transactions t
        where (p_start is null or coalesce(t.transaction_time, t.created_at) >= p_start)
          and (p_end is null or coalesce(t.transaction_time, t.created_at) < p_end)
          and (p_cursor_time is null or (coalesce(t.transaction_time, t.created_at), t.id) < (p_cursor_time, p_cursor_id))
          and (p_type is null or t.type = p_type)
          and (p_category is null or public.ledger_category_label(t.category) = public.ledger_category_label(p_category))
          and (nullif(btrim(p_search), '') is null
            or strpos(lower(coalesce(t.brand, '')), lower(btrim(p_search))) > 0
            or strpos(lower(coalesce(t.product, '')), lower(btrim(p_search))) > 0
            or strpos(lower(coalesce(t.note, '')), lower(btrim(p_search))) > 0
            or strpos(lower(public.ledger_category_label(t.category)), lower(btrim(p_search))) > 0
            or strpos(trim_scale(t.amount)::text, btrim(p_search)) > 0)
        order by coalesce(t.transaction_time, t.created_at) desc, t.id desc
        limit p_limit + 1
      ) page
    ), '[]'::jsonb),
    'categories', case when p_include_categories then (
      select coalesce(jsonb_agg(c.category order by c.category collate "C"), '[]'::jsonb)
      from (select distinct public.ledger_category_label(category) as category from public.transactions) c
    ) else null end
  ) into result;
  return result;
end;
$function$;

create or replace function public.ledger_monthly_summary(p_year integer, p_month integer)
returns jsonb language plpgsql stable security invoker set search_path = ''
as $function$
declare result jsonb;
begin
  if p_year is null or p_year < 1000 or p_year > 9998 or p_month is null or p_month < 1 or p_month > 12 then
    raise exception 'Invalid ledger month' using errcode = '22023';
  end if;
  with local_month as (
    select make_date(p_year, p_month, 1)::timestamp as start_day
  ), bounds as (
    select start_day, start_day at time zone 'Asia/Shanghai' as start_at,
      (start_day + interval '1 month') at time zone 'Asia/Shanghai' as end_at,
      (start_day - interval '1 month') at time zone 'Asia/Shanghai' as previous_at
    from local_month
  ), current_rows as (
    select t.* from public.transactions t, bounds b
    where coalesce(t.transaction_time, t.created_at) >= b.start_at
      and coalesce(t.transaction_time, t.created_at) < b.end_at
  ), expense_rows as (
    select * from current_rows where type = 'expense'
  ), daily as (
    select (coalesce(transaction_time, created_at) at time zone 'Asia/Shanghai')::date as date_key,
      sum(amount)::numeric as amount
    from expense_rows group by 1
  ), days as (
    select (b.start_day::date + i)::text as date_key, coalesce(d.amount, 0) as amount
    from bounds b cross join lateral generate_series(0, (b.start_day + interval '1 month')::date - b.start_day::date - 1) i
    left join daily d on d.date_key = b.start_day::date + i
  ), categories as (
    select public.ledger_category_label(category) as category, sum(amount)::numeric as amount, count(*)::integer as count
    from expense_rows group by 1
  ), calendar as (
    select extract(day from date_key)::integer as day, amount from daily
  ), last_expense as (
    select amount, public.ledger_category_label(category) as category, coalesce(note, '') as note,
      brand, product, coalesce(transaction_time, created_at) as transaction_time
    from expense_rows order by coalesce(transaction_time, created_at) desc, id desc limit 1
  )
  select jsonb_build_object(
    'year', p_year, 'month', p_month,
    'totalExpense', coalesce((select sum(amount) from expense_rows), 0),
    'transactionCount', (select count(*) from current_rows),
    'dailyExpenses', (select jsonb_agg(jsonb_build_object('date', date_key, 'amount', amount) order by date_key) from days),
    'categoryBreakdown', coalesce((select jsonb_agg(jsonb_build_object('category', category, 'amount', amount, 'count', count) order by amount desc, category collate "C") from categories), '[]'::jsonb),
    'calendarData', coalesce((select jsonb_object_agg(day::text, amount) from calendar), '{}'::jsonb),
    'prevMonthExpense', coalesce((select sum(t.amount) from public.transactions t, bounds b where t.type = 'expense' and coalesce(t.transaction_time, t.created_at) >= b.previous_at and coalesce(t.transaction_time, t.created_at) < b.start_at), 0),
    'allTimeExpense', coalesce((select sum(amount) from public.transactions where type = 'expense'), 0),
    'lastTransaction', (select to_jsonb(last_expense) from last_expense)
  ) into result;
  return result;
end;
$function$;

revoke all on function public.ledger_category_label(text) from public;
revoke all on function public.ledger_list(integer, timestamptz, uuid, timestamptz, timestamptz, text, text, text, boolean) from public;
revoke all on function public.ledger_monthly_summary(integer, integer) from public;
grant execute on function public.ledger_category_label(text) to anon, authenticated, service_role;
grant execute on function public.ledger_list(integer, timestamptz, uuid, timestamptz, timestamptz, text, text, text, boolean) to anon, authenticated, service_role;
grant execute on function public.ledger_monthly_summary(integer, integer) to anon, authenticated, service_role;
commit;
