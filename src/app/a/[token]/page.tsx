import AlbumGallery from '@/components/AlbumGallery';

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return <AlbumGallery token={token} />;
}
