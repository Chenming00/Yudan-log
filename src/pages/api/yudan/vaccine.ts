import type { APIRoute } from 'astro';
import { getErrorMessage, json, validateApiKey } from '../../../lib/http';
import {
  getVaccineRecords,
  readDate,
  readText,
  updateOwnerDashboard,
  vaccineRecordId,
  type YudanVaccineRecord,
} from '../../../lib/yudan-api';

export const POST: APIRoute = async ({ request }) => {
  if (!validateApiKey(request)) {
    return json({ error: 'API Key 无效或未提供' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    const value = await request.json();
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    body = value as Record<string, unknown>;
  } catch {
    return json({ error: '请提供有效的 JSON 请求体' }, { status: 400 });
  }

  try {
    const vaccine = readText(body.vaccine, 'vaccine', 100);
    const dose = readText(body.dose, 'dose', 50);
    const ageLabel = readText(body.age_label, 'age_label', 100);
    const doneDate = readDate(body.actual_date, 'actual_date');

    const saved = await updateOwnerDashboard((row) => {
      const records = getVaccineRecords(row);
      const existingIndex = records.findIndex(
        (item) =>
          item.vaccine === vaccine && item.dose === dose && item.ageLabel === ageLabel
      );
      const record: YudanVaccineRecord = {
        id:
          existingIndex >= 0
            ? records[existingIndex].id
            : vaccineRecordId(vaccine, dose, ageLabel),
        vaccine,
        dose,
        ageLabel,
        doneDate,
      };

      if (existingIndex >= 0) records[existingIndex] = record;
      else records.push(record);

      return {
        changes: { vaccine_records: records },
        result: { record, created: existingIndex < 0 },
      };
    });

    return json({ success: true, data: saved });
  } catch (error: unknown) {
    const message = getErrorMessage(error, '记录疫苗失败');
    const status = /vaccine|dose|age_label|actual_date|日期|字符|为空/.test(message)
      ? 400
      : 500;
    return json({ error: message }, { status });
  }
};
