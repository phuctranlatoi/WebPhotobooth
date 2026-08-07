import { NextRequest, NextResponse } from 'next/server';
import { authenticateBooth } from '@/lib/auth/booth-auth';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { externalSessionId: string } }
) {
  const authResult = await authenticateBooth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { externalSessionId } = params;
    const album = await prisma.album.findUnique({
      where: {
        booth_id_external_session_id: {
          booth_id: authResult.booth!.id,
          external_session_id: externalSessionId
        }
      },
      include: { assets: true }
    });
    
    if (!album) {
      return NextResponse.json({ error: 'ALBUM_NOT_FOUND' }, { status: 404 });
    }

    const uploadedPositions = album.assets.map(a => a.position);

    return NextResponse.json({
      albumId: album.id,
      status: album.status,
      uploadedPositions
    }, { status: 200 });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
