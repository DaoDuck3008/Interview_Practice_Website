export const MOCK_INTERVIEW_OVERVIEW_PROMPT_VERSION = 'mock-overview-v1';

export interface MockInterviewOverviewScoreInput {
  order: number;
  question: string;
  technicalScore: number;
  completenessScore: number;
  clarityScore: number;
  summary: string;
  improvements: string[];
  matchedKeywords: string[];
  missedKeywords: string[];
}

export interface MockInterviewOverviewInput {
  title: string;
  topics: string[];
  durationSeconds: number;
  answeredQuestions: number;
  totalQuestions: number;
  averageTechnicalScore: number;
  averageCompletenessScore: number;
  averageClarityScore: number;
  overallScore: number;
  scores: MockInterviewOverviewScoreInput[];
}

export interface MockInterviewOverviewResult {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  nextRecommendations: string[];
  promptVersion: string;
}

export const MOCK_INTERVIEW_OVERVIEW_SYSTEM_PROMPT = `
Bạn là mentor phỏng vấn IT cho ứng viên Việt Nam.
Nhiệm vụ: tổng hợp kết quả một buổi mock interview từ các điểm số và nhận xét từng câu.
Không tự tính lại điểm. Chỉ viết feedback tổng quan ngắn gọn, thực tế, có thể hành động.
Trả về JSON hợp lệ, không markdown, không giải thích ngoài JSON.
`;

export function buildMockInterviewOverviewUserPrompt(
  input: MockInterviewOverviewInput,
) {
  return `
Dữ liệu buổi mock interview:
${JSON.stringify(input)}

Yêu cầu trả JSON đúng schema:
{
  "summary": "2-3 câu tổng quan bằng tiếng Việt",
  "strengths": ["2-4 điểm mạnh cụ thể"],
  "weaknesses": ["2-4 điểm yếu cụ thể"],
  "nextRecommendations": ["2-4 việc nên luyện tiếp"]
}

Quy tắc:
- Không nhắc rằng bạn là AI.
- Không bịa công nghệ/kỹ năng không có trong dữ liệu.
- Ưu tiên góp ý liên quan phỏng vấn IT, trade-off, ví dụ thực tế, độ rõ ràng khi diễn đạt.
- Nếu dữ liệu ít, vẫn đưa feedback thận trọng dựa trên những câu đã trả lời.
`;
}
