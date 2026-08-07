import { NextRequest, NextResponse } from 'next/server';
import { authenticateBooth } from '@/lib/auth/booth-auth';
import { z } from 'zod';
import prisma from '@/lib/db';
import cloudinary from '@/lib/cloudinary/server';

const signatureSchema = z.object({
  kind: z.enum(['ORIGINAL', 'FINAL', 'THUMBNAIL', 'GIF']),
  position: z.number().int().min(0),
  format: z.string().min(1)
});

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
    const album = await prisma.album.findUnique({ where: { id: albumId } });
    
    if (!album || album.booth_id !== authResult.booth!.id) {
      return NextResponse.json({ error: 'ALBUM_NOT_FOUND' }, { status: 404 });
    }
    if (album.status !== 'UPLOADING' && album.status !== 'CREATED') {
      return NextResponse.json({ error: 'ALBUM_NOT_READY' }, { status: 409 });
    }

    const body = await request.json();
    const parseResult = signatureSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });
    }

    const { kind, position, format } = parseResult.data;
    
    // Create public_id: photobooth/{boothId}/{albumId}/{kind}/{position}
    const publicId = `photobooth/${album.booth_id}/${album.id}/${kind.toLowerCase()}/shot_${position}`;
    const timestamp = Math.round(new Date().getTime() / 1000);

    const paramsToSign = {
      public_id: publicId,
      type: 'authenticated',
      overwrite: false,
      timestamp: timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET!
    );

    return NextResponse.json({
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      timestamp,
      signature,
      uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/auto/upload`,
      params: paramsToSign
    });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
