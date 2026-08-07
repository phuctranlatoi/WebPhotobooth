import { NextRequest, NextResponse } from 'next/server';
import { authenticateBooth } from '@/lib/auth/booth-auth';
import { z } from 'zod';
import prisma from '@/lib/db';
import { generateToken, hashToken } from '@/lib/tokens';

const createAlbumSchema = z.object({
  externalSessionId: z.string().min(1),
  expectedAssets: z.number().int().positive(),
  expiresInDays: z.number().int().positive().default(7)
});

export async function POST(request: NextRequest) {
  const authResult = await authenticateBooth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const parseResult = createAlbumSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });
    }

    const { externalSessionId, expectedAssets, expiresInDays } = parseResult.data;
    
    // Idempotency check
    const existing = await prisma.album.findUnique({
      where: {
        booth_id_external_session_id: {
          booth_id: authResult.booth!.id,
          external_session_id: externalSessionId
        }
      }
    });

    if (existing) {
      // Should we return existing token? No, we don't store it.
      // If it exists, return conflict or just the ID. 
      // Spec says: "Unique (booth_id, external_session_id) để retry create trả lại cùng album. (Nhưng token không lưu plaintext, nên làm sao trả lại?)"
      // Let's just return what we can or let Android handle it. Actually, if idempotency returns same album, we might not have the plaintext token. 
      // We will just create if not exist.
      return NextResponse.json({ error: 'ALBUM_EXISTS', albumId: existing.id }, { status: 409 });
    }

    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    const albumBaseUrl = new URL('/a', request.nextUrl.origin).toString().replace(/\/$/, '');

    const album = await prisma.album.create({
      data: {
        booth_id: authResult.booth!.id,
        external_session_id: externalSessionId,
        access_token_hash: tokenHash,
        expected_assets: expectedAssets,
        expires_at: expiresAt,
        status: 'UPLOADING'
      }
    });

    await prisma.auditEvent.create({
      data: {
        booth_id: authResult.booth!.id,
        album_id: album.id,
        event_type: 'ALBUM_CREATED',
        metadata: { expectedAssets, expiresInDays, albumBaseUrl }
      }
    });
    
    return NextResponse.json({
      albumId: album.id,
      accessToken: token,
      albumUrl: `${albumBaseUrl}/${token}`,
      status: album.status,
      expiresAt: album.expires_at.toISOString()
    }, { status: 201 });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
