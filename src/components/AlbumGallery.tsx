'use client';

import { useEffect, useState } from 'react';

type Asset = {
  id: string;
  kind: string;
  position: number;
  resourceType: string;
  format: string;
  width: number;
  height: number;
  previewUrl: string;
};

type AlbumManifest = {
  status: string;
  expiresAt: string;
  assets: Asset[];
};

const albumErrorMessages: Record<string, string> = {
  ALBUM_NOT_FOUND: 'Không tìm thấy album. Hãy chụp lại phiên mới để tạo QR mới.',
  ALBUM_NOT_READY: 'Album chưa sẵn sàng. Ảnh đã upload nhưng metadata chưa được lưu vào web.',
  ALBUM_EXPIRED: 'Album đã hết hạn.',
  ALBUM_REVOKED: 'Album đã bị khóa.',
  ALBUM_DELETED: 'Album đã bị xóa.',
  INTERNAL_ERROR: 'Web album đang lỗi server. Kiểm tra env DATABASE_URL và log Vercel.',
};

export default function AlbumGallery({ token }: { token: string }) {
  const [manifest, setManifest] = useState<AlbumManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAsset, setActiveAsset] = useState<Asset | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAlbum() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/v1/public/albums/${token}`, { cache: 'no-store' });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          const apiError = data?.error || res.statusText || 'UNKNOWN_ERROR';
          throw new Error(apiError);
        }

        if (cancelled) return;

        const album = data as AlbumManifest;
        const finalAsset = album.assets.find((asset) => asset.kind === 'FINAL');
        const firstImage = album.assets.find((asset) => asset.resourceType === 'image');

        setManifest(album);
        setActiveAsset(finalAsset || firstImage || album.assets[0] || null);
      } catch (err) {
        if (cancelled) return;

        console.error(err);
        const apiError = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
        setError(albumErrorMessages[apiError] || `Không thể tải album (${apiError}).`);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAlbum();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center text-neutral-700">
        Đang tải album...
      </div>
    );
  }

  if (error || !manifest) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center px-6">
        <div className="max-w-md rounded-lg border border-neutral-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-400">Photobooth album</p>
          <h1 className="mt-3 text-2xl font-semibold text-neutral-900">Chưa tải được album</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-600">{error}</p>
        </div>
      </div>
    );
  }

  const handleDownloadAll = () => {
    manifest.assets.forEach((asset) => {
      window.open(`/api/v1/public/albums/${token}/assets/${asset.id}/download?download=1`, '_blank');
    });
  };

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-950">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-400">Pretty Booth</p>
            <h1 className="text-xl font-semibold">Album của bạn</h1>
          </div>
          <div className="text-right text-xs text-neutral-500">
            Hết hạn: {new Date(manifest.expiresAt).toLocaleDateString('vi-VN')}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 sm:px-6">
        <section className="min-h-[58vh] rounded-lg border border-neutral-200 bg-white p-3 shadow-sm">
          <div className="flex h-[58vh] items-center justify-center overflow-hidden rounded-lg bg-neutral-950">
            {activeAsset ? (
              activeAsset.resourceType === 'image' ? (
                <img
                  key={activeAsset.id}
                  src={activeAsset.previewUrl}
                  alt="Photobooth"
                  className="h-full w-full object-contain"
                />
              ) : activeAsset.resourceType === 'video' ? (
                <video
                  key={activeAsset.id}
                  src={activeAsset.previewUrl}
                  controls
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-white">
                  <div className="text-lg font-semibold uppercase">{activeAsset.format}</div>
                  <div className="text-sm text-white/60">File gốc từ lần chụp {activeAsset.position + 1}</div>
                </div>
              )
            ) : (
              <div className="text-sm text-white/60">Album chưa có ảnh.</div>
            )}
          </div>
        </section>

        <div className="flex flex-wrap justify-center gap-3">
          <a
            href={activeAsset ? `/api/v1/public/albums/${token}/assets/${activeAsset.id}/download?download=1` : '#'}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 active:scale-95"
          >
            Tải ảnh này
          </a>
          <button
            onClick={handleDownloadAll}
            className="rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50 active:scale-95"
          >
            Tải tất cả ({manifest.assets.length})
          </button>
        </div>

        <section className="overflow-x-auto rounded-lg border border-neutral-200 bg-white p-3 shadow-sm">
          <div className="flex min-w-max justify-center gap-3">
            {manifest.assets.map((asset) => {
              const isActive = activeAsset?.id === asset.id;
              return (
                <button
                  key={asset.id}
                  onClick={() => setActiveAsset(asset)}
                  className={`relative h-28 w-20 overflow-hidden rounded-lg border transition sm:h-32 sm:w-24 ${
                    isActive
                      ? 'border-neutral-950 ring-2 ring-neutral-950/20'
                      : 'border-neutral-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  {asset.resourceType === 'image' ? (
                    <img src={asset.previewUrl} alt="Photobooth thumbnail" className="h-full w-full object-cover" />
                  ) : asset.resourceType === 'video' ? (
                    <video src={asset.previewUrl} className="h-full w-full object-cover" muted />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-xs uppercase text-neutral-500">
                      {asset.format}
                    </div>
                  )}
                  <span className="absolute inset-x-1 bottom-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-neutral-700">
                    {asset.kind}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
