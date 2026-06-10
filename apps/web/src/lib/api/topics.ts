import api, { type ApiResponse } from "./api";
import type { Paginated } from "./questions";

export interface Topic {
  id: string;
  slug: string;
  name: string;
}

export interface TopicWithCount extends Topic {
  questionCount: number;
}

export type TopicSortBy = "name" | "slug" | "questions";
export type SortOrder = "asc" | "desc";

export interface AdminTopicQuery {
  search?: string;
  sortBy?: TopicSortBy;
  order?: SortOrder;
  page?: number;
  limit?: number;
}

export async function getTopics(): Promise<Topic[]> {
  try {
    const res = await api.get<ApiResponse<Topic[]>>("/topics");
    return res.data.data ?? FALLBACK_TOPICS;
  } catch {
    return FALLBACK_TOPICS;
  }
}

/** Admin: list topic (kèm số câu hỏi) với filter + phân trang phía server */
export async function getTopicsAdmin(
  query: AdminTopicQuery = {},
): Promise<Paginated<TopicWithCount>> {
  const params: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params[key] = value as string | number;
    }
  }
  const res = await api.get<ApiResponse<Paginated<TopicWithCount>>>(
    "/topics/all",
    { params },
  );
  return res.data.data;
}

export async function createTopic(input: {
  slug: string;
  name: string;
}): Promise<Topic> {
  const res = await api.post<ApiResponse<Topic>>("/topics", input);
  return res.data.data;
}

export async function updateTopic(
  id: string,
  input: Partial<{ slug: string; name: string }>,
): Promise<Topic> {
  const res = await api.patch<ApiResponse<Topic>>(`/topics/${id}`, input);
  return res.data.data;
}

export async function deleteTopic(id: string): Promise<void> {
  await api.delete(`/topics/${id}`);
}

const FALLBACK_TOPICS: Topic[] = [
  { id: "1", slug: "javascript", name: "JavaScript" },
  { id: "2", slug: "typescript", name: "TypeScript" },
  { id: "3", slug: "nodejs", name: "Node.js" },
  { id: "4", slug: "react", name: "React" },
  { id: "5", slug: "system-design", name: "System Design" },
  { id: "6", slug: "data-structures", name: "Data Structures" },
  { id: "7", slug: "databases", name: "Databases" },
  { id: "8", slug: "docker", name: "Docker" },
];
