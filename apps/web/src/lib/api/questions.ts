import api, { type ApiResponse } from "./api";

export type Level = "INTERN" | "FRESHER" | "JUNIOR" | "MID" | "SENIOR" | "OTHER";

export const LEVELS: { value: Level; label: string }[] = [
  { value: "INTERN", label: "Intern" },
  { value: "FRESHER", label: "Fresher" },
  { value: "JUNIOR", label: "Junior" },
  { value: "MID", label: "Mid" },
  { value: "SENIOR", label: "Senior" },
  { value: "OTHER", label: "Other" },
];

export interface Question {
  id: string;
  topicId: string;
  content: string;
  detailAnswerKey: string;
  answerKeySummary: string;
  answerKeywords: string[];
  level: Level;
  isActive: boolean;
  topic?: { id: string; slug: string; name: string };
}

export interface QuestionInput {
  topicId: string;
  content: string;
  detailAnswerKey: string;
  answerKeySummary: string;
  answerKeywords: string[];
  level: Level;
}

/** Admin: list mọi câu hỏi (kể cả đã ẩn) */
export async function getAllQuestionsAdmin(): Promise<Question[]> {
  const res = await api.get<ApiResponse<Question[]>>("/questions/all");
  return res.data.data;
}

/** Admin: lấy 1 câu hỏi theo id */
export async function getQuestionAdmin(id: string): Promise<Question> {
  const res = await api.get<ApiResponse<Question>>(`/questions/${id}`);
  return res.data.data;
}

export async function createQuestion(input: QuestionInput): Promise<Question> {
  const res = await api.post<ApiResponse<Question>>("/questions", input);
  return res.data.data;
}

export async function updateQuestion(
  id: string,
  input: Partial<QuestionInput> & { isActive?: boolean },
): Promise<Question> {
  const res = await api.patch<ApiResponse<Question>>(`/questions/${id}`, input);
  return res.data.data;
}

/** Soft-delete (set isActive=false) */
export async function deleteQuestion(id: string): Promise<void> {
  await api.delete(`/questions/${id}`);
}

export async function getQuestionsByTopic(topicSlug: string): Promise<Question[]> {
  try {
    const topicsRes = await api.get<ApiResponse<{ id: string; slug: string }[]>>("/topics");
    const topics = topicsRes.data.data;
    const topic = topics.find((t) => t.slug === topicSlug);
    if (!topic) return FALLBACK_QUESTIONS;

    const qRes = await api.get<ApiResponse<Question[]>>(`/questions?topicId=${topic.id}`);
    const questions = qRes.data.data;
    return questions.length > 0 ? questions : FALLBACK_QUESTIONS;
  } catch {
    return FALLBACK_QUESTIONS;
  }
}

const FALLBACK_QUESTIONS: Question[] = [
  {
    id: "q-1",
    topicId: "topic-js",
    content: "JavaScript event loop là gì? Hãy giải thích cách nó hoạt động và tại sao nó quan trọng.",
    answerKeySummary: "Event loop là cơ chế cho phép JavaScript thực thi code bất đồng bộ mặc dù là single-threaded.",
    answerKeywords: ["call stack", "task queue", "microtask", "Web APIs", "non-blocking"],
    level: "JUNIOR",
    isActive: true,
    detailAnswerKey: "",
  },
  {
    id: "q-2",
    topicId: "topic-js",
    content: "Sự khác biệt giữa `null` và `undefined` trong JavaScript là gì?",
    answerKeySummary: "null là giá trị rỗng được gán có chủ ý, undefined là giá trị mặc định khi chưa khởi tạo.",
    answerKeywords: ["typeof", "equality", "intentional absence", "uninitialized"],
    level: "JUNIOR",
    isActive: true,
    detailAnswerKey: "",
  },
  {
    id: "q-3",
    topicId: "topic-js",
    content: "Closures trong JavaScript là gì? Cho một ví dụ thực tế về cách sử dụng.",
    answerKeySummary: "Closure là function có thể truy cập biến từ outer scope sau khi outer function đã return.",
    answerKeywords: ["lexical scope", "outer function", "inner function", "data encapsulation"],
    level: "MID",
    isActive: true,
    detailAnswerKey: "",
  },
  {
    id: "q-4",
    topicId: "topic-js",
    content: "Promise và async/await khác nhau như thế nào? Khi nào nên dùng cái nào?",
    answerKeySummary: "Cả hai đều xử lý async code, async/await là syntactic sugar trên Promise giúp code dễ đọc hơn.",
    answerKeywords: ["Promise chain", "async/await", "error handling", ".then()", "try/catch"],
    level: "MID",
    isActive: true,
    detailAnswerKey: "",
  },
  {
    id: "q-5",
    topicId: "topic-js",
    content: "Hãy giải thích prototype chain và prototypal inheritance trong JavaScript.",
    answerKeySummary: "Prototype chain là cơ chế kế thừa của JS, mỗi object có __proto__ trỏ tới prototype của constructor.",
    answerKeywords: ["__proto__", "prototype", "Object.create", "constructor function", "class syntax"],
    level: "SENIOR",
    isActive: true,
    detailAnswerKey: "",
  },
  {
    id: "q-6",
    topicId: "topic-js",
    content: "Memoization là gì? Hãy implement một hàm memoize trong JavaScript.",
    answerKeySummary: "Memoization là kỹ thuật cache kết quả của pure function để tránh tính toán lại với cùng input.",
    answerKeywords: ["cache", "pure function", "Map", "performance optimization", "WeakMap"],
    level: "SENIOR",
    isActive: true,
    detailAnswerKey: "",
  },
];
