import api from "./api";

export interface Topic {
  id: string;
  slug: string;
  name: string;
}

export async function getTopics(): Promise<Topic[]> {
  try {
    const res = await api.get("/topics");
    if (!res) return FALLBACK_TOPICS;
    return (res.data as Topic[]) ?? FALLBACK_TOPICS;
  } catch {
    return FALLBACK_TOPICS;
  }
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
