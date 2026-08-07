import { randomBytes, createHash } from 'crypto';

export function generateToken(length: number = 24): string {
  return randomBytes(length).toString('base64url');
}

export function hashToken(token: string, pepper: string = process.env.ALBUM_TOKEN_PEPPER || ''): string {
  return createHash('sha256').update(token + pepper).digest('hex');
}
