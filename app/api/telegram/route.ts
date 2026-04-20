import { NextRequest, NextResponse } from 'next/server';
import { parseMessage } from '@/lib/parser';

const API_KEY = process.env.API_KEY || '';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const text = payload.message?.text;

    if (!text) {
      return NextResponse.json({ ok: true }); // Ignore non-text messages
    }

    const parsed = parseMessage(text);
    if (!parsed) {
      // Could send a "Couldn't parse" message back to Telegram here
      return NextResponse.json({ ok: true, error: 'Could not parse message' });
    }

    // Call /api/add with structured data
    const response = await fetch(`${BASE_URL}/api/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(parsed),
    });

    const result = await response.json();

    return NextResponse.json({ ok: true, result });
  } catch (error: any) {
    console.error('Telegram Webhook Error:', error);
    return NextResponse.json({ ok: true, error: error.message });
  }
}
