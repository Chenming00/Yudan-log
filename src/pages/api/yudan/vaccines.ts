import type { APIRoute } from 'astro';
import { getErrorMessage, json, validateApiKey } from '../../../lib/http';
import {
  getOwnerDashboard,
  getVaccineCatalog,
  getVaccineRecords,
  suggestedDateForPlan,
} from '../../../lib/yudan-api';

export const GET: APIRoute = async ({ request }) => {
  if (!validateApiKey(request)) {
    return json({ error: 'API Key 无效或未提供' }, { status: 401 });
  }

  try {
    const { supabase, row } = await getOwnerDashboard();
    const [catalog, records] = await Promise.all([
      getVaccineCatalog(supabase),
      getVaccineRecords(supabase, row.user_id),
    ]);

    const plans = catalog.map((plan) => {
      const record = records.find(
        (item) =>
          item.planId === plan.id ||
          item.id === plan.id ||
          (item.vaccine === plan.vaccine &&
            item.dose === plan.dose &&
            item.ageLabel === plan.age_label)
      );

      return {
        plan_id: plan.id,
        vaccine: plan.vaccine,
        dose: plan.dose,
        age_label: plan.age_label,
        funding: plan.funding,
        prevents: plan.prevents,
        audience: plan.audience,
        region: plan.region,
        schedule_version: plan.schedule_version,
        schedule_note: plan.schedule_note,
        source: plan.source,
        suggested_date: suggestedDateForPlan(row.birthday, plan),
        actual_date: record?.doneDate || null,
      };
    });

    return json(
      { success: true, data: plans },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: unknown) {
    return json({ error: getErrorMessage(error, '读取疫苗目录失败') }, { status: 500 });
  }
};
