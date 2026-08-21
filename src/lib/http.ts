import { timingSafeEqual } from 'node:crypto';
import { isGitHubProvider, isOwnerEmail } from '../../lib/auth';
import { getSupabaseClient } from '../../lib/supabase';

export function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function secureEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export type WriteAuth =
  | { method: 'api-key' }
  | { method: 'github'; userId: string };

export async function validateWriteAuth(request: Request): Promise<WriteAuth | null> {
  const apiKey = process.env.API_KEY || import.meta.env.API_KEY || '';
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  const [type, token] = authHeader.split(' ');
  if (type !== 'Bearer' || !token) return null;

  if (apiKey && secureEqual(token, apiKey)) {
    return { method: 'api-key' };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  if (!isOwnerEmail(data.user.email) || !isGitHubProvider(data.user.app_metadata)) {
    return null;
  }

  return { method: 'github', userId: data.user.id };
}
