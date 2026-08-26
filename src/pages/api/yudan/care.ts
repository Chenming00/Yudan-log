import type { APIRoute } from 'astro';
import { json, validateApiKey } from '../../../lib/http';
import { YUDAN_BIRTHDAY, ZHENGZHENG_CARE_MILESTONES } from '../../../lib/yudan-profile';

export const GET: APIRoute = async ({ request }) => {
  if (!validateApiKey(request)) {
    return json({ error: 'API Key 无效或未提供' }, { status: 401 });
  }

  return json(
    {
      success: true,
      data: {
        provider: '卓正儿童保健',
        birthday: YUDAN_BIRTHDAY,
        milestones: ZHENGZHENG_CARE_MILESTONES.map((item) => ({
          id: item.id,
          label: item.label,
          date: item.date,
          weekday: item.weekday,
        })),
      },
    },
    { headers: { 'Cache-Control': 'public, max-age=3600' } }
  );
};
