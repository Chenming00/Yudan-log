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

export function validateAuth(request: Request) {
  const apiKey = process.env.API_KEY || import.meta.env.API_KEY || '';
  if (!apiKey) return false;

  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;

  const [type, token] = authHeader.split(' ');
  return type === 'Bearer' && Boolean(token) && token === apiKey;
}
