/**
 * Improvement prompt — DeepSeek integration.
 *
 * Sinh prompt để DeepSeek viết lại câu trả lời tốt hơn dựa trên transcript gốc và
 * kết quả chấm điểm. Tính năng on-demand (user bấm nút "Cải thiện"), kết quả nên cache vào DB.
 * Hệ thống hỗ trợ ôn tập lập trình IT nói chung: web, backend, DevOps, triển khai...
 *
 * Tách thành 2 phần để tận dụng prompt caching của DeepSeek (cache theo prefix):
 * - `IMPROVEMENT_SYSTEM_PROMPT`: phần CỐ ĐỊNH (nhiệm vụ + nguyên tắc + format) → `system` message.
 * - `buildImprovementUserPrompt(...)`: phần THAY ĐỔI (câu hỏi + transcript + điểm số) → `user` message.
 *
 * Lưu ý khi triển khai service (giai đoạn sau): gọi `https://api.deepseek.com/chat/completions`
 * với `config.get('deepseek.apiKey')`, model `deepseek-v4-flash`, `temperature: 0.5`,
 * `max_tokens: 1500`, `timeout: 15000`, `response_format: { type: 'json_object' }`,
 * messages: [{ role: 'system', content: IMPROVEMENT_SYSTEM_PROMPT }, { role: 'user', content: buildImprovementUserPrompt(...) }].
 * Sau khi parse, lọc annotations chỉ giữ phần `originalSegment` thực sự có trong transcript.
 */

import type { QuestionInput, ScoreResult } from './scoring.prompt';

export interface Annotation {
  originalSegment: string;
  issue: string;
  suggestion: string;
}

export interface ImprovementResult {
  improvedAnswer: string;
  annotations: Annotation[];
  keyChanges: string[];
}

export const IMPROVEMENT_SYSTEM_PROMPT = `
Bạn là mentor giúp ứng viên người Việt cải thiện câu trả lời phỏng vấn cho vị trí lập trình viên IT (bao trùm web, backend, DevOps, triển khai/deployment, hệ thống...).

## NHIỆM VỤ

Dựa trên câu trả lời gốc của ứng viên, viết lại thành phiên bản tốt hơn — NHƯNG GIỮ NGUYÊN giọng điệu, cách diễn đạt, và "chất" của họ. Chỉ sửa nội dung, không sửa phong cách.

## NGUYÊN TẮC QUAN TRỌNG

1. **Bám sát văn phong gốc**: Nếu user nói thân mật, giữ thân mật. Nếu user nói chậm rãi, đừng viết lại thành nhanh dồn dập. Mục tiêu là user đọc bản cải thiện thấy "đây vẫn là cách MÌNH nói, chỉ tốt hơn".

2. **Chỉ sửa những gì thực sự cần**: Đừng viết lại từ đầu nếu không cần. Giữ tối đa câu/cụm từ gốc đã đúng và hay.

3. **Bỏ qua lỗi STT**: Transcript có thể có lỗi nhận diện thuật ngữ (vd: "DeepUV" thực ra là "libuv", "Cuber net tis" thực ra là "Kubernetes"). Khi viết bản cải thiện, dùng dạng chuẩn của thuật ngữ.

4. **Giải quyết các vấn đề đã được chỉ ra**: Dựa vào feedback và missedKeywords để biết cần thêm/sửa gì.

## YÊU CẦU FORMAT

Trả về JSON THUẦN (không markdown, không giải thích thêm):

{
  "improvedAnswer": "Bản câu trả lời đã cải thiện, viết theo VĂN PHONG GỐC của user. Độ dài tương đương hoặc ngắn hơn bản gốc một chút. Sử dụng từ ngữ tự nhiên như người Việt nói chuyện, không quá học thuật.",

  "annotations": [
    {
      "originalSegment": "đoạn TRÍCH NGUYÊN VĂN từ câu trả lời gốc cần sửa (copy chính xác)",
      "issue": "vấn đề ngắn gọn (1 câu)",
      "suggestion": "cách sửa cụ thể (1-2 câu)"
    }
  ],

  "keyChanges": [
    "thay đổi quan trọng 1 (vd: 'Bỏ phần liệt kê lợi ích vì câu hỏi không hỏi')",
    "thay đổi 2",
    "thay đổi 3"
  ]
}

## LƯU Ý CUỐI

- "originalSegment" phải là chuỗi xuất hiện THẬT trong transcript (để frontend highlight được)
- Tối đa 3-5 annotations — chỉ những điểm quan trọng nhất
- Nếu câu trả lời gốc đã tốt (>=8.5/10) → improvedAnswer vẫn cải thiện nhẹ, annotations có thể chỉ 1-2 mục
- KHÔNG đề cập đến lỗi phát âm hay transcript trong bất kỳ field nào
`;

export const buildImprovementUserPrompt = (
  transcript: string,
  question: QuestionInput,
  scoreResult: ScoreResult,
): string => `
## CÂU HỎI PHỎNG VẤN

"${question.content}"

## ĐÁP ÁN CHUẨN (tham khảo)

${question.answerKeySummary}

## TỪ KHÓA CẦN ĐỀ CẬP

${question.answerKeywords.join(', ')}

## CÂU TRẢ LỜI GỐC CỦA ỨNG VIÊN

"${transcript}"

## ĐIỂM SỐ HIỆN TẠI

- Technical: ${scoreResult.technicalScore}/10
- Completeness: ${scoreResult.completenessScore}/10
- Clarity: ${scoreResult.clarityScore}/10

## VẤN ĐỀ ĐÃ ĐƯỢC CHỈ RA

Tóm tắt: ${scoreResult.feedback.summary}

Cần cải thiện:
${scoreResult.feedback.improvements.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Từ khóa bị thiếu: ${scoreResult.missedKeywords.join(', ') || 'không có'}
`;
