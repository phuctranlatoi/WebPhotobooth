import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashToken } from '@/lib/tokens';
import cloudinary from '@/lib/cloudinary/server';

function getAssetFilename(position: number, format: string) {
  return `photobooth-${position + 1}.${format || 'jpg'}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; assetId: string }> }
) {
  try {
    const { token, assetId } = await params;
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
    const forceDownload = request.nextUrl.searchParams.get('download') === '1';

    await prisma.auditEvent.create({
      data: {
        album_id: album.id,
        event_type: 'DOWNLOAD_REQUESTED',
        metadata: { assetId: asset.id, forceDownload }
      }
    });

    if (asset.delivery_type === 'upload') {
      const version = Number(asset.version);
      const sourceUrl = cloudinary.url(asset.public_id, {
        resource_type: asset.resource_type,
        type: asset.delivery_type,
        version: Number.isFinite(version) ? version : undefined,
        format: asset.format,
        secure: true,
      });

      const sourceResponse = await fetch(sourceUrl, { cache: 'no-store' });
      if (!sourceResponse.ok || !sourceResponse.body) {
        return NextResponse.json({ error: 'ASSET_SOURCE_UNAVAILABLE' }, { status: 502 });
      }

      const headers = new Headers();
      headers.set('Content-Type', sourceResponse.headers.get('Content-Type') || 'application/octet-stream');
      headers.set('Cache-Control', `private, max-age=${Math.min(ttl, 300)}`);
      headers.set(
        'Content-Disposition',
        `${forceDownload ? 'attachment' : 'inline'}; filename="${getAssetFilename(asset.position, asset.format)}"`
      );

      return new NextResponse(sourceResponse.body, {
        status: 200,
        headers,
      });
    }

    const url = cloudinary.utils.private_download_url(
      asset.public_id,
      asset.format,
      {
        resource_type: asset.resource_type,
        type: asset.delivery_type, // 'authenticated'
        expires_at: expiresAt,
        attachment: forceDownload
      }
    );

    return NextResponse.redirect(url, 302);

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
