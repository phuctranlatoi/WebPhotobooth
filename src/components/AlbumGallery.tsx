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

export default function AlbumGallery({ token }: { token: string }) {
  const [manifest, setManifest] = useState<AlbumManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAsset, setActiveAsset] = useState<Asset | null>(null);

  useEffect(() => {
    fetch(`/api/v1/public/albums/${token}`)
      .then(res => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((data: AlbumManifest) => {
        setManifest(data);
        if (data.assets && data.assets.length > 0) {
          // Find FINAL, first image, or first asset.
          const finalAsset = data.assets.find(a => a.kind === 'FINAL');
          const firstImage = data.assets.find(a => a.resourceType === 'image');
          setActiveAsset(finalAsset || firstImage || data.assets[0]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Không thể tải album hoặc album đã hết hạn.');
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Đang tải...</div>;
  }

  if (error || !manifest) {
    return <div className="min-h-screen flex items-center justify-center text-red-400">{error}</div>;
  }

  const handleDownloadAll = () => {
    manifest.assets.forEach(asset => {
      window.open(`/api/v1/public/albums/${token}/assets/${asset.id}/download?download=1`, '_blank');
    });
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center">
      {/* Header */}
      <header className="w-full py-4 px-6 flex justify-between items-center border-b border-white/10">
        <h1 className="text-xl font-bold tracking-widest text-white/90">PHOTOBOOTH</h1>
        <div className="text-sm text-gray-400">
          Hết hạn: {new Date(manifest.expiresAt).toLocaleDateString('vi-VN')}
        </div>
      </header>

      {/* Main Display */}
      <main className="flex-1 w-full max-w-4xl p-4 flex flex-col items-center justify-center">
        <div className="w-full h-[60vh] max-h-[800px] relative rounded-xl overflow-hidden shadow-2xl bg-black/50 border border-white/5 flex items-center justify-center">
          {activeAsset && (
            activeAsset.resourceType === 'image' ? (
              <img
                key={activeAsset.id}
                src={activeAsset.previewUrl}
                alt="Photobooth"
                className="w-full h-full object-contain drop-shadow-2xl"
              />
            ) : activeAsset.resourceType === 'video' ? (
              <video
                key={activeAsset.id}
                src={activeAsset.previewUrl}
                controls
                className="w-full h-full object-contain drop-shadow-2xl"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-white">
                <div className="text-lg font-semibold uppercase">{activeAsset.format}</div>
                <div className="text-sm text-white/60">File goc tu lan chup {activeAsset.position + 1}</div>
              </div>
            )
          )}
        </div>
        
        <div className="mt-6 flex gap-4">
          <a 
            href={activeAsset ? `/api/v1/public/albums/${token}/assets/${activeAsset.id}/download?download=1` : '#'}
            target="_blank" 
            rel="noreferrer"
            className="px-8 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-all shadow-lg active:scale-95"
          >
            Tải Ảnh Này
          </a>
          <button 
            onClick={handleDownloadAll}
            className="px-8 py-3 bg-neutral-800 text-white font-semibold rounded-full hover:bg-neutral-700 transition-all border border-white/10 active:scale-95"
          >
            Tải Tất Cả ({manifest.assets.length})
          </button>
        </div>
      </main>

      {/* Slider */}
      <div className="w-full bg-neutral-900 border-t border-white/5 p-4 overflow-x-auto">
        <div className="flex gap-4 min-w-max mx-auto justify-center">
          {manifest.assets.map((asset) => {
            const isActive = activeAsset?.id === asset.id;
            return (
              <div 
                key={asset.id}
                onClick={() => setActiveAsset(asset)}
                className={`relative w-20 h-28 sm:w-24 sm:h-32 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 ${
                  isActive ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-900 scale-105' : 'opacity-60 hover:opacity-100 hover:scale-105'
                }`}
              >
                {asset.resourceType === 'image' ? (
                  <img src={asset.previewUrl} alt="Photobooth thumbnail" className="w-full h-full object-cover" />
                ) : asset.resourceType === 'video' ? (
                  <video src={asset.previewUrl} className="w-full h-full object-cover" muted />
                ) : (
                  <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-xs uppercase text-white/70">
                    {asset.format}
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                  <p className="text-[10px] font-medium text-center truncate text-white">{asset.kind}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
