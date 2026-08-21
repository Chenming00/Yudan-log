-- Canonical vaccine schedule used by the health module and API matching.
-- Run in Supabase SQL Editor for an existing YUDAN project.

create table if not exists public.yudan_vaccine_catalog (
  id text primary key,
  sort_order integer not null unique,
  age_months integer not null check (age_months >= 0),
  age_label text not null,
  vaccine text not null,
  dose text not null,
  funding text not null check (funding in ('free', 'paid')),
  date_rule text check (date_rule is null or date_rule in ('flu-season')),
  date_offset_days integer not null default 0 check (date_offset_days >= 0),
  source text not null default '中国国家免疫规划 2026；参考美国 CDC 儿童接种程序',
  region text not null default '浙江省杭州市',
  schedule_version text not null default '2026-08',
  prevents text not null default '',
  aliases text[] not null default '{}',
  audience text,
  schedule_note text,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.yudan_vaccine_catalog
  add column if not exists region text not null default '浙江省杭州市',
  add column if not exists schedule_version text not null default '2026-08',
  add column if not exists prevents text not null default '',
  add column if not exists aliases text[] not null default '{}',
  add column if not exists audience text,
  add column if not exists schedule_note text;

alter table public.yudan_vaccine_catalog
  alter column source set default '国家免疫规划疫苗儿童免疫程序及说明（2026年版）；浙江省杭州市 2026-08 清单';

alter table public.yudan_vaccine_catalog enable row level security;

revoke all on table public.yudan_vaccine_catalog from anon;
revoke all on table public.yudan_vaccine_catalog from authenticated;
grant select on table public.yudan_vaccine_catalog to authenticated;
grant select, insert, update, delete on table public.yudan_vaccine_catalog to service_role;

drop policy if exists "Owner can read the Yudan vaccine catalog" on public.yudan_vaccine_catalog;
create policy "Owner can read the Yudan vaccine catalog"
on public.yudan_vaccine_catalog
for select
to authenticated
using (
  lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'william.chen@utah.edu'
  and (
    (select auth.jwt()) -> 'app_metadata' ->> 'provider' = 'github'
    or ((select auth.jwt()) -> 'app_metadata' -> 'providers') ? 'github'
  )
);

insert into public.yudan_vaccine_catalog
  (id, sort_order, age_months, age_label, vaccine, dose, funding, date_rule, date_offset_days, active)
values
  ('schedule-001', 1, 0, '出生后 24 小时内', '乙肝疫苗', '第 1 剂', 'free', null, 0, true),
  ('schedule-002', 2, 0, '出生时', '卡介苗', '1 剂', 'free', null, 0, true),
  ('schedule-003', 3, 1, '1 月龄', '乙肝疫苗', '第 2 剂', 'free', null, 0, true),
  ('schedule-004', 4, 2, '2 月龄', '脊灰灭活疫苗 IPV', '第 1 剂', 'free', null, 0, true),
  ('schedule-005', 5, 2, '2 月龄', '百白破疫苗 DTaP', '第 1 剂', 'free', null, 0, true),
  ('schedule-006', 6, 2, '2 月龄', '肺炎球菌结合疫苗 PCV', '第 1 剂', 'paid', null, 0, true),
  ('schedule-007', 7, 2, '2 月龄', 'Hib 疫苗', '第 1 剂', 'paid', null, 0, true),
  ('schedule-008', 8, 2, '2 月龄', '轮状病毒疫苗', '第 1 剂', 'paid', null, 0, true),
  ('schedule-009', 9, 3, '3 月龄', '脊灰灭活疫苗 IPV', '第 2 剂', 'free', null, 0, true),
  ('schedule-010', 10, 4, '4 月龄', '脊灰减毒活疫苗 bOPV', '第 3 剂', 'free', null, 0, true),
  ('schedule-011', 11, 4, '4 月龄', '百白破疫苗 DTaP', '第 2 剂', 'free', null, 0, true),
  ('schedule-012', 12, 4, '4 月龄', '肺炎球菌结合疫苗 PCV', '第 2 剂', 'paid', null, 0, true),
  ('schedule-013', 13, 4, '4 月龄', 'Hib 疫苗', '第 2 剂', 'paid', null, 0, true),
  ('schedule-014', 14, 4, '4 月龄', '轮状病毒疫苗', '第 2 剂', 'paid', null, 0, true),
  ('schedule-015', 15, 6, '6 月龄', '乙肝疫苗', '第 3 剂', 'free', null, 0, true),
  ('schedule-016', 16, 6, '6 月龄', '百白破疫苗 DTaP', '第 3 剂', 'free', null, 0, true),
  ('schedule-017', 17, 6, '6 月龄', 'A 群流脑多糖疫苗', '第 1 剂', 'free', null, 0, true),
  ('schedule-018', 18, 6, '6 月龄', '肺炎球菌结合疫苗 PCV', '第 3 剂', 'paid', null, 0, true),
  ('schedule-019', 19, 6, '6 月龄（三剂基础程序）', 'Hib 疫苗', '第 3 剂', 'paid', null, 0, true),
  ('schedule-020', 20, 6, '6 月龄（三剂程序）', '轮状病毒疫苗', '第 3 剂', 'paid', null, 0, true),
  ('schedule-021', 21, 6, '满 6 月龄后的首个流感季', '流感疫苗', '首季第 1 剂', 'paid', 'flu-season', 0, true),
  ('schedule-022', 22, 6, '首剂后至少 4 周', '流感疫苗', '首季第 2 剂', 'paid', 'flu-season', 28, true),
  ('schedule-023', 23, 6, '6 月龄', 'EV71 手足口疫苗', '第 1 剂', 'paid', null, 0, true),
  ('schedule-024', 24, 7, '首剂后 1 个月', 'EV71 手足口疫苗', '第 2 剂', 'paid', null, 0, true),
  ('schedule-025', 25, 8, '8 月龄', '麻腮风疫苗 MMR', '第 1 剂', 'free', null, 0, true),
  ('schedule-026', 26, 8, '8 月龄', '乙脑减毒活疫苗', '第 1 剂', 'free', null, 0, true),
  ('schedule-027', 27, 9, '9 月龄', 'A 群流脑多糖疫苗', '第 2 剂', 'free', null, 0, true),
  ('schedule-028', 28, 12, '12-15 月龄', '肺炎球菌结合疫苗 PCV', '加强剂', 'paid', null, 0, true),
  ('schedule-029', 29, 12, '12-15 月龄', 'Hib 疫苗', '加强剂', 'paid', null, 0, true),
  ('schedule-030', 30, 12, '12-15 月龄', '水痘疫苗', '第 1 剂', 'paid', null, 0, true),
  ('schedule-031', 31, 18, '18 月龄', '麻腮风疫苗 MMR', '第 2 剂', 'free', null, 0, true),
  ('schedule-032', 32, 18, '18 月龄', '百白破疫苗 DTaP', '第 4 剂', 'free', null, 0, true),
  ('schedule-033', 33, 18, '18 月龄', '甲肝减毒活疫苗', '1 剂', 'free', null, 0, true),
  ('schedule-034', 34, 18, '第 2 个流感季', '流感疫苗', '年度接种', 'paid', 'flu-season', 0, true),
  ('schedule-035', 35, 24, '2 周岁', '乙脑减毒活疫苗', '第 2 剂', 'free', null, 0, true),
  ('schedule-036', 36, 30, '第 3 个流感季', '流感疫苗', '年度接种', 'paid', 'flu-season', 0, true),
  ('schedule-037', 37, 36, '3 周岁', '流脑疫苗（A 群 C 群）', '第 3 剂', 'free', null, 0, true),
  ('schedule-038', 38, 42, '第 4 个流感季', '流感疫苗', '年度接种', 'paid', 'flu-season', 0, true),
  ('schedule-039', 39, 48, '4 周岁', '脊灰减毒活疫苗 bOPV', '第 4 剂', 'free', null, 0, true),
  ('schedule-040', 40, 48, '4-6 周岁', '水痘疫苗', '第 2 剂', 'paid', null, 0, true),
  ('schedule-041', 41, 54, '第 5 个流感季', '流感疫苗', '年度接种', 'paid', 'flu-season', 0, true),
  ('schedule-042', 42, 66, '第 6 个流感季', '流感疫苗', '年度接种', 'paid', 'flu-season', 0, true),
  ('schedule-043', 43, 72, '6 周岁', '百白破疫苗 DTaP', '第 5 剂', 'free', null, 0, true),
  ('schedule-044', 44, 72, '6 周岁', '流脑疫苗（A 群 C 群）', '第 4 剂', 'free', null, 0, true),
  ('schedule-045', 45, 156, '13 周岁（女孩）', '双价 HPV 疫苗 2vHPV', '第 1 剂', 'free', null, 0, true),
  ('schedule-046', 46, 162, '首剂后 6 个月（女孩）', '双价 HPV 疫苗 2vHPV', '第 2 剂', 'free', null, 0, true)
on conflict (id) do update set
  sort_order = excluded.sort_order,
  age_months = excluded.age_months,
  age_label = excluded.age_label,
  vaccine = excluded.vaccine,
  dose = excluded.dose,
  funding = excluded.funding,
  date_rule = excluded.date_rule,
  date_offset_days = excluded.date_offset_days,
  active = excluded.active,
  updated_at = now();

update public.yudan_vaccine_catalog
set
  region = '浙江省杭州市',
  schedule_version = '2026-08',
  source = case
    when funding = 'free' then '国家免疫规划疫苗儿童免疫程序及说明（2026年版）；浙江省杭州市 2026-08 清单'
    else '浙江省杭州市 2026-08 自费疫苗建议清单；具体程序以产品说明书和接种门诊为准'
  end,
  prevents = case
    when vaccine like '乙肝疫苗%' then '乙型肝炎'
    when vaccine = '卡介苗' then '结核病'
    when vaccine like '脊灰%' then '脊髓灰质炎'
    when vaccine like '百白破%' then '百日咳、白喉、破伤风'
    when vaccine like 'A 群流脑%' then 'A 群脑膜炎球菌感染'
    when vaccine like '流脑疫苗%' then 'A 群、C 群脑膜炎球菌感染'
    when vaccine like '麻腮风%' then '麻疹、流行性腮腺炎、风疹'
    when vaccine like '乙脑%' then '流行性乙型脑炎'
    when vaccine like '甲肝%' then '甲型肝炎'
    when vaccine like '肺炎球菌%' then '肺炎球菌引起的肺炎、脑膜炎、菌血症等'
    when vaccine like 'Hib%' then 'b 型流感嗜血杆菌引起的脑膜炎、肺炎等'
    when vaccine like '轮状病毒%' then '轮状病毒胃肠炎'
    when vaccine like '流感疫苗%' then '流行性感冒'
    when vaccine like 'EV71%' then 'EV71 型肠道病毒导致的重症手足口病'
    when vaccine like '水痘疫苗%' then '水痘'
    when vaccine like '双价 HPV%' then 'HPV 感染及相关宫颈癌'
    else prevents
  end,
  aliases = case
    when vaccine = '乙肝疫苗' then array['乙肝', 'HepB', '重组乙型肝炎疫苗']
    when vaccine = '卡介苗' then array['BCG', '结核疫苗']
    when vaccine like '脊灰灭活%' then array['IPV', '脊灰 IPV', '脊髓灰质炎灭活疫苗']
    when vaccine like '脊灰减毒%' then array['bOPV', '脊灰 bOPV', '二价脊灰减毒活疫苗']
    when vaccine like '百白破%' then array['百白破', 'DTaP', '无细胞百白破疫苗']
    when vaccine like 'A 群流脑%' then array['A群流脑疫苗', 'A群流脑多糖疫苗', 'MPSV-A']
    when vaccine like '流脑疫苗%' then array['A+C群流脑疫苗', 'A群C群流脑多糖疫苗', 'MPSV-AC']
    when vaccine like '麻腮风%' then array['麻腮风', 'MMR', '麻疹腮腺炎风疹联合疫苗']
    when vaccine like '乙脑减毒%' then array['乙脑减毒活疫苗', 'JE-L']
    when vaccine like '甲肝减毒%' then array['甲肝疫苗', '甲肝减毒活疫苗', 'HepA-L']
    when vaccine like '肺炎球菌%' then array['肺炎疫苗', 'PCV', '肺炎球菌结合疫苗']
    when vaccine like 'Hib%' then array['Hib', 'b型流感嗜血杆菌疫苗']
    when vaccine like '轮状病毒%' then array['五价轮状病毒疫苗', '轮状疫苗', 'RV5']
    when vaccine like '流感疫苗%' then array['流感', 'Influenza']
    when vaccine like 'EV71%' then array['手足口疫苗', 'EV71疫苗', 'EV71手足口病疫苗']
    when vaccine like '水痘疫苗%' then array['水痘', 'Varicella']
    when vaccine like '双价 HPV%' then array['二价HPV疫苗', '2vHPV', '双价人乳头瘤病毒疫苗']
    else aliases
  end,
  audience = case when vaccine like '双价 HPV%' then '13 周岁女孩' else null end,
  schedule_note = case
    when vaccine like '轮状病毒%' then '存在严格起始和完成年龄限制，按实际产品说明书和接种门诊安排'
    when vaccine like '肺炎球菌%' or vaccine like 'Hib%' then '不同品牌程序可能不同，以疫苗说明书和接种门诊为准'
    when vaccine like '流感疫苗%' then '首次接种剂次取决于年龄和既往接种史，此后建议每年接种'
    when vaccine like '双价 HPV%' then '两剂间隔 6 个月，建议首剂后 12 个月内完成'
    else null
  end,
  updated_at = now();

comment on table public.yudan_vaccine_catalog is
  'Canonical vaccine schedule. API callers reference plan IDs instead of manually supplying labels.';
