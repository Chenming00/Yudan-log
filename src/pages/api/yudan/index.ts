import type { APIRoute } from 'astro';
import { getErrorMessage, json } from '../../../lib/http';
import {
  getOwnerDashboard,
  getVaccineCatalog,
  getVaccineRecords,
  getWeightRecords,
} from '../../../lib/yudan-api';

export const GET: APIRoute = async () => {
  try {
    const [{ row }, vaccineCatalog] = await Promise.all([
      getOwnerDashboard(),
      getVaccineCatalog(),
    ]);
    return json(
      {
        success: true,
        data: {
          birthday: row.birthday,
          vaccine_records: getVaccineRecords(row),
          weight_records: getWeightRecords(row),
          vaccine_catalog: vaccineCatalog,
          updated_at: row.updated_at,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: unknown) {
    return json({ error: getErrorMessage(error, '读取看板失败') }, { status: 500 });
  }
};
