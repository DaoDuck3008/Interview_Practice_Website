# Kế hoạch triển khai Backend Mock CV Interview

## Quyết định đã chốt

- Không dùng `targetLevel`; `targetRole` là bắt buộc.
- Upload PDF tối đa 5 MB/20 trang vào bucket R2 private riêng.
- DB chỉ lưu text CV đã che email, số điện thoại và thông tin liên hệ không cần thiết.
- Profile và sinh câu hỏi chạy trong `ai-jobs`; auto-submit dùng queue timer `mock-interview-jobs`.
- Một CV có một bộ câu hỏi dùng lại cho các lần làm bài; lần đầu chọn 4–20 câu, các lần sau chỉ đổi thời lượng 5–120 phút.
- Câu hỏi chia gần 50/50 giữa question bank và AI; AI bù phần question bank bị thiếu.
- Chưa tính quota cho hai lượt AI chuẩn bị CV; từng audio trả lời vẫn dùng quota hiện tại.
- Admin Mock CV nằm ngoài scope v1.

## Giai đoạn 0 — Schema và hạ tầng dùng chung

1. Cho phép `Session.questionId` nullable để câu AI không phải tạo record giả trong question bank; các luồng chấm điểm phải lấy snapshot từ `MockCvInterviewQuestion` khi không có `Question`.
2. Bổ sung lifecycle độc lập cho profile và question generation trong `MockCvAnalysis`, có attempt/timestamp để chống double-click, job trùng và kết quả job cũ ghi đè retry mới.
3. Bổ sung readiness, claims cần chuẩn bị bằng chứng và prompt version vào `MockCvInterview`.
4. Thêm `R2_PRIVATE_BUCKET_NAME` và các hàm upload/download/delete private; không tạo public URL cho CV.
5. Thêm `pdf-parse` và constants giới hạn file, số trang, số câu, thời lượng, stale timeout và cooldown.

## Giai đoạn 1 — Upload và phân tích profile

1. `POST /mock-cvs` nhận multipart `cv` + `targetRole`, kiểm tra MIME, magic bytes, kích thước và ownership.
2. Upload R2 private, transaction tạo `MockCv` + `MockCvAnalysis(PENDING)`, sau đó claim và enqueue job profile theo `analysisId + attempt`.
3. Worker tải PDF, kiểm tra 20 trang, extract text, redact PII, lưu text đã redact và gọi `mock-cv-profile.prompt.ts` với leaf topics hợp lệ.
4. Validate JSON AI, enum, topic slug và quy tắc profile rỗng khi `UNSUPPORTED/NEEDS_REUPLOAD`; chỉ ghi khi attempt còn khớp.
5. Cung cấp list/detail/retry-analysis/delete; không trả `fileKey`, extracted text hoặc lỗi nội bộ. WebSocket là kênh nhanh, GET detail là polling fallback.

## Giai đoạn 2 — Lazy question generation và bắt đầu bài

1. `POST /mock-cvs/:id/start` nhận `totalQuestions` và `durationSeconds`; nếu chưa có câu hỏi thì claim generation và trả `PREPARING`, chưa chạy timer.
2. Backend chọn `floor(total/2)` câu bank từ `topicSlugs`; AI sinh phần còn lại và bù số bank thiếu. Không lọc level.
3. Validate đủ số câu, focus area, answer key, 3–8 keyword và chống câu trùng; lưu toàn bộ snapshot + chuyển `READY` trong một transaction.
4. Khi frontend gọi lại start sau event/poll, dùng advisory lock theo `mockCvId`, tạo đúng một `MockCvInterview`, snapshot câu hỏi và bắt đầu timer.
5. Một CV chỉ có một question set; tổng số câu bị khóa sau lần chuẩn bị đầu, thời lượng được chọn lại khi retake.

## Giai đoạn 3 — Trả lời, submit và chấm điểm

1. Các API detail/answer/submit/retry/result bám hành vi Mock Interview hiện tại: Redis answer lock, quota reservation, Whisper, R2 audio và advisory lock giữa answer/submit.
2. Session của câu bank lưu `questionId`; session của câu AI để null và dùng snapshot `MockCvInterviewQuestion` khi chấm.
3. Mở rộng timer queue cho auto-submit/recovery Mock CV, giữ grace window để câu nộp sát giờ vẫn được ghi nhận.
4. AI jobs chấm từng session, tổng hợp averages và gọi `mock-cv-interview-overview.prompt.ts`; lưu readiness, strengths, weaknesses, claims và recommendations.
5. Retry chỉ dành cho bài đã submit nhưng câu bị lỗi/stale, không chấm lại câu đã có Score; cooldown 60 giây, không giới hạn tổng retry.

## Giai đoạn 4 — Xóa dữ liệu và bảo vệ vận hành

1. Chặn xóa khi interview đang `IN_PROGRESS/SUBMITTED/SCORING`.
2. Xóa Session trước để dọn Score/Improvement, sau đó xóa Mock CV cascade; dọn PDF private và audio best-effort.
3. Không log CV text, prompt data, file key hoặc PII; BullMQ payload chỉ chứa ID/userId/attempt.
4. Upload dùng heavy-upload throttle; start/retry dùng AI-action throttle; lỗi enqueue được ghi về DB và stale state cho phép user retry.

## Kiểm thử bắt buộc

- Unit: PDF validation/extraction/redaction, AI output normalization, phân bổ bank–AI, resolve question context, stale/cooldown/attempt.
- Integration: cleanup R2 khi DB lỗi, enqueue lỗi, job cũ hoàn thành muộn, transaction lưu câu hỏi, double-start và delete cascade.
- E2E: CV IT, CV ngoài phạm vi, PDF scan/rỗng, retry AI/Redis, ownership, retake, câu AI có `Session.questionId = null`, nộp sát giờ và overview.
- Sau mỗi giai đoạn chạy Prisma validate/generate, migration development, test liên quan và API build.

## Lưu ý frontend

- Hiển thị riêng trạng thái profile và question generation; dùng WebSocket kèm polling fallback.
- Sau khi user bấm bắt đầu và API trả `PREPARING`, khóa nút để tránh gửi lặp và hiển thị thông báo: “Đang chuẩn bị bộ câu hỏi từ CV, quá trình này thường mất khoảng 20–40 giây.”
- `PREPARING` chưa chạy timer; lắng nghe event `mock-cv:questions-updated`, đồng thời polling `GET /mock-cvs/:id` mỗi 2–3 giây làm fallback.
- Khi `questionGenerationStatus = READY`, tự gọi lại `POST /mock-cvs/:id/start` nếu user vẫn ở màn chờ; khi `FAILED` mới hiển thị nút thử lại theo trạng thái backend cho phép.
- Không hiển thị phần trăm tiến độ giả; nếu chờ lâu hơn dự kiến thì đổi nội dung thông báo nhưng vẫn bám trạng thái thật từ backend.
- Khóa selector số câu sau khi question set đã tạo, nhưng cho chọn lại thời lượng.
- Phòng trả lời không được giả định câu luôn có topic, level hoặc question-bank ID.
- Không tạo URL trực tiếp tới file CV private; admin UI Mock CV để giai đoạn sau.
