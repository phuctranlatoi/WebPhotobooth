# Photobooth Web Album

Web Album Next.js được thiết kế đặc biệt dành riêng cho Photobooth, đáp ứng toàn bộ các tiêu chuẩn bảo mật, tối ưu hiệu suất và nghiệp vụ quy định trong Đặc Tả Hệ Thống (Spec).

## Tính năng
- **Bảo Mật Cao:** Mã QR ngẫu nhiên (CSPRNG), chỉ lưu hash trong Database. Không rò rỉ ID tuần tự.
- **Upload An Toàn:** App Android xin chữ ký (Signed Upload) từ Next.js, tự đẩy lên Cloudinary dạng `authenticated`.
- **Tải Xuống Hạn Chế:** Trả link tải `private_download_url` của Cloudinary tự hủy sau vài phút.
- **Tự Động Xóa:** Có API Cron job dọn dẹp album hết hạn khỏi Cloudinary và Database.

## Cài đặt (Local)
1. Cài đặt Node.js và NPM.
2. Sao chép `.env.example` thành `.env.local` và điền thông số.
   - Bắt buộc phải có `DATABASE_URL` (vd: Neon PostgreSQL).
   - Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
3. Chạy lệnh:
   ```bash
   npm install
   npx prisma generate
   npx prisma db push
   npm run dev
   ```

## API Contract (Dành cho Android)
Toàn bộ các API `POST /api/v1/albums/*` yêu cầu header:
`Authorization: Bearer <BOOTH_API_KEY>`

1. **Tạo Album:** `POST /api/v1/albums`
2. **Xin chữ ký Upload:** `POST /api/v1/albums/{albumId}/upload-signature`
3. **Lưu Asset:** `POST /api/v1/albums/{albumId}/assets`
4. **Hoàn Tất Album:** `POST /api/v1/albums/{albumId}/complete`

*(Xem thêm trong Đặc Tả để biết format JSON chi tiết)*

## Deploy (Vercel)
1. Đẩy code lên GitHub.
2. Import project vào Vercel.
3. Trong tab Settings > Environment Variables, copy toàn bộ nội dung từ `.env.local` vào.
4. Triển khai.
5. Cài đặt Cron Job bằng cách tạo Vercel Cron để gọi `GET /api/cron/cleanup-expired`.
