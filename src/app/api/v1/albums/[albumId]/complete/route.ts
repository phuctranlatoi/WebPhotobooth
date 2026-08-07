import { NextRequest, NextResponse } from 'next/server';
import { authenticateBooth } from '@/lib/auth/booth-auth';
import prisma from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ albumId: string }> }
) {
  const authResult = await authenticateBooth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { albumId } = await params;
    const album = await prisma.album.findUnique({ 
      where: { id: albumId },
      include: { assets: true }
    });
    
    if (!album || album.booth_id !== authResult.booth!.id) {
      return NextResponse.json({ error: 'ALBUM_NOT_FOUND' }, { status: 404 });
    }

    if (album.status === 'READY') {
      const baseUrl = process.env.ALBUM_BASE_URL || 'http://localhost:3000/a';
      // Search the tokens, wait, the spec says "DB chỉ lưu SHA-256 hash của token". 
      // If we don't store the token in plaintext, we CANNOT reconstruct the albumUrl for idempotency.
      // But the Android app already has the token from the create response.
      // So the Android app can reconstruct it. The backend doesn't necessarily need to return it, or we can just return a success message.
      // Wait, the spec for complete says:
      // "albumUrl": "https://domain/a/<token>"
      // "qrValue": "https://domain/a/<token>"
      // But the backend doesn't know the token!
      // If the backend doesn't know the token, it cannot return it in `/complete`.
      // The Android app already received it in `/create` and must store it.
      // I will return a success status, Android will build the URL.
      return NextResponse.json({
        status: 'READY'
      });
    }

    // Check if expected assets count matches
    const readyAssets = album.assets.filter((a: any) => a.status === 'READY').length;
    if (readyAssets < album.expected_assets) {
      console.warn(`Album ${albumId} has ${readyAssets}/${album.expected_assets} ready assets. Proceeding anyway to prevent lockup.`);
      // We will no longer block completion. We just complete it so the user can see whatever successfully uploaded.
      if (readyAssets === 0) {
        // If literally 0 assets uploaded, still complete it so it doesn't stay UPLOADING forever, but it will be an empty album.
        console.warn(`Album ${albumId} completed with 0 assets.`);
      }
    }

    const updatedAlbum = await prisma.album.update({
      where: { id: albumId },
      data: {
        status: 'READY',
        ready_at: new Date()
      }
    });

    await prisma.auditEvent.create({
      data: {
        booth_id: authResult.booth!.id,
        album_id: albumId,
        event_type: 'ALBUM_READY',
        metadata: { readyAssets }
      }
    });

    return NextResponse.json({
      status: 'READY'
    }, { status: 200 });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
