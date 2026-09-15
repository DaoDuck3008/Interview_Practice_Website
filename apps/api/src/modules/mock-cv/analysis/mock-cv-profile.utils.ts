import { MockCvDomain, MockCvExtractionQuality } from '@prisma/client';
import type {
  MockCvAnalysisDecision,
  MockCvProfileResult,
  MockCvProjectProfile,
} from './prompts/mock-cv-profile.prompt';
import { MOCK_CV_PROFILE_PROMPT_VERSION } from './prompts/mock-cv-profile.prompt';

const READY: MockCvAnalysisDecision = 'READY';
const NON_READY_STATUSES = new Set<MockCvAnalysisDecision>([
  'UNSUPPORTED',
  'NEEDS_REUPLOAD',
]);
const EXTRACTION_QUALITIES = new Set<string>(
  Object.values(MockCvExtractionQuality),
);
const SUPPORTED_DOMAINS = new Set<string>(Object.values(MockCvDomain));
const MAX_ARRAY_ITEMS = 30;
const MAX_ARRAY_ITEM_LENGTH = 500;

export class InvalidMockCvProfileError extends Error {
  constructor(reason: string) {
    super(`Kết quả phân tích CV không hợp lệ: ${reason}`);
    this.name = 'InvalidMockCvProfileError';
  }
}

/* Kiểm tra signature PDF trong 1 KB đầu. Một số công cụ xuất file chèn BOM/newline
trước "%PDF-x.y", nên không thể yêu cầu signature luôn nằm chính xác tại byte số 0. */
export function hasPdfMagic(buffer: Buffer): boolean {
  const header = buffer
    .subarray(0, Math.min(buffer.length, 1024))
    .toString('latin1');
  return /%PDF-\d\.\d/.test(header);
}

/** Che dữ liệu liên hệ trước khi lưu DB hoặc gửi sang AI. */
export function redactMockCvText(raw: string): string {
  return raw
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[EMAIL ĐÃ ẨN]')
    .replace(/(?:\+?84|0)(?:[\s().-]*\d){8,10}\b/g, '[SỐ ĐIỆN THOẠI ĐÃ ẨN]')
    .replace(/https?:\/\/\S+|www\.\S+/gi, '[LIÊN KẾT ĐÃ ẨN]')
    .replace(
      /^(\s*(?:địa\s*chỉ|address|ngày\s*sinh|date\s*of\s*birth|dob)\s*[:：]).*$/gim,
      '$1 [ĐÃ ẨN]',
    )
    .replace(/\r\n?/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function normalizeMockCvProfile(
  raw: string,
  allowedTopicSlugs: ReadonlySet<string>,
): MockCvProfileResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new InvalidMockCvProfileError('không phải JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new InvalidMockCvProfileError('không phải object');
  }

  const value = parsed as Record<string, unknown>;
  const status = parseStatus(value.status);
  const extractionQuality = parseExtractionQuality(value.extractionQuality);
  const eligibilityReason = requiredString(
    value.eligibilityReason,
    'thiếu eligibilityReason',
    1000,
  );
  const detectedDomains = stringArray(value.detectedDomains).filter((domain) =>
    SUPPORTED_DOMAINS.has(domain),
  ) as MockCvDomain[];

  if (status !== READY) {
    return {
      status,
      extractionQuality,
      detectedDomains: [],
      eligibilityReason,
      summary: null,
      topicSlugs: [],
      technicalSkills: [],
      experienceSignals: [],
      strengths: [],
      gapsForTargetRole: [],
      interviewFocusAreas: [],
      claimsToVerify: [],
      projects: null,
      promptVersion: MOCK_CV_PROFILE_PROMPT_VERSION,
    };
  }

  if (detectedDomains.length === 0) {
    throw new InvalidMockCvProfileError('READY nhưng không có detectedDomains');
  }

  return {
    status,
    extractionQuality,
    detectedDomains,
    eligibilityReason,
    summary: requiredString(value.summary, 'READY nhưng thiếu summary', 3000),
    topicSlugs: stringArray(value.topicSlugs).filter((slug) =>
      allowedTopicSlugs.has(slug),
    ),
    technicalSkills: stringArray(value.technicalSkills),
    experienceSignals: stringArray(value.experienceSignals),
    strengths: stringArray(value.strengths),
    gapsForTargetRole: stringArray(value.gapsForTargetRole),
    interviewFocusAreas: stringArray(value.interviewFocusAreas),
    claimsToVerify: stringArray(value.claimsToVerify),
    projects: parseProjects(value.projects),
    promptVersion: MOCK_CV_PROFILE_PROMPT_VERSION,
  };
}

function parseStatus(value: unknown): MockCvAnalysisDecision {
  if (
    value === READY ||
    (typeof value === 'string' &&
      NON_READY_STATUSES.has(value as MockCvAnalysisDecision))
  ) {
    return value as MockCvAnalysisDecision;
  }
  throw new InvalidMockCvProfileError('status không được hỗ trợ');
}

function parseExtractionQuality(value: unknown): MockCvExtractionQuality {
  if (typeof value === 'string' && EXTRACTION_QUALITIES.has(value)) {
    return value as MockCvExtractionQuality;
  }
  throw new InvalidMockCvProfileError('extractionQuality không hợp lệ');
}

function requiredString(
  value: unknown,
  reason: string,
  maxLength: number,
): string {
  const output = typeof value === 'string' ? value.trim() : '';
  if (!output) throw new InvalidMockCvProfileError(reason);
  return output.slice(0, maxLength);
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const normalized = item.trim().slice(0, MAX_ARRAY_ITEM_LENGTH);
    if (normalized) unique.add(normalized);
    if (unique.size >= MAX_ARRAY_ITEMS) break;
  }
  return [...unique];
}

function parseProjects(value: unknown): MockCvProjectProfile[] | null {
  if (!Array.isArray(value)) return null;
  return value.slice(0, 20).flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const project = item as Record<string, unknown>;
    return [
      {
        name:
          typeof project.name === 'string'
            ? project.name.trim().slice(0, 300)
            : '',
        interviewPriority:
          project.interviewPriority === 'PRIMARY' ? 'PRIMARY' : 'SECONDARY',
        technologies: stringArray(project.technologies),
        responsibilities: stringArray(project.responsibilities),
        achievements: stringArray(project.achievements),
        claimsToVerify: stringArray(project.claimsToVerify),
      },
    ];
  });
}
