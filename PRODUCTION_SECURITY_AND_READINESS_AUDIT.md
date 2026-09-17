# Production Security & Readiness Tracker

Cập nhật lần cuối: 17/09/2026

Tài liệu này theo dõi các hạng mục phát hiện trong đợt rà soát bảo mật và mức sẵn sàng trước production.

## Security

### [x] SEC-001 — Webhook SePay có thể bị giả mạo hoặc replay

Đã hoàn thành trong commit `2329929`.

- Production bắt buộc có `SEPAY_WEBHOOK_SECRET` tối thiểu 32 ký tự.
- Webhook bị từ chối nếu thiếu secret, chữ ký HMAC, raw body hoặc timestamp.
- Timestamp chỉ hợp lệ trong cửa sổ cấu hình `SEPAY_WEBHOOK_MAX_AGE_SECONDS` (mặc định 300 giây).
- Payload thanh toán được kiểm tra trước khi kích hoạt gói.
- Endpoint webhook có rate limit riêng và vẫn lưu payload đã xác thực để đối soát.

Việc cần làm khi deploy: tạo secret ngẫu nhiên mạnh, đặt vào biến môi trường production và cấu hình cùng giá trị HMAC trong SePay.

### [x] SEC-002 — Open redirect/XSS qua tham số `redirect`

Đã hoàn thành.

- Chỉ chấp nhận route nội bộ bắt đầu bằng `/`.
- Từ chối external URL, protocol-relative URL (`//domain`) và scheme nguy hiểm như `javascript:`.
- Áp dụng cho Login, Google Login, xác thực email, đăng ký và GuestGuard.
- Giữ nguyên fallback theo role: admin về `/admin`, người dùng thông thường về `/practice`.

### [x] AI-001 — Chưa có hạn mức token DeepSeek toàn hệ thống

Đã hoàn thành.

- Áp dụng hạn mức input và output token riêng theo ngày Việt Nam cho mọi call đi qua `DeepSeekClient`.
- Counter Redis có ngày trong key; ngày mới bắt đầu từ 0 ở request đầu tiên sau 00:00, không cần cron reset.
- Chỉ cộng usage thực tế sau response; hệ thống có thể vượt nhẹ trong số request đang chạy đồng thời theo quyết định vận hành.
- Mỗi request luôn gửi `max_tokens`; call site có thể đặt thấp hơn nhưng không vượt trần cấu hình 2.000 token/request.
- Nếu Redis không đọc được trước call, hệ thống từ chối gọi AI để tránh chi phí không kiểm soát.

Cấu hình mặc định bảo thủ cho `deepseek-flash`: `3.000.000` input token và `800.000` output token/ngày; cần điều chỉnh theo ngân sách thực tế sau khi theo dõi usage.

## Trạng thái xác nhận

- SEC-001: API build và test đã chạy thành công trước khi commit.
- SEC-002: frontend lint và TypeScript check đã chạy thành công. Production build bị phụ thuộc tải font Google Fonts; cần chạy lại trong CI hoặc môi trường có outbound network ổn định trước deploy.

## Hạng mục tiếp theo

- [ ] DATA-001 — Chuyển audio ghi âm từ public R2 sang private bucket/presigned URL.
- [ ] Rà soát và xử lý các mục còn lại của đợt security/readiness audit trước production.
