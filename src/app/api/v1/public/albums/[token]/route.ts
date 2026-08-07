import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashToken } from '@/lib/tokens';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const tokenHash = hashToken(token);

    const album = await prisma.album.findUnique({
      where: { access_token_hash: tokenHash },
      include: { assets: true }
    });

    if (!album) {
      return NextResponse.json({ error: 'ALBUM_NOT_FOUND' }, { status: 404 });
    }

    if (album.status === 'EXPIRED') {
      return NextResponse.json({ error: 'ALBUM_EXPIRED' }, { status: 410 });
    }
    if (album.status === 'REVOKED') {
      return NextResponse.json({ error: 'ALBUM_REVOKED' }, { status: 410 });
    }
    if (album.status === 'DELETING' || album.status === 'DELETED' || album.status === 'DELETE_FAILED') {
      return NextResponse.json({ error: 'ALBUM_DELETED' }, { status: 410 });
    }
    if (album.status !== 'READY') {
      return NextResponse.json({ error: 'ALBUM_NOT_READY' }, { status: 409 });
    }

    const assets = album.assets.filter((asset) => asset.status === 'READY').map((asset) => ({
      id: asset.id,
      kind: asset.kind,
      position: asset.position,
      resourceType: asset.resource_type,
      format: asset.format,
      width: asset.width,
      height: asset.height,
      // Create a short-lived signed URL for preview
      previewUrl: `/api/v1/public/albums/${token}/assets/${asset.id}/download` // We'll use the same route for now, or generate a real preview URL
    }));

    return NextResponse.json({
      status: album.status,
      expiresAt: album.expires_at.toISOString(),
      assets: assets
    }, { status: 200 });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
