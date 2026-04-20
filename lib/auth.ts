import { NextRequest } from 'next/server';

const API_KEY = process.env.API_KEY || '';

export function validateAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return false;

  const [type, token] = authHeader.split(' ');
  if (type !== 'Bearer' || token !== API_KEY) {
    return false;
  }

  return true;
}
