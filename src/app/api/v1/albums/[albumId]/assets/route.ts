import { NextRequest, NextResponse } from 'next/server';
import { authenticateBooth } from '@/lib/auth/booth-auth';
import { z } from 'zod';
import prisma from '@/lib/db';

const finalizeSchema = z.object({
  kind: z.enum(['ORIGINAL', 'FINAL', 'THUMBNAIL', 'GIF']),
  position: z.number().int().min(0),
  assetId: z.string().min(1),
  publicId: z.string().min(1),
  version: z.union([z.string(), z.number()]).transform(v => String(v)),
  format: z.string().min(1),
  resourceType: z.string().min(1),
  deliveryType: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bytes: z.number().int().positive()
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
    const parseResult = finalizeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });
    }

    const data = parseResult.data;

    const asset = await prisma.albumAsset.upsert({
      where: { cloudinary_asset_id: data.assetId },
      update: {
        status: 'READY'
      },
      create: {
        album_id: albumId,
        kind: data.kind,
        position: data.position,
        cloudinary_asset_id: data.assetId,
        public_id: data.publicId,
        resource_type: data.resourceType,
        delivery_type: data.deliveryType,
        version: data.version,
        format: data.format,
        width: data.width,
        height: data.height,
        bytes: data.bytes,
        status: 'READY'
      }
    });

    await prisma.auditEvent.create({
      data: {
        booth_id: authResult.booth!.id,
        album_id: albumId,
        event_type: 'ASSET_FINALIZED',
        metadata: { assetId: asset.id, publicId: data.publicId }
      }
    });

    return NextResponse.json({ status: 'OK', assetId: asset.id }, { status: 201 });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
