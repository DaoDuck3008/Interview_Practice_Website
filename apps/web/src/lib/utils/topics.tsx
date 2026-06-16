import type { Topic } from "@/lib/api/topics";

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

/**
 * Render <option>/<optgroup> elements for a topic <select>.
 * Parent topics that have children become non-selectable <optgroup> headers.
 * Root-level leaf topics and child topics are rendered as <option>.
 *
 * @param topics  Flat topic list from the API
 * @param blank   If provided, an empty <option> is prepended with this label
 */
export function buildTopicOptions(topics: Topic[], blank?: string) {
  const childrenByParent = new Map<string, Topic[]>();
  const roots: Topic[] = [];

  for (const t of topics) {
    if (t.parentId) {
      const arr = childrenByParent.get(t.parentId) ?? [];
      arr.push(t);
      childrenByParent.set(t.parentId, arr);
    } else {
      roots.push(t);
    }
  }

  return (
    <>
      {blank !== undefined && <option value="">{blank}</option>}
      {roots.map((parent) => {
        const children = childrenByParent.get(parent.id) ?? [];
        if (children.length > 0) {
          return (
            <optgroup key={parent.id} label={parent.name}>
              {children.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#0d0d14]">
                  {c.name}
                </option>
              ))}
            </optgroup>
          );
        }
        return (
          <option key={parent.id} value={parent.id} className="bg-[#0d0d14]">
            {parent.name}
          </option>
        );
      })}
    </>
  );
}
