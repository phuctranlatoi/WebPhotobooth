'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LandingContent() {
  const searchParams = useSearchParams();
  const hasError = searchParams.get('error') === 'true';

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4">
      {hasError ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
            !
          </div>
          <h1 className="text-2xl font-bold mb-2">Không Thể Tải Lên</h1>
          <p className="text-neutral-400">
            Xin lỗi, đã xảy ra sự cố trong quá trình lưu ảnh/video của bạn. Vui lòng liên hệ nhân viên Photobooth để được hỗ trợ nhé.
          </p>
        </div>
      ) : (
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 mb-4">
            Photobooth Web Album
          </h1>
          <p className="text-neutral-400 max-w-md mx-auto">
            Quét mã QR từ máy Photobooth để xem và tải ảnh của bạn về máy nhé!
          </p>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">Đang tải...</div>}>
      <LandingContent />
    </Suspense>
  );
}
