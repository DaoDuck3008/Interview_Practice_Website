import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import LearningQuestionDetail from "@/components/questions/LearningQuestionDetail";
import { getQuestion, getQuestionsPublic } from "@/lib/api/questions";
import {
  createJsonLdMarkup,
  createSeoMetadata,
  getAbsoluteUrl,
} from "@/lib/seo";
import {
  getLearningQuestionHref,
  isCanonicalQuestionSlugId,
  parseQuestionSlugId,
} from "@/lib/utils/question-url";

interface PageProps {
  params: Promise<{ topicSlug: string; questionSlugId: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}

const DEFAULT_METADATA = createSeoMetadata({
  title: "Chi tiết câu hỏi phỏng vấn IT — Phỏng vấn IT",
  description:
    "Xem câu hỏi phỏng vấn IT, đáp án tóm tắt, đáp án chi tiết và các câu hỏi liên quan để ôn tập hiệu quả.",
});

function truncateSeoText(text: string, maxLength: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  const sliced = normalized.slice(0, maxLength - 1).trimEnd();
  const lastSpace = sliced.lastIndexOf(" ");
  const safeText = lastSpace > 40 ? sliced.slice(0, lastSpace) : sliced;

  return `${safeText}…`;
}

function getSafeReturnHref(returnTo: string | undefined, fallbackHref: string) {
  if (!returnTo) return fallbackHref;

  // Chỉ cho phép các đường dẫn tương đối, không cho phép các URL tuyệt đối hoặc các đường dẫn bắt đầu bằng "//" (có thể dẫn đến các miền khác).
  if (returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }

  return fallbackHref;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { topicSlug, questionSlugId } = await params;
  const { id: questionId } = parseQuestionSlugId(questionSlugId);
  const question = await getQuestion(questionId);

  if (!question) return DEFAULT_METADATA;

  const canonicalTopicSlug = question.topic?.slug ?? topicSlug;
  const title = `${truncateSeoText(question.content, 72)} — Phỏng vấn IT`;
  const description = truncateSeoText(
    question.answerKeySummary ||
      `Xem đáp án chi tiết cho câu hỏi "${question.content}" và ôn tập thêm các câu hỏi phỏng vấn IT liên quan.`,
    155,
  );

  return {
    ...createSeoMetadata({ title, description }),
    alternates: {
      canonical: getLearningQuestionHref(canonicalTopicSlug, question),
    },
  };
}

export default async function LearningQuestionDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { topicSlug, questionSlugId } = await params;
  const { returnTo } = await searchParams;
  const { id: questionId } = parseQuestionSlugId(questionSlugId);
  const question = await getQuestion(questionId);

  if (!question) notFound();

  const canonicalTopicSlug = question.topic?.slug ?? topicSlug;
  const defaultBackHref = `/learning/${canonicalTopicSlug}/questions`;
  const returnHref = getSafeReturnHref(returnTo, defaultBackHref);
  if (
    topicSlug !== canonicalTopicSlug ||
    !isCanonicalQuestionSlugId(questionSlugId, question)
  ) {
    const canonicalHref = getLearningQuestionHref(canonicalTopicSlug, question);
    const params = new URLSearchParams({ returnTo: returnHref });
    permanentRedirect(`${canonicalHref}?${params.toString()}`);
  }

  const [sameTopicResult, latestResult] = await Promise.all([
    getQuestionsPublic({
      topicId: question.topicId,
      limit: 7,
    }),
    getQuestionsPublic({
      sortBy: "createdAt",
      order: "desc",
      limit: 7,
    }),
  ]);

  // Tạo dữ liệu JSON-LD cho SEO
  const pagePath = getLearningQuestionHref(canonicalTopicSlug, question);
  const pageUrl = getAbsoluteUrl(pagePath);
  const answerText = question.detailAnswerKey || question.answerKeySummary;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Phỏng vấn IT",
            item: getAbsoluteUrl("/"),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: question.topic?.name ?? canonicalTopicSlug,
            item: getAbsoluteUrl(`/learning/${canonicalTopicSlug}/questions`),
          },
          {
            "@type": "ListItem",
            position: 3,
            name: question.content,
            item: pageUrl,
          },
        ],
      },
      {
        "@type": "QAPage",
        "@id": `${pageUrl}#qa`,
        url: pageUrl,
        inLanguage: "vi-VN",
        mainEntity: {
          "@type": "Question",
          name: question.content,
          text: question.content,
          url: pageUrl,
          ...(question.createdAt ? { datePublished: question.createdAt } : {}),
          ...(question.answerKeywords.length > 0
            ? { keywords: question.answerKeywords }
            : {}),
          ...(answerText
            ? {
                acceptedAnswer: {
                  "@type": "Answer",
                  text: answerText,
                  url: `${pageUrl}#answer`,
                  author: {
                    "@type": "Organization",
                    name: "Phỏng vấn IT",
                    url: getAbsoluteUrl("/"),
                  },
                },
              }
            : {}),
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={createJsonLdMarkup(jsonLd)}
      />
      <LearningQuestionDetail
        question={question}
        sameTopicQuestions={sameTopicResult.items}
        latestQuestions={latestResult.items}
        topicSlug={canonicalTopicSlug}
        returnHref={returnHref}
      />
    </>
  );
}
