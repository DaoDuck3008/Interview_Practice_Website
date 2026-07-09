const QUESTION_SLUG_ID_SEPARATOR = "--";
const FALLBACK_QUESTION_SLUG = "cau-hoi";

interface QuestionUrlItem {
  id: string;
  content?: string | null;
}

// Util tạo slug
export function slugifyQuestionTitle(title?: string | null) {
  const source = title ?? "";

  return (
    source
      .toLowerCase()
      .replace(/đ/g, "d")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || FALLBACK_QUESTION_SLUG
  );
}

// Util tạo slug + id
export function getQuestionSlugId(question: QuestionUrlItem) {
  return `${slugifyQuestionTitle(question.content)}${QUESTION_SLUG_ID_SEPARATOR}${question.id}`;
}

// Util lấy href cho trang practice
export function getPracticeQuestionHref(
  topicSlug: string,
  question: QuestionUrlItem,
  query = "",
) {
  return `/practice/${topicSlug}/${getQuestionSlugId(question)}${query}`;
}

// Utl tách slug và id từ questionSlugId
export function parseQuestionSlugId(questionSlugId: string) {
  const separatorIndex = questionSlugId.lastIndexOf(QUESTION_SLUG_ID_SEPARATOR);

  if (separatorIndex === -1) {
    return {
      slug: "",
      id: questionSlugId,
    };
  }

  return {
    slug: questionSlugId.slice(0, separatorIndex),
    id: questionSlugId.slice(
      separatorIndex + QUESTION_SLUG_ID_SEPARATOR.length,
    ),
  };
}

// Util kiểm tra xem questionSlugId có khớp với slug + id của question hay không
export function isCanonicalQuestionSlugId(
  questionSlugId: string,
  question: QuestionUrlItem,
) {
  return questionSlugId === getQuestionSlugId(question);
}
