import api, { type ApiResponse } from "./api";

export type Level = "COMMON" | "MEDIUM" | "HARD";

export const LEVELS: { value: Level; label: string }[] = [
  { value: "COMMON", label: "Common" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
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

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type QuestionSortBy = "topic" | "level" | "content" | "status";
export type SortOrder = "asc" | "desc";

export interface AdminQuestionQuery {
  topicId?: string;
  level?: Level;
  search?: string;
  status?: "active" | "hidden";
  sortBy?: QuestionSortBy;
  order?: SortOrder;
  page?: number;
  limit?: number;
}

export interface PublicQuestionQuery {
  topicId?: string;
  level?: Level;
  search?: string;
  page?: number;
  limit?: number;
}

export async function getQuestionsPublic(
  query: PublicQuestionQuery = {},
): Promise<Paginated<Question>> {
  const params: Record<string, string | number> = {};
  //put all query into params paramater
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params[key] = value as string | number;
    }
  }
  try {
    const res = await api.get<ApiResponse<Paginated<Question>>>("/questions", {
      params,
    });
    return res.data.data;
  } catch {
    return {
      items: [],
      total: 0,
      page: 1,
      limit: query.limit ?? 30,
      totalPages: 0,
    };
  }
}

// Admin: list câu hỏi (kể cả đã ẩn) với filter + phân trang phía server
export async function getAllQuestionsAdmin(
  query: AdminQuestionQuery = {},
): Promise<Paginated<Question>> {
  // Bỏ các giá trị rỗng để không gửi param thừa lên server
  const params: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params[key] = value as string | number;
    }
  }
  const res = await api.get<ApiResponse<Paginated<Question>>>(
    "/questions/all",
    { params },
  );
  return res.data.data;
}

/** Admin: số câu hỏi theo từng topic ({ [topicId]: count }) */
export async function getTopicQuestionCounts(): Promise<
  Record<string, number>
> {
  const res = await api.get<ApiResponse<{ topicId: string; count: number }[]>>(
    "/questions/topic-counts",
  );
  const map: Record<string, number> = {};
  for (const { topicId, count } of res.data.data) map[topicId] = count;
  return map;
}

// Admin: lấy 1 câu hỏi theo id
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

// Soft-delete (set isActive=false)
export async function deleteQuestion(id: string): Promise<void> {
  await api.delete(`/questions/${id}`);
}

export async function getQuestionsByTopic(
  topicSlug: string,
): Promise<Question[]> {
  try {
    const topicsRes =
      await api.get<ApiResponse<{ id: string; slug: string }[]>>("/topics");
    const topics = topicsRes.data.data;
    const topic = topics.find((t) => t.slug === topicSlug);
    if (!topic) return FALLBACK_QUESTIONS;

    const qRes = await api.get<ApiResponse<Question[]>>(
      `/questions?topicId=${topic.id}`,
    );
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
    content:
      "JavaScript event loop là gì? Hãy giải thích cách nó hoạt động và tại sao nó quan trọng.",
    answerKeySummary:
      "Event loop là cơ chế cho phép JavaScript thực thi code bất đồng bộ mặc dù là single-threaded.",
    answerKeywords: [
      "call stack",
      "task queue",
      "microtask",
      "Web APIs",
      "non-blocking",
    ],
    level: "MEDIUM",
    isActive: true,
    detailAnswerKey: "",
  },
  {
    id: "q-2",
    topicId: "topic-js",
    content: "Sự khác biệt giữa `null` và `undefined` trong JavaScript là gì?",
    answerKeySummary:
      "null là giá trị rỗng được gán có chủ ý, undefined là giá trị mặc định khi chưa khởi tạo.",
    answerKeywords: [
      "typeof",
      "equality",
      "intentional absence",
      "uninitialized",
    ],
    level: "MEDIUM",
    isActive: true,
    detailAnswerKey: "",
  },
  {
    id: "q-3",
    topicId: "topic-js",
    content:
      "Closures trong JavaScript là gì? Cho một ví dụ thực tế về cách sử dụng.",
    answerKeySummary:
      "Closure là function có thể truy cập biến từ outer scope sau khi outer function đã return.",
    answerKeywords: [
      "lexical scope",
      "outer function",
      "inner function",
      "data encapsulation",
    ],
    level: "MEDIUM",
    isActive: true,
    detailAnswerKey: "",
  },
  {
    id: "q-4",
    topicId: "topic-js",
    content:
      "Promise và async/await khác nhau như thế nào? Khi nào nên dùng cái nào?",
    answerKeySummary:
      "Cả hai đều xử lý async code, async/await là syntactic sugar trên Promise giúp code dễ đọc hơn.",
    answerKeywords: [
      "Promise chain",
      "async/await",
      "error handling",
      ".then()",
      "try/catch",
    ],
    level: "MEDIUM",
    isActive: true,
    detailAnswerKey: "",
  },
  {
    id: "q-5",
    topicId: "topic-js",
    content:
      "Hãy giải thích prototype chain và prototypal inheritance trong JavaScript.",
    answerKeySummary:
      "Prototype chain là cơ chế kế thừa của JS, mỗi object có __proto__ trỏ tới prototype của constructor.",
    answerKeywords: [
      "__proto__",
      "prototype",
      "Object.create",
      "constructor function",
      "class syntax",
    ],
    level: "HARD",
    isActive: true,
    detailAnswerKey: "",
  },
  {
    id: "q-6",
    topicId: "topic-js",
    content:
      "Memoization là gì? Hãy implement một hàm memoize trong JavaScript.",
    answerKeySummary:
      "Memoization là kỹ thuật cache kết quả của pure function để tránh tính toán lại với cùng input.",
    answerKeywords: [
      "cache",
      "pure function",
      "Map",
      "performance optimization",
      "WeakMap",
    ],
    level: "HARD",
    isActive: true,
    detailAnswerKey: "",
  },
];
