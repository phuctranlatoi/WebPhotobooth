import AlbumGallery from '@/components/AlbumGallery';

export default function Page({ params }: { params: { token: string } }) {
  return <AlbumGallery token={params.token} />;
}
