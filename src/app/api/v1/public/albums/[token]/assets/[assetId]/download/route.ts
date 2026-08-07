import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashToken } from '@/lib/tokens';
import cloudinary from '@/lib/cloudinary/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string; assetId: string } }
) {
  try {
    const { token, assetId } = params;
    const tokenHash = hashToken(token);

    const album = await prisma.album.findUnique({
      where: { access_token_hash: tokenHash },
    });

    if (!album || album.status !== 'READY') {
      return NextResponse.json({ error: 'ALBUM_NOT_FOUND' }, { status: 404 });
    }

    const asset = await prisma.albumAsset.findUnique({
      where: { id: assetId }
    });

    if (!asset || asset.album_id !== album.id || asset.status !== 'READY') {
      return NextResponse.json({ error: 'ASSET_NOT_FOUND' }, { status: 404 });
    }

    // Generate signed download URL
    // The spec says: "Tạo signed/private download URL thời hạn ngắn. Trả 302 redirect"
    
    // Cloudinary private_download_url
    const ttl = parseInt(process.env.SIGNED_URL_TTL_SECONDS || '900', 10);
    const expiresAt = Math.round(Date.now() / 1000) + ttl;

    const url = cloudinary.utils.private_download_url(
      asset.public_id,
      asset.format,
      {
        type: asset.delivery_type, // 'authenticated'
        expires_at: expiresAt,
        attachment: true // Force download
      }
    );

    // Audit event for download
    await prisma.auditEvent.create({
      data: {
        album_id: album.id,
        event_type: 'DOWNLOAD_REQUESTED',
        metadata: { assetId: asset.id }
      }
    });

    return NextResponse.redirect(url, 302);

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
