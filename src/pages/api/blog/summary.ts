import type { APIRoute } from 'astro';
import { json } from '../../../lib/http';

export const POST: APIRoute = async () => {
  return json(
    { error: 'AI summary endpoint is disabled in the Astro migration until external AI forwarding is approved.' },
    { status: 503 },
  );
};
