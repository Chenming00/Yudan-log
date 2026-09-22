-- 用户提供的三张疫苗方案图：30 条目录记录，包含甲肝二选一方案。
-- 费用为图片参考价，保存在 schedule_note；不是实际账单金额。
-- 先部署保留停用计划历史记录的网页修复，再执行本文件。
-- 在已执行 health-schema.sql 和 yudan-schema.sql 的数据库上运行。
-- 保留同类剂次的原有 ID；五联、AC结合、ACYW135 和灭活甲肝使用独立 ID。
-- 不把单苗既往接种自动改记为联合疫苗。旧条目仅停用，接种记录不删除。
begin;

lock table public.yudan_vaccine_catalog in share row exclusive mode;
lock table public.yudan_vaccine_records in share mode;

create temporary table vaccine_records_before on commit drop as
select * from public.yudan_vaccine_records;

create temporary table desired_vaccine_catalog on commit drop as
select * from public.yudan_vaccine_catalog where false;

insert into desired_vaccine_catalog (id, sort_order, age_months, age_label, vaccine, dose, funding, date_rule, date_offset_days, source, region, schedule_version, prevents, aliases, audience, schedule_note, active)
values
  ('schedule-002', 1, 0, '出生时', '卡介苗', '1 剂', 'free', null, 0, '用户提供的《2026最快疫苗接种方案》三张图片（@科学育儿小小p）；按图整理，非官方免疫程序', '地区未注明（用户提供图片）', '2026-09-22-user-images', '结核病', array['BCG', '结核疫苗']::text[], null, '免费。图示出生 24 小时内接种。', true),
  ('schedule-001', 2, 0, '出生时', '乙肝疫苗', '第 1 剂', 'free', null, 0, '用户提供的《2026最快疫苗接种方案》三张图片（@科学育儿小小p）；按图整理，非官方免疫程序', '地区未注明（用户提供图片）', '2026-09-22-user-images', '乙型肝炎', array['乙肝', 'HepB', '重组乙型肝炎疫苗']::text[], null, '免费。图示出生时接种。', true),
  ('schedule-003', 3, 1, '1 月龄', '乙肝疫苗', '第 2 剂', 'free', null, 0, '用户提供的《2026最快疫苗接种方案》三张图片（@科学育儿小小p）；按图整理，非官方免疫程序', '地区未注明（用户提供图片）', '2026-09-22-user-images', '乙型肝炎', array['乙肝', 'HepB', '重组乙型肝炎疫苗']::text[], null, '免费。图示与上一剂间隔 28 天。', true),
  ('penta-001', 4, 2, '2 月龄', '五联疫苗', '第 1 剂', 'paid', null, 0, '用户提供的《2026最快疫苗接种方案》三张图片（@科学育儿小小p）；按图整理，非官方免疫程序', '地区未注明（用户提供图片）', '2026-09-22-user-images', '百日咳、白喉、破伤风、脊髓灰质炎及 b 型流感嗜血杆菌感染', array['五联', 'DTaP-IPV-Hib', '吸附无细胞百白破灭活脊髓灰质炎和b型流感嗜血杆菌联合疫苗']::text[], null, '图片参考价 638 元/剂，各地区价格可能不同。共 4 剂；五联为联合替代方案。', true),
  ('schedule-008', 5, 2, '2 月龄', '五价轮状病毒口服疫苗', '第 1 剂', 'paid', null, 0, '用户提供的《2026最快疫苗接种方案》三张图片（@科学育儿小小p）；按图整理，非官方免疫程序', '地区未注明（用户提供图片）', '2026-09-22-user-images', '轮状病毒胃肠炎', array['五价轮状口服', '五价轮状病毒疫苗', '轮状病毒疫苗', '轮状疫苗', 'RV5']::text[], null, '图片参考价 315 元/剂，各地区价格可能不同。共 3 剂，口服；图示首剂 6–12 周龄。', true),
  ('schedule-006', 6, 2, '2 月龄', '13价肺炎球菌结合疫苗', '第 1 剂', 'paid', null, 0, '用户提供的《2026最快疫苗接种方案》三张图片（@科学育儿小小p）；按图整理，非官方免疫程序', '地区未注明（用户提供图片）', '2026-09-22-user-images', '肺炎球菌引起的肺炎、脑膜炎、菌血症等', array['13价肺炎疫苗', '13价肺炎', '肺炎疫苗', '肺炎球菌结合疫苗 PCV', 'PCV13']::text[], null, '图片参考价 633 元/剂，各地区价格可能不同。共 4 剂；图示最早 2 月龄起接种。', true),
  ('penta-002', 7, 3, '3 月龄', '五联疫苗', '第 2 剂', 'paid', null, 0, '用户提供的《2026最快疫苗接种方案》三张图片（@科学育儿小小p）；按图整理，非官方免疫程序', '地区未注明（用户提供图片）', '2026-09-22-user-images', '百日咳、白喉、破伤风、脊髓灰质炎及 b 型流感嗜血杆菌感染', array['五联', 'DTaP-IPV-Hib', '吸附无细胞百白破灭活脊髓灰质炎和b型流感嗜血杆菌联合疫苗']::text[], null, '图片参考价 638 元/剂，各地区价格可能不同。共 4 剂。', true),
  ('schedule-014', 8, 3, '3 月龄', '五价轮状病毒口服疫苗', '第 2 剂', 'paid', null, 0, '用户提供的《2026最快疫苗接种方案》三张图片（@科学育儿小小p）；按图整理，非官方免疫程序', '地区未注明（用户提供图片）', '2026-09-22-user-images', '轮状病毒胃肠炎', array['五价轮状口服', '五价轮状病毒疫苗', '轮状病毒疫苗', '轮状疫苗', 'RV5']::text[], null, '图片参考价 315 元/剂，各地区价格可能不同。共 3 剂，口服；图示与第 1 剂间隔 4–10 周。', true),
  ('schedule-012', 9, 3, '3 月龄', '13价肺炎球菌结合疫苗', '第 2 剂', 'paid', null, 0, '用户提供的《2026最快疫苗接种方案》三张图片（@科学育儿小小p）；按图整理，非官方免疫程序', '地区未注明（用户提供图片）', '2026-09-22-user-images', '肺炎球菌引起的肺炎、脑膜炎、菌血症等', array['13价肺炎疫苗', '13价肺炎', '肺炎疫苗', '肺炎球菌结合疫苗 PCV', 'PCV13']::text[], null, '图片参考价 633 元/剂，各地区价格可能不同。共 4 剂；原图写“与第1针隔小于2个月”，间隔需按具体产品说明书及接种门诊核对。', true),
  ('penta-003', 10, 4, '4 月龄', '五联疫苗', '第 3 剂', 'paid', null, 0, '用户提供的《2026最快疫苗接种方案》三张图片（@科学育儿小小p）；按图整理，非官方免疫程序', '地区未注明（用户提供图片）', '2026-09-22-user-images', '百日咳、白喉、破伤风、脊髓灰质炎及 b 型流感嗜血杆菌感染', array['五联', 'DTaP-IPV-Hib', '吸附无细胞百白破灭活脊髓灰质炎和b型流感嗜血杆菌联合疫苗']::text[], null, '图片参考价 638 元/剂，各地区价格可能不同。共 4 剂；图示与第 2 剂间隔 ≥1 个月。', true),
  ('schedule-020', 11, 4, '4 月龄', '五价轮状病毒口服疫苗', '第 3 剂', 'paid', null, 0, '用户提供的《2026最快疫苗接种方案》三张图片（@科学育儿小小p）；按图整理，非官方免疫程序', '地区未注明（用户提供图片）', '2026-09-22-user-images', '轮状病毒胃肠炎', array['五价轮状口服', '五价轮状病毒疫苗', '轮状病毒疫苗', '轮状疫苗', 'RV5']::text[], null, '图片参考价 315 元/剂，各地区价格可能不同。共 3 剂，口服；图示与第 2 剂间隔 4–10 周，≤8 月龄完成。', true),
  ('schedule-018', 12, 5, '5 月龄', '13价肺炎球菌结合疫苗', '第 3 剂', 'paid', null, 0, '用户提供的《2026最快疫苗接种方案》三张图片（@科学育儿小小p）；按图整理，非官方免疫程序', '地区未注明（用户提供图片）', '2026-09-22-user-images', '肺炎球菌引起的肺炎、脑膜炎、菌血症等', array['13价肺炎疫苗', '13价肺炎', '肺炎疫苗', '肺炎球菌结合疫苗 PCV', 'PCV13']::text[], null, '图片参考价 633 元/剂，各地区价格可能不同。共 4 剂；图示 ≤6 月龄完成。', true),
  ('schedule-015', 13, 6, '6 月龄', '乙肝疫苗', '第 3 剂', 'free', null, 0, '用户提供的《2026最快疫苗接种方案》三张图片（@科学育儿小小p）；按图整理，非官方免疫程序', '地区未注明（用户提供图片）', '2026-09-22-user-images', '乙型肝炎', array['乙肝', 'HepB', '重组乙型肝炎疫苗']::text[], null, '免费。图示 ≤12 月龄完成。', true),
  ('menac-conjugate-001', 14, 6, '6 月龄', '流脑AC结合疫苗', '第 1 剂', 'paid', null, 0, '用户提供的《2026最快疫苗接种方案》三张图片（@科学育儿小小p）；按图整理，非官方免疫程序', '地区未注明（用户提供图片）', '2026-09-22-user-images', 'A 群、C 群脑膜炎球菌感染', array['AC结合', 'A群C群脑膜炎球菌多糖结合疫苗', 'MenAC']::text[], null, '图片参考价 140 元/剂，各地区价格可能不同。共 2 剂。', true),
  ('schedule-023', 15, 6, '6 月龄', '手足口疫苗（EV71）', '第 1 剂', 'paid', null, 0, '用户提供的《2026最快疫苗接种方案》三张图片（@科学育儿小小p）；按图整理，非官方免疫程序', '地区未注明（用户提供图片）', '2026-09-22-user-images', 'EV71 型肠道病毒引起的手足口病', array['手足口疫苗', 'EV71', 'EV71 手足口疫苗']::text[], null, '图片参考价 210 元/剂，各地区价格可能不同。共 2 剂；图示 6 月龄后接种。', true),
  ('schedule-024', 16, 7, '7 月龄', '手足口疫苗（EV71）', '第 2 剂', 'paid', null, 0, '用户提供的《2026最快疫苗接种方案》三张图片（@科学育儿小小p）；按图整理，非官方免疫程序', '地区未注明（用户提供图片）', '2026-09-22-user-images', 'EV71 型肠道病毒引起的手足口病', array['手足口疫苗', 'EV71', 'EV71 手足口疫苗']::text[], null, '图片参考价 210 元/剂，各地区价格可能不同。共 2 剂；图示与第 1 剂至少间隔 1 个月。', true),
  ('schedule-026', 17, 8, '8 月龄', '乙脑减毒活疫苗', '第 1 剂', 'free', null, 0, '用户提供的《2026最快疫苗接种方案》三张图片（@科学育儿小小p）；按图整理，非官方免疫程序', '地区未注明（用户提供图片）', '2026-09-22-user-images', '流行性乙型脑炎', array['乙脑减毒疫苗', 'JE-L']::text[], null, '免费。共 2 剂；图示 ≤12 月龄完成。', true),
  ('schedule-025', 18, 8, '8 月龄', '麻腮风疫苗', '第 1 剂', 'free', null, 0, '用户提供的《2026最快疫苗接种方案》三张图片（@科学育儿小小p）；按图整理，非官方免疫程序', '地区未注明（用户提供图片）', '2026-09-22-user-images', '麻疹、流行性腮腺炎、风疹', array['麻腮风', 'MMR', '麻腮风疫苗 MMR']::text[], null, '免费。共 2 剂。', true),
  ('menac-conjugate-002', 19, 9, '9 月龄', '流脑AC结合疫苗', '第 2 剂', 'paid', null, 0, '用户提供的《2026最快疫苗接种方案》三张图片（@科学育儿小小p）；按图整理，非官方免疫程序', '地区未注明（用户提供图片）', '2026-09-22-user-images', 'A 群、C 群脑膜炎球菌感染', array['AC结合', 'A群C群脑膜炎球菌多糖结合疫苗', 'MenAC']::text[], null, '图片参考价 140 元/剂，各地区价格可能不同。共 2 剂；图示与第 1 剂间隔 ≥3 个月。', true),
  ('schedule-028', 20, 12, '12 月龄', '13价肺炎球菌结合疫苗', '第 4 剂', 'paid', null, 0, '用户提供的《2026最快疫苗接种方案》三张图片（@科学育儿小小p）；按图整理，非官方免疫程序', '地区未注明（用户提供图片）', '2026-09-22-user-images', '肺炎球菌引起的肺炎、脑膜炎、菌血症等', array['13价肺炎疫苗', '13价肺炎', '肺炎疫苗', '肺炎球菌结合疫苗 PCV', 'PCV13']::text[], null, '图片参考价 633 元/剂，各地区价格可能不同。共 4 剂；图示 ≤15 月龄完成。', true),
  ('schedule-030', 21, 12, '12 月龄', '水痘疫苗', '第 1 剂', 'paid', null, 0, '用户提供的《2026最快疫苗接种方案》三张图片（@科学育儿小小p）；按图整理，非官方免疫程序', '地区未注明（用户提供图片）', '2026-09-22-user-images', '水痘', array['水痘', 'Varicella']::text[], null, '图片参考价 150 元/剂，各地区价格可能不同。共 2 剂。', true),
  ('penta-004', 22, 18, '18 月龄', '五联疫苗', '第 4 剂', 'paid', null, 0, '用户提供的《2026最快疫苗接种方案》三张图片（@科学育儿小小p）；按图整理，非官方免疫程序', '地区未注明（用户提供图片）', '2026-09-22-user-images', '百日咳、白喉、破伤风、脊髓灰质炎及 b 型流感嗜血杆菌感染', array['五联', 'DTaP-IPV-Hib', '吸附无细胞百白破灭活脊髓灰质炎和b型流感嗜血杆菌联合疫苗']::text[], null, '图片参考价 638 元/剂，各地区价格可能不同。共 4 剂；图示与第 3 剂间隔 ≥6 个月。', true),
  ('schedule-031', 23, 18, '18 月龄', '麻腮风疫苗', '第 2 剂', 'free', null, 0, '用户提供的《2026最快疫苗接种方案》三张图片（@科学育儿小小p）；按图整理，非官方免疫程序', '地区未注明（用户提供图片）', '2026-09-22-user-images', '麻疹、流行性腮腺炎、风疹', array['麻腮风', 'MMR', '麻腮风疫苗 MMR']::text[], null, '免费。共 2 剂。', true),
  ('schedule-033', 24, 18, '18 月龄', '甲肝减毒活疫苗', '1 剂', 'free', null, 0, '用户提供的《2026最快疫苗接种方案》三张图片（@科学育儿小小p）；按图整理，非官方免疫程序', '地区未注明（用户提供图片）', '2026-09-22-user-images', '甲型肝炎', array['甲肝减毒疫苗', 'HepA-L']::text[], null, '免费。与灭活甲肝两剂方案二选一，不叠加接种；具体选择由接种门诊确认。', true),
  ('hepa-inactivated-001', 25, 18, '18 月龄', '灭活甲肝疫苗', '第 1 剂', 'paid', null, 0, '用户提供的《2026最快疫苗接种方案》三张图片（@科学育儿小小p）；按图整理，非官方免疫程序', '地区未注明（用户提供图片）', '2026-09-22-user-images', '甲型肝炎', array['甲肝灭活疫苗', 'HepA-I']::text[], null, '图片参考价 231 元/剂，各地区价格可能不同。替代方案，共 2 剂；与甲肝减毒活疫苗二选一。', true),
  ('hepa-inactivated-002', 26, 24, '2 周岁', '灭活甲肝疫苗', '第 2 剂', 'paid', null, 0, '用户提供的《2026最快疫苗接种方案》三张图片（@科学育儿小小p）；按图整理，非官方免疫程序', '地区未注明（用户提供图片）', '2026-09-22-user-images', '甲型肝炎', array['甲肝灭活疫苗', 'HepA-I']::text[], null, '图片参考价 231 元/剂，各地区价格可能不同。替代方案，共 2 剂；已接种甲肝减毒活疫苗者不按此方案重复接种。', true),
  ('schedule-035', 27, 24, '2 周岁', '乙脑减毒活疫苗', '第 2 剂', 'free', null, 0, '用户提供的《2026最快疫苗接种方案》三张图片（@科学育儿小小p）；按图整理，非官方免疫程序', '地区未注明（用户提供图片）', '2026-09-22-user-images', '流行性乙型脑炎', array['乙脑减毒疫苗', 'JE-L']::text[], null, '免费。共 2 剂；图示 ≤3 周岁完成。', true),
  ('menacyw135-001', 28, 36, '3 周岁', 'ACYW135流脑疫苗', '第 1 剂', 'paid', null, 0, '用户提供的《2026最快疫苗接种方案》三张图片（@科学育儿小小p）；按图整理，非官方免疫程序', '地区未注明（用户提供图片）', '2026-09-22-user-images', 'A 群、C 群、Y 群、W135 群脑膜炎球菌感染', array['ACYW135', '四价流脑疫苗', 'ACYW135流脑']::text[], null, '图片参考价 85 元/剂，各地区价格可能不同。共 2 剂；图片未明确该行疫苗的具体制剂，需按产品及门诊确认。', true),
  ('schedule-040', 29, 48, '4 周岁', '水痘疫苗', '第 2 剂', 'paid', null, 0, '用户提供的《2026最快疫苗接种方案》三张图片（@科学育儿小小p）；按图整理，非官方免疫程序', '地区未注明（用户提供图片）', '2026-09-22-user-images', '水痘', array['水痘', 'Varicella']::text[], null, '图片参考价 150 元/剂，各地区价格可能不同。共 2 剂。', true),
  ('menacyw135-002', 30, 72, '6 周岁', 'ACYW135流脑疫苗', '第 2 剂', 'paid', null, 0, '用户提供的《2026最快疫苗接种方案》三张图片（@科学育儿小小p）；按图整理，非官方免疫程序', '地区未注明（用户提供图片）', '2026-09-22-user-images', 'A 群、C 群、Y 群、W135 群脑膜炎球菌感染', array['ACYW135', '四价流脑疫苗', 'ACYW135流脑']::text[], null, '图片参考价 85 元/剂，各地区价格可能不同。共 2 剂；图示初次免疫 2–3 年后接种。', true);

-- sort_order 全表唯一：先将旧目录移至所有现有排序之后，避免重排时冲突。
-- 已迁移到预留区的历史行不再移动，使重复执行保持相同结果。
with displaced as (
  select id, row_number() over (order by sort_order, id)::integer as offset
  from public.yudan_vaccine_catalog where sort_order <= 30
), bounds as (
  select greatest(coalesce(max(sort_order), 0), 1000) as base
  from public.yudan_vaccine_catalog
)
update public.yudan_vaccine_catalog c
set sort_order = bounds.base + displaced.offset
from displaced, bounds where c.id = displaced.id;

-- 仅停用本项目旧版目录；不影响未知的自定义目录。
update public.yudan_vaccine_catalog
set active = false, updated_at = now()
where id ~ '^schedule-0(0[1-9]|[1-3][0-9]|4[0-6])$'
  and active
  and id not in (select id from desired_vaccine_catalog);

insert into public.yudan_vaccine_catalog (id, sort_order, age_months, age_label, vaccine, dose, funding, date_rule, date_offset_days, source, region, schedule_version, prevents, aliases, audience, schedule_note, active)
select id, sort_order, age_months, age_label, vaccine, dose, funding, date_rule, date_offset_days, source, region, schedule_version, prevents, aliases, audience, schedule_note, active from desired_vaccine_catalog
on conflict (id) do update set
  sort_order = excluded.sort_order,
  age_months = excluded.age_months,
  age_label = excluded.age_label,
  vaccine = excluded.vaccine,
  dose = excluded.dose,
  funding = excluded.funding,
  date_rule = excluded.date_rule,
  date_offset_days = excluded.date_offset_days,
  source = excluded.source,
  region = excluded.region,
  schedule_version = excluded.schedule_version,
  prevents = excluded.prevents,
  aliases = excluded.aliases,
  audience = excluded.audience,
  schedule_note = excluded.schedule_note,
  active = excluded.active,
  updated_at = now();

do $verify$
begin
  if (select count(*) from public.yudan_vaccine_catalog
      where active and schedule_version = '2026-09-22-user-images') <> 30 then
    raise exception '新疫苗目录剂次数量不符，整笔更新回滚';
  end if;
  if exists (
    (select * from public.yudan_vaccine_records except select * from vaccine_records_before)
    union all
    (select * from vaccine_records_before except select * from public.yudan_vaccine_records)
  ) then
    raise exception '历史接种记录发生变化，整笔更新回滚';
  end if;
end $verify$;

commit;

select id, age_label, vaccine, dose, funding, schedule_note
from public.yudan_vaccine_catalog
where active and schedule_version = '2026-09-22-user-images'
order by sort_order;

