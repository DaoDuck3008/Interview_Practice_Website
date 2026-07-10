import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/",
        "/login",
        "/register",
        "/forgot-password",
        "/verify-email",
        "/overview",
        "/profile",
        "/billing",
        "/usage",
        "/saved",
        "/pricing/checkout",
        "/practice/random",
        "/api",
      ],
    },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
