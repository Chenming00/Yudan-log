import type { APIRoute } from 'astro';
import { getErrorMessage, json, validateApiKey } from '../../../lib/http';
import {
  getOwnerDashboard,
  getVaccineRecords,
  getWeightRecords,
} from '../../../lib/yudan-api';

export const GET: APIRoute = async ({ request }) => {
  if (!validateApiKey(request)) {
    return json({ error: 'API Key 无效或未提供' }, { status: 401 });
  }

  try {
    const { row } = await getOwnerDashboard();
    return json(
      {
        success: true,
        data: {
          birthday: row.birthday,
          vaccine_records: getVaccineRecords(row),
          weight_records: getWeightRecords(row),
          updated_at: row.updated_at,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: unknown) {
    return json({ error: getErrorMessage(error, '读取看板失败') }, { status: 500 });
  }
};
