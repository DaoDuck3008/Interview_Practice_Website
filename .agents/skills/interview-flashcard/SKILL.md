---
name: it-interview-flashcard
description: >
  Tạo file markdown dạng flashcard để trả lời các câu hỏi phỏng vấn IT.
  Dùng skill này bất cứ khi nào user hỏi một câu hỏi phỏng vấn IT (Node.js, React, Database, System Design, JS, v.v.)
  hoặc yêu cầu giải thích một khái niệm kỹ thuật để học/ôn tập.
  Mỗi câu hỏi xuất ra 1 file markdown riêng.
---

# IT Interview Flashcard Skill

## Quy tắc output

- 1 câu hỏi = 1 file markdown
- Tên file: slug viết thường, dấu gạch ngang. VD: `nodejs-la-gi.md`
- Lưu vào `/mnt/user-data/outputs/` rồi gọi `present_files`

## Cấu trúc file

````markdown
# [Câu hỏi]

[Mô tả ngắn 1–2 câu nếu cần dẫn vào, hoặc bỏ qua]

1. item
2. item
3. item

**Đặc điểm / Lưu ý:** [1 câu in đậm nếu có điểm quan trọng cần nhấn]

Ví dụ: ← CHỈ thêm nếu cần minh họa bằng code

\```language
// code ngắn, tối đa ~8 dòng, có comment tiếng Việt
\```

[câu giải thích kết quả nếu cần, in đậm phần quan trọng]

_Mẹo nhớ: [1 câu mẹo dễ nhớ nếu có]_ ← tùy chọn

---

_Chủ đề: [Node.js / React / JavaScript / Database / System Design / ...]_
````

## Tone & độ dài

- Tuyệt đối không dùng emoji hoặc icon ở bất kỳ đâu
- Không dùng heading `##` cho từng phần — viết liền mạch, dùng bullet/numbering + bold
- Ưu tiên numbered list khi liệt kê có thứ tự, bullet khi không có thứ tự
- So sánh A vs B: dùng bảng markdown
- Tổng file tối đa ~25 dòng
- Không tìm ảnh
