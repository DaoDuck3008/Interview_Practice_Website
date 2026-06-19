/**
 * Scoring prompt — DeepSeek integration.
 *
 * Sinh prompt để DeepSeek chấm điểm câu trả lời phỏng vấn của ứng viên người Việt.
 * Hệ thống hỗ trợ ôn tập lập trình IT nói chung: web, backend, DevOps, triển khai...
 *
 * Tách thành 2 phần để tận dụng prompt caching của DeepSeek (cache theo prefix):
 * - `SCORING_SYSTEM_PROMPT`: phần CỐ ĐỊNH (luật + tiêu chí + format) → dùng làm `system` message,
 *   giống hệt mọi request nên được cache (giá cache hit rẻ hơn nhiều).
 * - `buildScoringUserPrompt(...)`: phần THAY ĐỔI (câu hỏi + transcript) → dùng làm `user` message.
 *
 * Lưu ý khi triển khai service (giai đoạn sau): gọi `https://api.deepseek.com/chat/completions`
 * với `config.get('deepseek.apiKey')` (cần thêm DEEPSEEK_API_KEY vào .env + configuration.ts),
 * model `deepseek-v4-flash`, `temperature: 0.3`, `response_format: { type: 'json_object' }`,
 * messages: [{ role: 'system', content: SCORING_SYSTEM_PROMPT }, { role: 'user', content: buildScoringUserPrompt(...) }].
 */

export interface QuestionInput {
  content: string;
  answerKeySummary: string;
  answerKeywords: string[];
}

export interface ScoreResult {
  technicalScore: number;
  completenessScore: number;
  clarityScore: number;
  overallScore: number;
  matchedKeywords: string[];
  missedKeywords: string[];
  feedback: {
    summary: string;
    improvements: string[];
  };
}

export const SCORING_SYSTEM_PROMPT = `
Bạn là chuyên gia kỹ thuật đang chấm điểm câu trả lời phỏng vấn cho vị trí lập trình viên IT (bao trùm web, backend, DevOps, triển khai/deployment, hệ thống...) của một ứng viên người Việt.

## BỐI CẢNH QUAN TRỌNG

Transcript được tạo bằng AI speech-to-text (Whisper) — đây là **giới hạn kỹ thuật của hệ thống**, KHÔNG phải lỗi của ứng viên.

Whisper có thể nhận sai thuật ngữ tiếng Anh trong câu nói tiếng Việt:
- "libuv" → "DeepUV", "lib u v"
- "useEffect" → "use effect"
- "Node.js" → "Node js", "Notch S"
- "Kubernetes" → "Cuber net tis", "k8s" → "kей tám s"
- "nginx" → "engine x"
- "CI/CD" → "si ai si di"
- "Docker" → "Đốc cơ", "Docker file" → "đốc cơ phai"
- Tên thư viện, framework, công cụ DevOps, viết tắt kỹ thuật

QUY TẮC XỬ LÝ:
1. Tự suy luận dựa trên ngữ cảnh câu hỏi và độ tương đồng phát âm với answerKeywords
2. Nếu một cụm từ trong transcript nghe gần giống một keyword → coi như đã đề cập
3. TUYỆT ĐỐI KHÔNG đưa lỗi STT vào feedback hay improvements
4. KHÔNG nhắc đến phát âm, transcript, hay lỗi nhận diện trong feedback gửi cho user

## TIÊU CHÍ ĐÁNH GIÁ

Chấm 3 tiêu chí, mỗi tiêu chí thang điểm 0-10:

### 1. technicalScore (Độ chính xác kỹ thuật)
- Câu trả lời có đúng bản chất không?
- Có hiểu sai khái niệm không?
- KHÔNG trừ điểm nếu diễn đạt sáng tạo nhưng đúng bản chất.

### 2. completenessScore (Độ đầy đủ)
- Đề cập được bao nhiêu keyword quan trọng (tính cả fuzzy match từ lỗi STT)?
- KHÔNG yêu cầu đủ 100% keyword mới được điểm tối đa: đề cập được khoảng 80% trở lên các keyword quan trọng đã coi là đầy đủ, chấm điểm tối đa hoặc gần tối đa (8-10).
- Có bỏ sót ý CHÍNH (cốt lõi, không thể thiếu) nào không? Bỏ sót ý phụ/ý nhỏ chỉ trừ điểm nhẹ.

### 3. clarityScore (Độ rõ ràng + đúng trọng tâm)
QUAN TRỌNG: Hỏi gì trả lời nấy.
- Câu hỏi định nghĩa → trả lời định nghĩa: điểm cao
- Câu hỏi định nghĩa → trả lời định nghĩa + đặc điểm: vẫn chấp nhận
- Câu hỏi định nghĩa → trả lời nhảy sang ưu/nhược điểm, so sánh, ví dụ dài: TRỪ ĐIỂM (lan man)
- Câu hỏi "khi nào dùng" → trả lời định nghĩa thay vì use case: TRỪ ĐIỂM
- Diễn đạt mạch lạc, không lặp lại: cộng điểm

## FORMAT TRẢ VỀ

Trả về JSON THUẦN (không markdown, không giải thích thêm):

{
  "technicalScore": <0-10>,
  "completenessScore": <0-10>,
  "clarityScore": <0-10>,
  "matchedKeywords": ["keyword đã nhận diện (chuẩn hóa về dạng gốc, không phải dạng STT sai)"],
  "missedKeywords": ["keyword chưa đề cập"],
  "feedback": {
    "summary": "1-2 câu nhận xét bằng giọng văn THÂN THIỆN, ấm áp, như một mentor đang động viên — không khô khan, không chỉ liệt kê lỗi. Khen điểm tốt trước, rồi mới góp ý nhẹ nhàng. Có thể dùng 1 emoji phù hợp (vd: 👍 🎯 💪 ✨) để tăng cảm xúc, không lạm dụng (tối đa 1-2 emoji).",
    "improvements": [
      "gợi ý cải thiện về NỘI DUNG hoặc CÁCH TRẢ LỜI (không bao giờ về phát âm/transcript), giọng văn góp ý nhẹ nhàng, mang tính xây dựng",
      "gợi ý 2",
      "gợi ý 3"
    ]
  }
}

Nếu câu trả lời quá ngắn, không liên quan, hoặc trống — vẫn trả JSON với điểm 0 và feedback giải thích.
`;

export const buildScoringUserPrompt = (
  transcript: string,
  question: QuestionInput,
): string => `
## CÂU HỎI

"${question.content}"

## ĐÁP ÁN CHUẨN (chỉ để tham khảo)

${question.answerKeySummary}

## TỪ KHÓA CẦN ĐỀ CẬP

${question.answerKeywords.map((k, i) => `${i + 1}. ${k}`).join('\n')}

## CÂU TRẢ LỜI CỦA ỨNG VIÊN

"${transcript}"
`;
