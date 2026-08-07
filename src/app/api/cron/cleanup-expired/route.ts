import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import cloudinary from '@/lib/cloudinary/server';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const expiredAlbums = await prisma.album.findMany({
      where: {
        status: { in: ['READY', 'EXPIRED'] },
        expires_at: { lte: new Date() }
      },
      take: 20, // batch size
      include: { assets: true }
    });

    let processedCount = 0;

    for (const album of expiredAlbums) {
      // Mark as DELETING to prevent other crons from picking it up
      await prisma.album.update({
        where: { id: album.id },
        data: { status: 'DELETING' }
      });

      let allDeleted = true;

      for (const asset of album.assets) {
        if (asset.status === 'DELETED') continue;
        
        try {
          // Delete from Cloudinary
          await cloudinary.uploader.destroy(asset.public_id, {
            resource_type: asset.resource_type,
            type: asset.delivery_type,
            invalidate: true
          });

          await prisma.albumAsset.update({
            where: { id: asset.id },
            data: { status: 'DELETED' }
          });
        } catch (e) {
          console.error(`Failed to delete asset ${asset.id}:`, e);
          allDeleted = false;
          await prisma.albumAsset.update({
            where: { id: asset.id },
            data: { status: 'DELETE_FAILED' }
          });
        }
      }

      const finalStatus = allDeleted ? 'DELETED' : 'DELETE_FAILED';
      
      await prisma.album.update({
        where: { id: album.id },
        data: { 
          status: finalStatus,
          deleted_at: allDeleted ? new Date() : null
        }
      });

      await prisma.auditEvent.create({
        data: {
          booth_id: album.booth_id,
          album_id: album.id,
          event_type: allDeleted ? 'CLEANUP_SUCCESS' : 'CLEANUP_FAILED'
        }
      });

      processedCount++;
    }

    return NextResponse.json({ processedCount }, { status: 200 });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
