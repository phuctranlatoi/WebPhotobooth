import { NextRequest } from 'next/server';
import prisma from '../db';
import { createHash } from 'crypto';

export async function authenticateBooth(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'UNAUTHORIZED_BOOTH', status: 401 };
  }

  const apiKey = authHeader.substring(7);
  const pepper = process.env.BOOTH_KEY_PEPPER || '';
  const hash = createHash('sha256').update(apiKey + pepper).digest('hex');

  try {
    const booth = await prisma.booth.findUnique({
      where: { api_key_hash: hash }
    });

    if (!booth || booth.status !== 'ACTIVE') {
      return { error: 'UNAUTHORIZED_BOOTH', status: 401 };
    }

    return { booth };
  } catch {
    return { error: 'INTERNAL_ERROR', status: 500 };
  }
}
