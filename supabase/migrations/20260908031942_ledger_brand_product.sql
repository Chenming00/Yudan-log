-- Add structured ledger fields and migrate legacy notes without changing financial data.
-- Existing projects apply this file; fresh projects can use schema.sql.
begin;
lock table public.transactions in share row exclusive mode;
create schema if not exists ledger_private;
revoke all on schema ledger_private from public, anon, authenticated;
create table if not exists ledger_private.transactions_before_brand_product (
  id uuid primary key,
  original_row jsonb not null,
  migrated_at timestamptz
);
alter table ledger_private.transactions_before_brand_product enable row level security;
revoke all on ledger_private.transactions_before_brand_product from public, anon, authenticated;
insert into ledger_private.transactions_before_brand_product (id, original_row)
select id, to_jsonb(t) from public.transactions t
on conflict (id) do nothing;

alter table public.transactions add column if not exists brand text;
alter table public.transactions add column if not exists product text;
comment on column public.transactions.brand is 'Brand stated by the source; null when unknown.';
comment on column public.transactions.product is 'Product name including essential specifications and quantity.';
comment on column public.transactions.note is 'Shop, order number, discounts and other supporting information.';

do $migration$
declare
  r record;
  body text;
  brand_value text;
  shop_value text;
  order_value text;
  discount_value text;
  extra text[];
  matched text[];
  before_count bigint;
  before_total numeric;
  after_count bigint;
  after_total numeric;
begin
  select count(*), coalesce(sum(amount), 0) into before_count, before_total from public.transactions;
  for r in
    select t.id, t.note from public.transactions t
    join ledger_private.transactions_before_brand_product b using (id)
    where t.brand is null and t.product is null and b.migrated_at is null
      and t.note is not distinct from b.original_row ->> 'note'
  loop
    body := btrim(coalesce(r.note, ''));
    brand_value := null; shop_value := null; order_value := null; discount_value := null; extra := array[]::text[];

    -- Explicit leading [brand]. A shopping platform is not a product brand.
    matched := regexp_match(body, '^\[([^\]]+)\]\s*');
    if matched is not null then
      if matched[1] in ('淘宝', '京东', '天猫', '天猫超市', '未知品牌') then
        if matched[1] <> '未知品牌' then extra := array_append(extra, '渠道：' || matched[1]); end if;
      else brand_value := matched[1]; end if;
      body := regexp_replace(body, '^\[[^\]]+\]\s*', '');
    else
      -- These unbracketed brand prefixes were reviewed in the existing ledger.
      if body like '山姆 Boori %' then
        shop_value := '山姆'; body := regexp_replace(body, '^山姆\s+', '');
      elsif body like 'BUBBLETREE旗舰店 %' then
        shop_value := 'BUBBLETREE旗舰店'; body := regexp_replace(body, '^BUBBLETREE旗舰店\s+', '');
      end if;
      matched := regexp_match(body, '^(A\+A|Carhartt|Britax|Nest|bubbletree|babycare|英氏|Boori|波咯咯|懒角落|小白熊|Hoag|softkiss|babyviva)\s*', 'i');
      if matched is not null then
        brand_value := matched[1];
        body := substr(body, char_length(matched[0+1]) + 1);
        body := ltrim(body);
      end if;
    end if;

    -- Known order syntax, preserving leading zeros and alphanumeric IDs as text.
    matched := regexp_match(body, '[（(]?\s*订单(?:号)?\s*[:：#]?\s*([A-Za-z0-9]+)\s*[）)]?');
    if matched is not null then
      order_value := matched[1];
      body := regexp_replace(body, '[（(]?\s*订单(?:号)?\s*[:：#]?\s*[A-Za-z0-9]+\s*[）)]?', ' ');
    end if;

    matched := regexp_match(body, '(店铺优惠摊.+|优惠摊.+)$');
    if matched is not null then
      discount_value := matched[1];
      body := regexp_replace(body, '(店铺优惠摊.+|优惠摊.+)$', '');
    end if;

    matched := regexp_match(body, '\s+(\S*(?:旗舰店|专营店|专卖店)|天猫超市|寅妈母婴优选|我是孙大人)(?:\s|$)');
    if matched is not null then
      shop_value := matched[1];
      body := replace(body, matched[1], '');
    end if;

    matched := regexp_match(body, '[（(](天猫超市|天猫官旗|天猫旗舰|淘宝|京东|日本代购|闲鱼购买)[）)]');
    if matched is not null then
      if matched[1] = '天猫超市' then shop_value := matched[1];
      else extra := array_append(extra, '渠道：' || matched[1]); end if;
      body := regexp_replace(body, '[（(](天猫超市|天猫官旗|天猫旗舰|淘宝|京东|日本代购|闲鱼购买)[）)]', '');
    end if;

    matched := regexp_match(body, '顺丰SF[0-9]+');
    if matched is not null then
      extra := array_append(extra, '物流：' || matched[1]);
      body := replace(body, matched[1], '');
    end if;
    matched := regexp_match(body, '\d{4}-\d{2}-\d{2}');
    if matched is not null then
      extra := array_append(extra, '原记录日期：' || matched[1]);
      body := replace(body, matched[1], '');
    end if;
    matched := regexp_match(body, '\$[0-9]+(?:\.[0-9]+)?');
    if matched is not null then
      extra := array_append(extra, '原记录金额：' || matched[1]);
      body := replace(body, matched[1], '');
    end if;
    body := btrim(regexp_replace(body, '\s+', ' ', 'g'));
    update public.transactions set
      brand = nullif(brand_value, ''),
      product = nullif(body, ''),
      note = nullif(concat_ws(E'\n',
        case when shop_value is not null then '店铺：' || shop_value end,
        case when order_value is not null then '订单号：' || order_value end,
        case when discount_value is not null then '优惠：' || discount_value end,
        nullif(array_to_string(extra, E'\n'), '')
      ), '')
    where id = r.id;
    update ledger_private.transactions_before_brand_product set migrated_at = now() where id = r.id;
  end loop;
  select count(*), coalesce(sum(amount), 0) into after_count, after_total from public.transactions;
  if before_count <> after_count or before_total <> after_total then
    raise exception 'Ledger totals changed; rolling back migration';
  end if;
  if exists (
    select 1 from public.transactions t join ledger_private.transactions_before_brand_product b using (id)
    where b.migrated_at = now() and (
      t.amount is distinct from (b.original_row ->> 'amount')::numeric
      or t.type is distinct from b.original_row ->> 'type'
      or t.category is distinct from b.original_row ->> 'category'
      or t.transaction_time is distinct from (b.original_row ->> 'transaction_time')::timestamptz
      or t.created_at is distinct from (b.original_row ->> 'created_at')::timestamptz
    )
  ) then raise exception 'Protected ledger fields changed; rolling back migration'; end if;
end
$migration$;
commit;
