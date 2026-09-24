import { randomUUID } from 'node:crypto';
import { getSupabaseAdminClient } from '../../lib/supabase';
import { json, validateWriteAuth } from './http';
import { LedgerInputError, ledgerObject, LEDGER_UUID, parseLedgerMutation, type LedgerMutationAction } from './ledger-input';

const MAX_BODY_BYTES = 64 * 1024;
const BUSINESS_ERRORS = {
  LEDGER_NOT_FOUND: { status: 404, error: '账单不存在或已被删除' },
  LEDGER_CONFLICT: { status: 409, error: '账单已被修改，请读取最新内容后再操作' },
  IDEMPOTENCY_CONFLICT: { status: 409, error: '此请求编号已用于其他操作，请刷新后重试' },
  INVALID_INPUT: { status: 400, error: '账单内容不合法，请检查后重试' },
} as const;

async function readBody(request: Request): Promise<unknown> {
  const length = request.headers.get('content-length');
  if (length && /^\d+$/.test(length) && Number(length) > MAX_BODY_BYTES) throw new LedgerInputError('请求内容过大，请缩短备注后重试', 413, 'PAYLOAD_TOO_LARGE');
  if (!request.body) throw new LedgerInputError('请提供有效的 JSON 对象');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new LedgerInputError('请求内容过大，请缩短备注后重试', 413, 'PAYLOAD_TOO_LARGE');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new LedgerInputError('请求内容不是有效的 JSON');
  }
}

function isRow(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === 'string' && LEDGER_UUID.test(row.id) && typeof row.version === 'number' && Number.isInteger(row.version) && row.version > 0;
}

function missingMutation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return (code === 'PGRST202' || code === '42883') && typeof message === 'string' && message.includes('ledger_mutate');
}

/** All writes use one atomic database operation; uncertain failures can safely retry the same request_id. */
export async function handleLedgerMutation(request: Request, action: LedgerMutationAction): Promise<Response> {
  const traceId = randomUUID();
  let requestId: string | undefined;
  let failureCode = 'LEDGER_AUTH_FAILED';
  const respond = (body: Record<string, unknown>, status = 200) => json({ ...body, ...(requestId ? { request_id: requestId } : {}), trace_id: traceId }, {
    status, headers: { 'Cache-Control': 'no-store', 'X-Trace-Id': traceId },
  });
  const fail = (code: string, error: string, status: number, extra: Record<string, unknown> = {}) => {
    // Only operational metadata is logged. Never include fields, credentials, or raw database errors.
    console.error('ledger_mutation_failed', { action, code, trace_id: traceId });
    return respond({ success: false, code, error, ...extra }, status);
  };

  try {
    if (!await validateWriteAuth(request)) return fail('UNAUTHORIZED', '请使用授权 GitHub 账号或有效 API Key', 401);
    failureCode = 'LEDGER_WRITE_FAILED';
    const input = ledgerObject(await readBody(request));
    if (input.request_id !== undefined && (typeof input.request_id !== 'string' || !LEDGER_UUID.test(input.request_id))) throw new LedgerInputError('request_id 必须是有效的 UUID');
    requestId = typeof input.request_id === 'string' ? input.request_id : randomUUID();
    const { id, expectedVersion, fields } = parseLedgerMutation(input, action);
    const { data, error } = await getSupabaseAdminClient().rpc('ledger_mutate', {
      p_action: action, p_request_id: requestId, p_id: id,
      p_expected_version: expectedVersion, p_fields: fields,
    });
    if (error) {
      if (missingMutation(error)) return fail('LEDGER_MIGRATION_REQUIRED', '账本数据库需要升级，请完成账本写入迁移后重试', 503);
      return fail('LEDGER_WRITE_FAILED', '账单操作暂时失败，请使用同一请求编号重试', 500);
    }
    if (data?.success === true && isRow(data.data) && typeof data.replayed === 'boolean') return respond({ success: true, data: data.data, replayed: data.replayed });
    if (data?.success === false && typeof data.code === 'string' && Object.hasOwn(BUSINESS_ERRORS, data.code)) {
      const code = data.code as keyof typeof BUSINESS_ERRORS;
      const detail = BUSINESS_ERRORS[code];
      return fail(code, detail.error, detail.status, code === 'LEDGER_CONFLICT' && isRow(data.current) ? { current: data.current } : {});
    }
    return fail('LEDGER_WRITE_FAILED', '账单操作结果暂时无法确认，请使用同一请求编号重试', 500);
  } catch (error: unknown) {
    if (error instanceof LedgerInputError) return fail(error.code, error.message, error.status);
    return fail(failureCode, failureCode === 'LEDGER_AUTH_FAILED' ? '身份验证暂时不可用，请稍后重试' : '账单操作暂时失败，请使用同一请求编号重试', 500);
  }
}
