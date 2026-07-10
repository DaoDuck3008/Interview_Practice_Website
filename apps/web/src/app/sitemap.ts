import type { MetadataRoute } from "next";
import { getTopicsWithCounts } from "@/lib/api/topics";
import { getSiteUrl } from "@/lib/seo";

function createSitemapEntry(
  siteUrl: URL,
  path: string,
  options: Pick<
    MetadataRoute.Sitemap[number],
    "changeFrequency" | "priority"
  >,
): MetadataRoute.Sitemap[number] {
  return {
    url: new URL(path, siteUrl).toString(),
    lastModified: new Date(),
    ...options,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const topics = await getTopicsWithCounts();

  const staticRoutes: MetadataRoute.Sitemap = [
    createSitemapEntry(siteUrl, "/", {
      changeFrequency: "weekly",
      priority: 1,
    }),
    createSitemapEntry(siteUrl, "/pricing", {
      changeFrequency: "monthly",
      priority: 0.7,
    }),
  ];

  const learningRoutes = topics
    .filter((topic) => topic.slug)
    .map((topic) =>
      createSitemapEntry(siteUrl, `/learning/${topic.slug}/questions`, {
        changeFrequency: "weekly",
        priority: topic.questionCount > 0 ? 0.8 : 0.5,
      }),
    );

  return [...staticRoutes, ...learningRoutes];
}
