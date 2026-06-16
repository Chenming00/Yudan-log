import type { APIRoute } from 'astro';
import { parseMessage } from '../../../lib/parser';
import { getErrorMessage, json } from '../../lib/http';

const API_KEY = process.env.API_KEY || import.meta.env.API_KEY || '';
const BASE_URL = process.env.BASE_URL || import.meta.env.PUBLIC_BASE_URL || 'http://localhost:3000';

export const POST: APIRoute = async ({ request }) => {
  try {
    const payload = await request.json();
    const text = payload.message?.text;

    if (!text) {
      return json({ ok: true });
    }

    const parsed = parseMessage(text);
    if (!parsed) {
      return json({ ok: true, error: 'Could not parse message' });
    }

    const response = await fetch(`${BASE_URL}/api/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(parsed),
    });

    const result = await response.json();
    return json({ ok: true, result });
  } catch (error: unknown) {
    console.error('Telegram Webhook Error:', error);
    return json({ ok: true, error: getErrorMessage(error, 'Unknown telegram webhook error') });
  }
};
