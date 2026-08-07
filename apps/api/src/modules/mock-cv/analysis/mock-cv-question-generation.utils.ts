import { MockCvQuestionFocusArea } from '@prisma/client';
import type {
  MockCvGeneratedQuestion,
  MockCvQuestionGenerationResult,
} from './prompts/mock-cv-question-generation.prompt';

const MIN_KEYWORDS = 3;
const MAX_KEYWORDS = 8;
const MAX_QUESTION_LENGTH = 1_000;
const MAX_ANSWER_KEY_LENGTH = 3_000;
const MAX_RATIONALE_LENGTH = 800;
const FOCUS_AREAS = new Set<string>(Object.values(MockCvQuestionFocusArea));

export class InvalidMockCvQuestionGenerationError extends Error {
  constructor(reason: string) {
    super(`Kết quả sinh câu hỏi Mock CV không hợp lệ: ${reason}`);
    this.name = 'InvalidMockCvQuestionGenerationError';
  }
}

/** Chỉ nhận JSON đúng số lượng, đủ dữ liệu chấm điểm và không lặp câu bank. */
export function normalizeMockCvGeneratedQuestions(
  raw: string,
  expectedCount: number,
  existingContents: string[],
): MockCvGeneratedQuestion[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new InvalidMockCvQuestionGenerationError('không phải JSON');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new InvalidMockCvQuestionGenerationError('không phải object');
  }

  const questions = (parsed as MockCvQuestionGenerationResult).questions;
  if (!Array.isArray(questions) || questions.length !== expectedCount) {
    throw new InvalidMockCvQuestionGenerationError(
      `phải có đúng ${expectedCount} câu hỏi`,
    );
  }

  const fingerprints = existingContents.map(questionFingerprint);
  return questions.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new InvalidMockCvQuestionGenerationError(
        `câu hỏi thứ ${index + 1} không hợp lệ`,
      );
    }

    const value = item as MockCvGeneratedQuestion;
    const content = requiredString(
      value.content,
      `câu hỏi thứ ${index + 1} thiếu nội dung`,
      MAX_QUESTION_LENGTH,
    );
    const fingerprint = questionFingerprint(content);
    if (
      fingerprints.some((existing) =>
        areQuestionFingerprintsTooSimilar(existing, fingerprint),
      )
    ) {
      throw new InvalidMockCvQuestionGenerationError(
        `câu hỏi thứ ${index + 1} bị trùng`,
      );
    }
    fingerprints.push(fingerprint);

    if (
      typeof value.focusArea !== 'string' ||
      !FOCUS_AREAS.has(value.focusArea)
    ) {
      throw new InvalidMockCvQuestionGenerationError(
        `focusArea của câu hỏi thứ ${index + 1} không hợp lệ`,
      );
    }

    const answerKeywords = uniqueKeywords(value.answerKeywords);
    if (
      answerKeywords.length < MIN_KEYWORDS ||
      answerKeywords.length > MAX_KEYWORDS
    ) {
      throw new InvalidMockCvQuestionGenerationError(
        `answerKeywords của câu hỏi thứ ${index + 1} phải có ${MIN_KEYWORDS}-${MAX_KEYWORDS} phần tử`,
      );
    }

    return {
      content,
      focusArea: value.focusArea,
      answerKeySummary: requiredString(
        value.answerKeySummary,
        `câu hỏi thứ ${index + 1} thiếu answerKeySummary`,
        MAX_ANSWER_KEY_LENGTH,
      ),
      answerKeywords,
      rationale: requiredString(
        value.rationale,
        `câu hỏi thứ ${index + 1} thiếu rationale`,
        MAX_RATIONALE_LENGTH,
      ),
    };
  });
}

function requiredString(value: unknown, reason: string, maxLength: number): string {
  const output = typeof value === 'string' ? value.trim() : '';
  if (!output) throw new InvalidMockCvQuestionGenerationError(reason);
  return output.slice(0, maxLength);
}

function uniqueKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const keyword = item.trim().slice(0, 150);
    const key = questionFingerprint(keyword);
    if (!keyword || !key || seen.has(key)) continue;
    seen.add(key);
    result.push(keyword);
  }
  return result;
}

function questionFingerprint(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('vi-VN')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** So sánh theo tập từ để bắt cả trường hợp AI đảo thứ tự nhưng giữ nguyên ý/cụm từ. */
function areQuestionFingerprintsTooSimilar(left: string, right: string): boolean {
  if (left === right) return true;
  const leftTokens = new Set(left.split(' ').filter(Boolean));
  const rightTokens = new Set(right.split(' ').filter(Boolean));
  if (leftTokens.size < 5 || rightTokens.size < 5) return false;

  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1;
  }
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union > 0 && intersection / union >= 0.82;
}
