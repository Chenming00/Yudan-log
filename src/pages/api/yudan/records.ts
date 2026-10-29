import type { APIRoute } from 'astro';
import { getSupabaseAdminClient } from '../../../../lib/supabase';
import { json, validateWriteAuth } from '../../../lib/http';
import { getOwnerContext, HealthConflictError, mutateHealthRecord } from '../../../lib/yudan-api';
import { validateHealthMutation } from '../../../lib/health-records';

export const POST: APIRoute = async ({ request }) => {
  const headers = { 'Cache-Control': 'private, no-store' };
  const auth = await validateWriteAuth(request);
  if (!auth) return json({ error: '请使用授权的 GitHub 账号登录。' }, { status: 401, headers });
  let mutation;
  try {
    mutation = validateHealthMutation(await request.json());
    if (auth.method === 'github' && mutation.expected_updated_at === undefined) throw new Error('缺少记录版本，请重新读取后保存。');
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : '无效请求。' }, { status: 400, headers });
  }
  try {
    const userId = auth.method === 'github' ? auth.userId : (await getOwnerContext()).userId;
    const data = await mutateHealthRecord(getSupabaseAdminClient(), userId, mutation);
    return json({ success: true, data }, { headers });
  } catch (error) {
    if (error instanceof HealthConflictError) return json({ error: error.message, current: error.current }, { status: 409, headers });
    return json({ error: error instanceof Error ? error.message : '记录保存失败，请稍后重试。' }, { status: 500, headers });
  }
};
