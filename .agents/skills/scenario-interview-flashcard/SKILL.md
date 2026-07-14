---
name: scenario-interview-flashcard
description: >
  Tạo câu trả lời flashcard cho các câu hỏi phỏng vấn IT dạng tình huống thực tế/case study.
  Dùng khi người dùng hỏi cách xử lý một bài toán thực tế về backend, database, API, performance,
  scalability, system design, data processing, SQL, debugging, trade-off kỹ thuật, hoặc muốn import
  các câu hỏi tình huống vào DB học phỏng vấn. Ví dụ: "Có 10000 giao dịch trong ngày, làm sao tìm top
  10 user có tổng tiền giao dịch cao nhất?".
---

# Scenario Interview Flashcard

## Mục Tiêu

Tạo câu trả lời cô đọng, tự nhiên và thực chiến cho câu hỏi phỏng vấn tình huống. Trọng tâm là giúp người học hiểu cách nghĩ và hướng giải, không ép câu trả lời vào một khuôn cố định.

## Nguyên Tắc Trả Lời

Mỗi flashcard nên mở bằng `# [Câu hỏi tình huống]`, sau đó trả lời theo mạch phù hợp với bối cảnh câu hỏi. Không bắt buộc phải có đủ các mục giống nhau cho mọi câu.

Luôn ưu tiên:

1. **Hiểu đúng bài toán:** Nêu ngắn input, output, điều kiện quan trọng hoặc giả định cần hỏi lại.
2. **Đi sâu hướng giải:** Trình bày cách làm chính theo từng bước hợp lý, giải thích vì sao chọn cách đó. Nếu có thể trình bày bằng code ngắn, SQL, pseudo-code thì hãy làm để minh họa hướng giải, comment output từng đoạn (nếu cần), comment Tiếng việt để giải thích (nếu cần).
3. **Minh họa khi có ích:** Dùng SQL, pseudo-code hoặc TypeScript/JavaScript ngắn nếu nó làm câu trả lời dễ nhớ hơn. (Chỉ làm khi bước 2 không có code minh họa, hoặc code minh họa giúp làm rõ hướng giải.)
4. **Nhắc điểm thực tế khi cần:** Chỉ thêm tối ưu, mở rộng, độ phức tạp, production note hoặc trade-off khi chúng thật sự liên quan đến câu hỏi.

Không biến mọi câu trả lời thành các mục cứng như "Tối ưu / mở rộng" hay "Độ phức tạp". Với câu Fresher/Junior, thường chỉ cần làm rõ bài toán, hướng giải đúng, ví dụ ngắn và một lưu ý dễ nhớ.

## Phong Cách Flashcard

- Trả lời bằng tiếng Việt, giữ thuật ngữ kỹ thuật tiếng Anh khi tự nhiên hơn.
- Không dùng emoji hoặc icon.
- Không dùng heading `##` trong nội dung flashcard; chỉ dùng một heading `#`.
- Ưu tiên giọng trả lời như đang phỏng vấn: mạch lạc, tự nhiên, có lý do.
- Tổng flashcard thường dưới khoảng 25 dòng, nhưng có thể linh hoạt nếu tình huống cần phân tích kỹ hơn.
- Không lan man lý thuyết; mọi ý nên phục vụ trực tiếp cho hướng giải.
- Nếu bài toán dữ liệu/bảng, ưu tiên SQL minh họa.
- Nếu bài toán backend/API, ưu tiên pseudo-code hoặc code ngắn.
- Nếu nêu nhiều hướng giải, nói hướng mặc định trước, sau đó mới nói khi nào cần hướng khác.

## Những Ý Chỉ Thêm Khi Cần

Thêm các phần sau chỉ khi chúng làm câu trả lời tốt hơn:

- **Tối ưu / mở rộng:** khi dữ liệu lớn, truy vấn lặp lại nhiều, tải cao, hoặc có yêu cầu scalability.
- **Độ phức tạp:** khi câu hỏi thiên về thuật toán, xử lý dữ liệu trong memory, hoặc cần so sánh giải pháp.
- **Lưu ý production:** khi có rủi ro thực tế như timezone, index, memory, race condition, idempotency, retry, cache invalidation, security, monitoring.
- **Trade-off:** khi có nhiều lựa chọn hợp lý và cần giải thích vì sao chọn cách này thay vì cách kia.

## Gợi Ý Khung Mềm

Không cần dùng nguyên văn, chỉ dùng như checklist trong đầu:

````markdown
# [Câu hỏi tình huống]

[1 câu nói bản chất bài toán.]

Trước hết cần làm rõ [điều kiện quan trọng]. Với bài này, hướng giải hợp lý là [ý chính].

1. [Bước xử lý quan trọng đầu tiên]
2. [Bước tiếp theo]
3. [Bước chốt để ra kết quả hoặc xử lý lỗi]

Ví dụ:

\```sql
-- code ngắn nếu cần
\```

[Giải thích ngắn vì sao cách này đúng / khi nào cần nâng cấp thêm.]

_Mẹo nhớ: [1 câu giúp nhớ hướng giải]._

---

_Chủ đề: [Database / Backend / System Design / Node.js / ...]_
````

## Ví Dụ Mẫu

````markdown
# Có 10000 giao dịch trong ngày, làm sao tìm top 10 user có tổng số tiền giao dịch cao nhất?

Bài toán này là lọc giao dịch trong một ngày, cộng tổng tiền theo từng user rồi lấy 10 user có tổng cao nhất.

Trước hết cần thống nhất chỉ tính giao dịch thành công và xác định ngày theo timezone nghiệp vụ. Hướng giải trực tiếp nhất là để database làm phần tổng hợp vì dữ liệu đang nằm trong bảng giao dịch.

1. Lọc `transactions` theo `status = 'SUCCESS'` và khoảng thời gian `[startOfDay, nextDay)`.
2. `GROUP BY user_id` để gom giao dịch theo từng user.
3. Dùng `SUM(amount)` để tính tổng tiền, sau đó `ORDER BY total_amount DESC LIMIT 10`.

Ví dụ:

\```sql
SELECT user_id, SUM(amount) AS total_amount
FROM transactions
WHERE status = 'SUCCESS'
AND created_at >= $1 AND created_at < $2
GROUP BY user_id
ORDER BY total_amount DESC
LIMIT 10;
\```

Nếu bảng lớn hoặc query chạy thường xuyên, nên có index theo `created_at`, `status` và cân nhắc bảng tổng hợp theo ngày.

_Mẹo nhớ: lọc đúng dữ liệu, nhóm theo user, cộng tiền, sắp xếp lấy top._

---

_Chủ đề: Database_
````
