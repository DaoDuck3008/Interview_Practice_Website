export const TOPIC_NAME_MAP: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  nodejs: "Node.js",
  react: "React",
  "system-design": "System Design",
  "data-structures": "Data Structures & Algorithms",
  databases: "Databases",
  docker: "Docker",
};

export function formatTopicName(slug: string): string {
  return (
    TOPIC_NAME_MAP[slug] ??
    slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}
