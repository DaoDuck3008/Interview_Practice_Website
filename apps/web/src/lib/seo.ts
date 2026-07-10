import type { Metadata } from "next";

export const SITE_NAME = "Phỏng vấn IT";
export const DEFAULT_OG_IMAGE =
  "https://res.cloudinary.com/dcalaazrt/image/upload/v1783606426/Screenshot_2026-07-09_211326_nnhprq.png";
export const DEFAULT_SITE_URL = "http://localhost:3000";

type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | JsonLdValue[]
  | { [key: string]: JsonLdValue };

export function getSiteUrl() {
  return new URL(
    (process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL).replace(/\/$/, ""),
  );
}

export function getAbsoluteUrl(path: string) {
  return new URL(path, getSiteUrl()).toString();
}

export function createJsonLdMarkup(data: JsonLdValue) {
  return {
    __html: JSON.stringify(data).replace(/</g, "\\u003c"),
  };
}

interface SeoMetadataInput {
  title: string;
  description: string;
}

export function createSeoMetadata({
  title,
  description,
}: SeoMetadataInput): Metadata {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: SITE_NAME,
      locale: "vi_VN",
      type: "website",
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} - luyện tập phỏng vấn IT với AI`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}
