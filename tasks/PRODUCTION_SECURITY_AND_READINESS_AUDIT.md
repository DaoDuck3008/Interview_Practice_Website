# Production Security & Readiness Audit

> Ngày rà soát: 16/09/2026
>
> Phạm vi: `apps/api`, `apps/web`, Prisma schema/migrations, Redis/BullMQ, R2, thanh toán Sepay, email và các luồng AI.
> Kết luận phát hành: **CHƯA NÊN DEPLOY PRODUCTION** trước khi hoàn tất toàn bộ mục P0 và xử lý/accept risk rõ ràng cho các mục P1.

## Cách dùng checklist

- `[ ]` Chưa xử lý.
- `[x]` Đã hoàn tất và đã chạy tiêu chí nghiệm thu.
- Mức độ: **P0** = chặn deploy, **P1** = nên xử lý trước deploy, **P2** = hardening sớm sau đó, **P3** = cải thiện vận hành/chất lượng.
- Báo cáo này không chứa giá trị secret. Không dán secret, access token, nội dung CV hoặc transcript vào phần ghi chú tiến độ.

## Tóm tắt

| Mức | Số mục | Nhận định                                                                                                                    |
| --- | -----: | ---------------------------------------------------------------------------------------------------------------------------- |
| P0  |      3 | Có thể dẫn tới giả mạo thanh toán, XSS/chuyển hướng độc hại sau đăng nhập, hoặc khai thác dependency đã công bố.             |
| P1  |      7 | Rò rỉ dữ liệu/audio, vượt chi phí AI, quyền WebSocket tồn tại quá lâu, lộ thông tin nội bộ và thiếu chốt an toàn production. |
| P2  |      6 | OTP, upload, CSP, scale-out, support attachment và tài khoản admin cần hardening.                                            |
| P3  |      4 | Test/CI, quan sát hệ thống, runbook và quy trình phát hành chưa đủ.                                                          |

## P0 — Bắt buộc hoàn tất trước deploy

### [x] SEC-001 — Production có thể khởi động với webhook thanh toán không xác thực

- **Bằng chứng:** `apps/api/src/config/configuration.ts:28` cho phép `SEPAY_WEBHOOK_SECRET` rỗng; `apps/api/src/modules/payments/payments.service.ts:770-776` bỏ qua hoàn toàn xác thực khi secret rỗng; endpoint webhook còn được bỏ rate limit tại `apps/api/src/modules/payments/payments.controller.ts:128-132`.
- **Tác động:** nếu production thiếu/mất biến môi trường này, người biết mã chuyển khoản và số tiền của đơn có thể tự gửi payload để đánh dấu đơn `PAID`, kích hoạt subscription và cấp AI credits mà không thanh toán.
- **Cần làm:** bắt buộc secret đủ mạnh khi `NODE_ENV=production`; fail startup nếu thiếu; không có nhánh “bỏ qua verify” trong production; thêm DTO/schema chặt cho payload; giới hạn body và cân nhắc allowlist IP/mTLS nếu Sepay hỗ trợ.
- **Nghiệm thu:** production không khởi động khi secret rỗng; request thiếu/sai chữ ký luôn nhận 401; chỉ fixture chữ ký hợp lệ mới kích hoạt đơn; có test chống replay/timestamp cũ.

### [x] SEC-002 — `redirect` sau đăng nhập chưa được kiểm tra, có đường dẫn tới JavaScript URL/open redirect

- **Bằng chứng:** dữ liệu query `redirect` được dùng trực tiếp tại `apps/web/src/components/auth/LoginPageClient.tsx:54-57`, `GoogleLoginButton.tsx:50`, `VerifyEmailPageClient.tsx:50` và `apps/web/src/guards/guestGuard.tsx:18`. Một nhánh gọi thẳng `window.location.assign(target)`.
- **Tác động:** kẻ tấn công có thể tạo link đăng nhập trỏ người dùng sang website giả; với scheme như `javascript:` có nguy cơ thực thi script trong origin ứng dụng và đánh cắp access token đang nằm trong memory. CSP hiện cho phép inline script nên không phải lớp bảo vệ đáng tin cậy cho trường hợp này.
- **Cần làm:** một helper duy nhất chỉ chấp nhận path nội bộ bắt đầu bằng `/`, từ chối `//`, backslash, control character và mọi URL/scheme; dùng helper ở login, Google login, verify email và guards; fallback theo role.
- **Nghiệm thu:** test các giá trị `https://evil.example`, `//evil.example`, `javascript:...`, encoded variants và backslash đều quay về fallback; chỉ `/practice?...` được chấp nhận.

### [ ] DEP-001 — Dependency production có lỗ hổng critical/high đã công bố

- **Bằng chứng:** `npm audit --omit=dev` ngày 16/09/2026 báo **25 vulnerabilities: 2 critical, 16 high, 6 moderate, 1 low**.
- **Các gói trực tiếp/đường chạy đáng chú ý:** Next.js `16.2.7` (critical, gồm RCE/SSRF/DoS và disclosure), Axios `1.17.0` (high), `@nestjs/platform-express 11.1.24 -> multer 2.1.1` (high, DoS/size-limit bypass), `socket.io-parser 4.2.6` (high, memory exhaustion), Joi `17.13.3` (moderate). Ngoài ra có PostCSS/Sharp và các dependency tooling của Prisma.
- **Cần làm:** nâng lên phiên bản đã vá theo advisory; ưu tiên Next.js, Axios, Multer/Nest platform và Socket.IO; không chạy mù `npm audit fix --force` vì báo cáo hiện đề xuất cả downgrade/breaking change Prisma; review lockfile và changelog từng nhóm.
- **Nghiệm thu:** `npm audit --omit=dev` không còn critical/high có thể khai thác trong runtime; API test, web lint và cả hai production build đều xanh; smoke test upload, image optimizer, WebSocket và auth.

## P1 — Nên hoàn tất trước deploy

### [ ] DATA-001 — Audio phỏng vấn của người dùng được lưu ở bucket công khai

- **Bằng chứng:** `StorageService.uploadStream()` ghi vào `this.bucket` và trả URL public (`apps/api/src/modules/storage/storage.service.ts:62-78`); session lưu URL này (`apps/api/prisma/schema.prisma:316`); các luồng practice/Mock Interview/Mock CV đều dùng cùng cơ chế.
- **Tác động:** URL tồn tại lâu dài và không có authorization/expiry. Dù key có UUID khó đoán, URL có thể lọt qua lịch sử trình duyệt, log, screenshot, thiết bị dùng chung hoặc chia sẻ nhầm. Audio giọng nói và câu trả lời là dữ liệu cá nhân.
- **Cần làm:** chuyển audio sang private bucket; API kiểm tra ownership/admin rồi cấp signed URL thời hạn ngắn hoặc stream qua endpoint có auth; thiết lập retention/lifecycle; migration object cũ; không trả URL bền vững trong DTO.
- **Nghiệm thu:** truy cập object trực tiếp không có chữ ký bị từ chối; user A không lấy audio user B; URL hết hạn đúng thời gian; xóa session/account xóa object và có job retry cleanup.

### [x] AI-001 — Phần lớn lời gọi DeepSeek không đặt trần output token

- **Bằng chứng:** client chỉ gửi `max_tokens` khi caller truyền vào (`apps/api/src/modules/ai/clients/deepseek.client.ts:107`). Chỉ luồng giải thích đặt `maxTokens: 120`; scoring, improvement, CV profile, question generation và overview không đặt trần.
- **Tác động:** prompt injection hoặc model sinh dài có thể làm chi phí/latency khó dự đoán. Timeout 60–120 giây không phải giới hạn token/cost, và retry lỗi tạm thời có thể tạo hai lần charge provider dù credit nội bộ chỉ tính một lần.
- **Cần làm:** đặt `maxTokens` theo từng feature; ghi usage/cost cho mọi call; cảnh báo khi output/chi phí lệch chuẩn; quyết định chính sách charge khi provider đã nhận request nhưng client timeout.
- **Nghiệm thu:** mọi call site có token cap; dashboard đối chiếu input/output token theo feature; test output dài bị cắt/loại an toàn mà không làm job kẹt.

### [ ] AI-002 — Chưa có ngân sách tiền cứng toàn hệ thống và chống tạo nhiều tài khoản đủ mạnh

- **Điểm đang làm tốt:** credit reservation dùng transaction/idempotency; mỗi tài khoản có rate limit; queue có concurrency; CV tính trước tổng credit; giải thích có global daily limit.
- **Khoảng trống:** mỗi tài khoản đã xác thực nhận 3 AI credits/ngày (`apps/api/src/modules/ai-credits/ai-credit-pricing.ts:15`), nhưng không thấy daily/monthly spend cap chung cho Groq/DeepSeek, kill switch hay cảnh báo tiền. Email dùng một lần/nhiều tài khoản có thể nhân hạn mức miễn phí. `AI_QUEUE_CONCURRENCY` chỉ giới hạn tốc độ, không giới hạn tổng tiền.
- **Cần làm:** ngân sách hard/soft theo ngày và tháng ở server/provider; circuit breaker khi đạt ngưỡng; theo dõi cost theo user/IP/device/feature; cân nhắc CAPTCHA hoặc anti-abuse cho đăng ký/free tier; giới hạn tài khoản miễn phí theo chính sách phù hợp.
- **Nghiệm thu:** giả lập mass-account không vượt hard budget; kill switch dừng enqueue/call mới nhưng không làm hỏng dữ liệu; có alert 50/75/90/100% ngân sách.

### [x] AUTH-001 — WebSocket giữ quyền cũ đến khi client tự ngắt kết nối

Đã hoàn thành.

- Khi kết nối, gateway xác thực JWT, đọc lại `isLock` và role hiện tại từ DB, tham gia đúng user/admin room, rồi đặt timer ngắt theo `exp` của access token.
- Khi token hết hạn, client nhận `auth:expired`, refresh access token và reconnect; không refresh được thì frontend xóa trạng thái đăng nhập.
- Khóa tài khoản, đổi mật khẩu và reset mật khẩu gọi revoke socket. Sự kiện được phát qua Redis Pub/Sub để ngắt mọi socket của user trên tất cả API instance; client nhận `auth:revoked` và đăng xuất.
- `support:send` tái kiểm tra user/role trong DB trước khi xử lý, đồng thời đồng bộ lại room admin nếu role đã thay đổi.
- Chưa có endpoint thay đổi role trong codebase. Khi bổ sung luồng hạ/nâng quyền, phải gọi `WebsocketGateway.revokeUserSessions(userId, 'role_changed')` sau khi ghi DB để ngắt quyền realtime ngay lập tức.

**Xác nhận:** API build, lint mục tiêu và TypeScript/lint frontend đã chạy thành công. Không thêm lại file spec theo yêu cầu.

### [x] INFO-001 — Có thể trả lỗi nội bộ cho client và ghi secret Redis vào log

Đã hoàn thành.

- Lỗi không thuộc `HttpException` chỉ trả thông báo 500 chung ở production, kèm `requestId` trong body và header `X-Request-Id`; stack không được trả về client.
- Error log server-side giữ request ID để tra cứu, nhưng redaction credential URL, query token, Bearer token và các giá trị password/secret/API key phổ biến.
- Access log bỏ query string để tránh lưu token, email hoặc dữ liệu tìm kiếm; `path` trong error response cũng không chứa query string.
- Redis chỉ log scheme, hostname và port, không log username, password hoặc query từ `REDIS_URL`.
- Prisma unique-constraint không còn trả tên field nội bộ cho client.

**Xác nhận:** cần kiểm tra log runtime trên staging sau khi cấu hình logging collector để bảo đảm collector không tự bổ sung request header/body nhạy cảm.

### [x] OPS-001 — API nuốt lỗi kết nối database và chưa có health/readiness endpoint

Đã hoàn thành.

- Startup thất bại với exit code khác 0 nếu database, Redis hoặc BullMQ queue không sẵn sàng trong thời gian cấu hình.
- Có `GET /api/v1/health/live` chỉ xác nhận process hoạt động và `GET /api/v1/health/ready` kiểm tra DB, Redis cùng queue BullMQ bằng timeout ngắn; response không nêu chi tiết hạ tầng.
- Khi nhận `SIGTERM`/`SIGINT`, readiness chuyển thành 503 trước; worker dừng lấy job mới và chờ job đang chạy trong tối đa `GRACEFUL_SHUTDOWN_TIMEOUT_MS` (mặc định 30 giây).
- Biến cấu hình: `HEALTH_DEPENDENCY_TIMEOUT_MS` (mặc định 2 giây) và `GRACEFUL_SHUTDOWN_TIMEOUT_MS` (mặc định 30 giây).

**Việc deploy còn lại:** cấu hình liveness/readiness probe gọi hai endpoint trên, `terminationGracePeriodSeconds` lớn hơn 30 giây và rolling deployment chỉ route traffic sau khi readiness đạt 200.

### [ ] OPS-002 — Production configuration chưa có fail-safe theo môi trường

- **Bằng chứng:** validation hiện chỉ bắt buộc một số biến; `SEPAY_WEBHOOK_SECRET`, `RESEND_API_KEY`, `SEPAY_API_KEY` được phép rỗng. `docker-compose.yml` mở Postgres/Redis ra host với default password `postgres` và Redis không auth; file này chỉ an toàn cho local, không phải manifest production.
- **Cần làm:** schema có nhánh production bắt buộc HTTPS origins, webhook/mail credentials, secret length/khác nhau, DB SSL và private Redis có auth/TLS; tách compose/dev config khỏi production; dùng secret manager; không dùng default.
- **Nghiệm thu:** bộ test config table-driven xác nhận mọi cấu hình nguy hiểm đều fail startup ở production; port DB/Redis không public; scan image/config không có secret cứng.

## P2 — Hardening bảo mật

### [ ] AUTH-002 — OTP sinh bằng `Math.random()` thay vì CSPRNG

- **Bằng chứng:** `apps/api/src/modules/auth/verification-code.store.ts:68`.
- **Tác động:** OTP có tính ngẫu nhiên yếu hơn yêu cầu xác thực, dù hiện đã có TTL, 5 lần thử và rate limit.
- **Cần làm:** dùng `crypto.randomInt(100000, 1000000)`; cân nhắc lưu hash/HMAC của OTP thay vì plaintext Redis.
- **Nghiệm thu:** test format 6 chữ số, hết hạn, atomic single-use và lock sau số lần sai.

### [ ] UPLOAD-001 — Upload ảnh/audio chủ yếu tin MIME do client cung cấp

- **Bằng chứng:** `fileUploadOptions()` chỉ kiểm tra `file.mimetype`; support giữ extension từ tên gốc và upload public. PDF có magic check và sandbox riêng — đây là điểm tốt.
- **Tác động:** file giả mạo/polyglot, storage abuse, parser/provider DoS và content-type confusion. Dependency Multer hiện cũng có advisory size-limit bypass/DoS.
- **Cần làm:** sniff magic bytes; decode/re-encode ảnh bằng thư viện đã vá; normalize extension/content-type; allowlist codec audio thực sự; đặt tổng body/field/parts limits; quét malware nếu chính sách yêu cầu.
- **Nghiệm thu:** file HTML đổi MIME/extension, file truncated, polyglot và multipart độc hại đều bị từ chối; ảnh hợp lệ được re-encode.

### [ ] SUPPORT-001 — WebSocket chỉ kiểm tra prefix của `imageUrl`, không kiểm tra ownership/object tồn tại

- **Bằng chứng:** `apps/api/src/websocket/websocket.gateway.ts:133-141` chỉ dùng `startsWith(publicUrl)` trước khi lưu message.
- **Tác động:** client có thể gắn URL object khác trong cùng bucket, kể cả object không do họ upload hoặc không phải ảnh support; tạo liên kết chéo dữ liệu và nội dung hỏng.
- **Cần làm:** khi upload tạo attachment record/nonce gắn `userId`, MIME, key, TTL; `support:send` chỉ consume attachment chưa dùng của đúng user; admin có quy tắc riêng.
- **Nghiệm thu:** user A không attach key của user B hoặc URL tự chế; attachment hết hạn/đã dùng bị từ chối.

### [ ] WEB-001 — CSP có `'unsafe-inline'` và nguồn media/image quá rộng

- **Bằng chứng:** `apps/web/next.config.ts:61,74`; `img-src` và `media-src` cho phép toàn bộ `https:`.
- **Tác động:** giảm khả năng CSP chặn/exfiltrate khi có DOM XSS; khó phát hiện resource ngoài allowlist.
- **Cần làm:** sau khi sửa redirect, chuyển script sang nonce/hash nếu tương thích Next/Google; thu hẹp image/media về đúng origin/R2/Google/Sepay; triển khai `Content-Security-Policy-Report-Only` trước rồi enforce.
- **Nghiệm thu:** không còn `unsafe-inline` cho script ở production hoặc có exception được tài liệu hóa; CSP report không có violation hợp lệ trong smoke test.

### [ ] SCALE-001 — Giới hạn concurrency chỉ đúng với một process/instance

- **Bằng chứng:** `ConcurrencyInterceptor` dùng `Map` trong RAM (`apps/api/src/common/concurrency/concurrency.interceptor.ts:25`); `AI_QUEUE_CONCURRENCY` áp dụng trên từng worker instance.
- **Tác động:** scale ngang N instance làm giới hạn per-user và global provider concurrency tăng gần N lần, có thể tạo spike AI cost/rate-limit.
- **Cần làm:** semaphore/lease Redis atomic cho request tốn phí; định nghĩa concurrency toàn cụm; tách API và worker; đặt worker replica/concurrency rõ ràng.
- **Nghiệm thu:** load test nhiều instance vẫn giữ đúng giới hạn toàn cụm và tự release lease khi process chết/timeout.

### [ ] ADMIN-001 — Admin reset password bằng cách gửi mật khẩu tạm qua email

- **Bằng chứng:** `apps/api/src/modules/users/users.service.ts:307-321` tạo mật khẩu, cập nhật DB rồi gửi plaintext qua email; chưa thấy cờ bắt buộc đổi mật khẩu hoặc MFA admin.
- **Tác động:** mailbox bị xâm nhập đồng nghĩa tài khoản bị chiếm; nếu gửi mail lỗi sau khi DB đã đổi, user bị khóa ngoài tài khoản; admin session là mục tiêu giá trị cao.
- **Cần làm:** gửi link/token reset một lần, TTL ngắn, không gửi password; transaction/state xử lý mail failure hợp lý; bắt buộc MFA/step-up cho admin và thao tác nhạy cảm.
- **Nghiệm thu:** không có password trong email/log; token single-use, expire và revoke session; admin sensitive actions yêu cầu MFA/reauth.

## P3 — Chất lượng và vận hành trước/sau phát hành

### [ ] TEST-001 — Bộ test API đang đỏ và coverage bảo mật rất mỏng

- **Kết quả chạy:** 2 suite pass, 1 suite fail; `auth.service.spec.ts` không cung cấp `VerificationCodeStore`. Tổng cộng chỉ thấy 3 file spec, chưa có E2E cho auth/payment/ownership/quota/upload.
- **Cần làm:** sửa fixture test; thêm E2E cho SEC-001/002, IDOR, role guard, refresh rotation/replay, account lock, credit race/idempotency, upload limits và WebSocket expiry.
- **Nghiệm thu:** test/lint/build xanh trong CI từ checkout sạch; có coverage gate cho module nhạy cảm (ưu tiên branch coverage, không chỉ line coverage).

### [ ] CI-001 — Chưa thấy pipeline CI/CD và security gates trong repository

- **Cần làm:** pipeline tối thiểu gồm install khóa lockfile, generate Prisma, lint, unit/E2E, production build, `npm audit`, secret scan, dependency/license scan, migration check và image scan; protected branch + approval cho production.
- **Nghiệm thu:** PR không thể merge khi P0 gate đỏ; artifact build immutable và deploy theo digest/commit SHA.

### [ ] OBS-001 — Chưa thấy monitoring/alerting production đầy đủ

- **Cần làm:** structured log + correlation ID; metrics 4xx/5xx/latency, DB pool, Redis memory, BullMQ waiting/active/failed/stalled, AI tokens/cost/error theo feature, R2 failure, payment mismatch/webhook auth failures; error tracking có scrub PII.
- **Nghiệm thu:** dashboard và alert đã thử bằng sự cố giả; alert có owner/runbook và không chứa transcript/CV/token.

### [ ] RUN-001 — Thiếu runbook backup, migration, rollback và incident response

- **Cần làm:** PostgreSQL backup + PITR và restore drill; Redis persistence/HA phù hợp vì chứa queue/session/OTP; R2 lifecycle/versioning; `prisma migrate deploy` trong release; pre-deploy backup; backward-compatible migration; rollback app không rollback schema mù; rotate/revoke secrets; quy trình mất provider/queue/payment.
- **Nghiệm thu:** đã restore thử vào môi trường cô lập; đo được RPO/RTO; rollback release và rotate key được diễn tập.

## Checklist cấu hình production

### Network và hạ tầng

- [ ] API/web chỉ public qua HTTPS; HSTS được xác nhận trên domain thật.
- [ ] Postgres và Redis nằm private network, không publish port Internet; dùng credential riêng, rotation và TLS theo hạ tầng.
- [ ] `TRUST_PROXY` khớp đúng số/lớp proxy; test IP thật để rate limit không bị spoof hoặc gom mọi user thành một IP.
- [ ] CORS HTTP và WebSocket chỉ cho đúng frontend origin production; không wildcard với credentials.
- [ ] Có health/readiness, graceful shutdown, deploy rolling và worker drain queue trước khi tắt.
- [ ] Cron/scheduled job có cơ chế leader/singleton khi chạy nhiều replica, hoặc chứng minh mọi cron idempotent.

### Secret và tài khoản dịch vụ

- [ ] JWT access/refresh secret mạnh, khác nhau, lưu trong secret manager; có kế hoạch rotation/kid.
- [ ] R2 key dùng least privilege và tách public/private bucket; không dùng key admin toàn account.
- [ ] Groq/DeepSeek đặt provider budget/rate limit và alert; tách key dev/staging/prod.
- [ ] Sepay webhook secret bắt buộc; API key đối soát read-only nếu có thể.
- [ ] Resend domain đã cấu hình SPF, DKIM, DMARC; `MAIL_FROM` không dùng domain onboarding mặc định.
- [ ] Google OAuth production chỉ có redirect/origin chính xác; không để localhost origin trong client production.

### Dữ liệu và quyền riêng tư

- [ ] Có privacy policy/terms/consent cho gửi transcript/CV sang Groq/DeepSeek và thời gian lưu dữ liệu.
- [ ] Có retention cho audio, CV, transcript, raw payment payload, support image và audit log.
- [ ] Có luồng xóa tài khoản/export dữ liệu; xóa DB đồng bộ với R2 qua cleanup job có retry/dead-letter.
- [ ] Log/error tracking/analytics đã scrub email, IP, CV, transcript, token, OTP, payment payload.
- [ ] Kiểm tra data residency/DPA và chính sách sử dụng dữ liệu của provider AI/R2/email.

### Thanh toán và nghiệp vụ

- [ ] Webhook verify signature, freshness và idempotency; payload có schema/size limit.
- [ ] Test chuyển đủ, thiếu, dư, trùng webhook, webhook đến muộn, transaction ID trùng và concurrent delivery.
- [ ] Quyết định lại hành vi “thiếu tiền -> FAILED”: cần xử lý được chuyển bổ sung/đối soát thay vì mất đơn vĩnh viễn.
- [ ] Có reconciliation hằng ngày và alert khi webhook/order/bank transaction lệch.

### AI cost và queue

- [ ] Mọi AI call có input/output cap, timeout, retry policy và usage telemetry.
- [ ] Có hard daily/monthly budget, circuit breaker và kill switch theo provider/feature.
- [ ] Job ID/idempotency key, credit reserve/consume/release được test dưới race condition và worker crash.
- [ ] Có dashboard queue, dead-letter/retry runbook và giới hạn retention payload lỗi; payload queue không chứa secret/file buffer lớn.
- [ ] Load test mass-account, multi-tab, multi-instance và provider 429/timeout.

### Web và API

- [ ] Sửa redirect allowlist; thu hẹp CSP; chạy security headers scan trên domain production.
- [ ] API production không trả stack/internal error; log không chứa Redis URL credential.
- [ ] Upload kiểm tra magic bytes, codec, multipart limits; R2 trả `nosniff`/content disposition phù hợp.
- [ ] Access token hết hạn/khóa user/hạ role được áp dụng cả HTTP và WebSocket.
- [ ] Admin có MFA/step-up, session ngắn hơn, audit đầy đủ và cảnh báo hành động nhạy cảm.

## Kết quả kiểm tra đã chạy

| Kiểm tra                       | Kết quả                                                                                            |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| `apps/api` production build    | **PASS**                                                                                           |
| `apps/web` production build    | **PASS**                                                                                           |
| Frontend lint                  | **PASS với 1 warning**: import `TopicBadge` không dùng trong `MockRoomProgress.tsx`                |
| API unit tests                 | **FAIL**: `AuthService` test thiếu provider `VerificationCodeStore`; 2/3 suite pass, 8/9 test pass |
| Dependency audit               | **FAIL**: 25 vulnerabilities, gồm 2 critical và 16 high                                            |
| Secret scan trong file tracked | Không thấy pattern secret phổ biến; các `.env` local không được Git track                          |
| Git working tree trước báo cáo | Sạch                                                                                               |

## Các biện pháp đang làm tốt

- Refresh token dùng httpOnly cookie, allowlist Redis, `jti` và rotation atomic; đổi/reset password thu hồi refresh sessions.
- API có global validation `whitelist + forbidNonWhitelisted`, Redis-backed throttling, Helmet, CORS allowlist và role guard server-side.
- Credit AI có transaction/advisory lock, reservation/idempotency và cleanup; nhiều luồng kiểm tra ownership bằng `userId`.
- CV lưu private, có PDF magic check, giới hạn trang/text, parse trong child process có timeout/heap limit và che một phần PII trước khi gửi AI.
- Webhook dùng raw body, HMAC và `timingSafeEqual` khi secret được cấu hình.
- Audit log có redaction các key nhạy cảm; output AI quan trọng được parse/normalize trước khi lưu.

## Giới hạn của lần rà soát

- Đây là code/config review kết hợp build, test và dependency audit; chưa phải penetration test động.
- Chưa truy cập hạ tầng production, firewall, Cloudflare/R2 policy, database thật, Redis ACL/TLS, Sepay dashboard, provider budget hoặc log runtime.
- Chưa chạy migration trên bản sao dữ liệu production, restore drill, load test, DAST, SAST chuyên dụng hoặc fuzz multipart/PDF/WebSocket.
- Vì chưa có manifest production trong repository, mọi mục hạ tầng phải được xác nhận lại trên nền tảng deploy thực tế.

## Gợi ý thứ tự thực hiện

1. SEC-001, SEC-002, DEP-001.
2. DATA-001, AI-001, AI-002, AUTH-001, INFO-001.
3. OPS-001, OPS-002 và sửa test/CI.
4. Hoàn tất checklist cấu hình, staging smoke/load/security test.
5. Chỉ mở production sau khi có backup/rollback, monitoring và budget kill switch hoạt động.
