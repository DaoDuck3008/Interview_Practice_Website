// Constants này được sử dụng tại

// File CV tối đa 5MB
export const MAX_CV_BYTES = 5 * 1024 * 1024;
// Tối đa 20 trang, mỗi trang tối đa 2000 ký tự, tổng cộng tối đa 40.000 ký tự
export const MAX_CV_PAGES = 20;
export const MIN_CV_TEXT_LENGTH = 120;
export const MAX_CV_TEXT_LENGTH = 40_000;

// Prompt hồ sơ phải đọc toàn bộ CV nên cần nhiều thời gian hơn các lời gọi AI ngắn.
export const MOCK_CV_PROFILE_AI_TIMEOUT_MS = 60 * 1000;
// Mỗi batch sinh tối đa 5 câu nhưng vẫn cho phép model đủ thời gian trả JSON hoàn chỉnh.
export const MOCK_CV_QUESTION_GENERATION_AI_TIMEOUT_MS = 2 * 60 * 1000;
// Overview đọc tối đa 30 kết quả câu hỏi nên cũng cần timeout dài hơn mặc định.
export const MOCK_CV_OVERVIEW_AI_TIMEOUT_MS = 2 * 60 * 1000;

export const MOCK_CV_QUESTION_OPTIONS = [10, 20, 30] as const;
export const MOCK_CV_DURATION_OPTIONS_SECONDS = [
  15 * 60,
  30 * 60,
  45 * 60,
  60 * 60,
] as const;
export const DEFAULT_MOCK_CV_QUESTION_COUNT = MOCK_CV_QUESTION_OPTIONS[0];
export const DEFAULT_MOCK_CV_DURATION_SECONDS =
  MOCK_CV_DURATION_OPTIONS_SECONDS[0];
export const MIN_MOCK_CV_QUESTIONS = MOCK_CV_QUESTION_OPTIONS[0];
export const MAX_MOCK_CV_QUESTIONS = MOCK_CV_QUESTION_OPTIONS.at(-1)!;
export const MIN_MOCK_CV_DURATION_SECONDS =
  MOCK_CV_DURATION_OPTIONS_SECONDS[0];
export const MAX_MOCK_CV_DURATION_SECONDS =
  MOCK_CV_DURATION_OPTIONS_SECONDS.at(-1)!;

// Job quá mốc này được xem là kẹt để user có thể chủ động thử lại.
export const MOCK_CV_JOB_STALE_MS = 5 * 60 * 1000;
export const MOCK_CV_QUESTION_JOB_STALE_MS = 15 * 60 * 1000;
export const MOCK_CV_RETRY_COOLDOWN_MS = 60 * 1000;

export enum MockCvTargetRoleCode {
  SOFTWARE_ENGINEER = 'SOFTWARE_ENGINEER',
  BACKEND_DEVELOPER = 'BACKEND_DEVELOPER',
  FRONTEND_DEVELOPER = 'FRONTEND_DEVELOPER',
  FULLSTACK_DEVELOPER = 'FULLSTACK_DEVELOPER',
  MOBILE_DEVELOPER = 'MOBILE_DEVELOPER',
  EMBEDDED_SOFTWARE_ENGINEER = 'EMBEDDED_SOFTWARE_ENGINEER',
  QA_TEST_ENGINEER = 'QA_TEST_ENGINEER',
  DEVOPS_SRE_PLATFORM_ENGINEER = 'DEVOPS_SRE_PLATFORM_ENGINEER',
  CLOUD_ENGINEER = 'CLOUD_ENGINEER',
  DATA_ANALYST = 'DATA_ANALYST',
  DATA_ENGINEER = 'DATA_ENGINEER',
  DATA_SCIENTIST_ML_ENGINEER = 'DATA_SCIENTIST_ML_ENGINEER',
  BUSINESS_ANALYST = 'BUSINESS_ANALYST',
  PRODUCT_MANAGER = 'PRODUCT_MANAGER',
  UI_UX_PRODUCT_DESIGNER = 'UI_UX_PRODUCT_DESIGNER',
}

export const MOCK_CV_TARGET_ROLE_LABELS: Record<MockCvTargetRoleCode, string> =
  {
    [MockCvTargetRoleCode.SOFTWARE_ENGINEER]: 'Software Engineer',
    [MockCvTargetRoleCode.BACKEND_DEVELOPER]: 'Backend Developer',
    [MockCvTargetRoleCode.FRONTEND_DEVELOPER]: 'Frontend Developer',
    [MockCvTargetRoleCode.FULLSTACK_DEVELOPER]: 'Full-stack Developer',
    [MockCvTargetRoleCode.MOBILE_DEVELOPER]: 'Mobile Developer',
    [MockCvTargetRoleCode.EMBEDDED_SOFTWARE_ENGINEER]:
      'Embedded Software Engineer',
    [MockCvTargetRoleCode.QA_TEST_ENGINEER]: 'QA / Test Engineer',
    [MockCvTargetRoleCode.DEVOPS_SRE_PLATFORM_ENGINEER]:
      'DevOps / SRE / Platform Engineer',
    [MockCvTargetRoleCode.CLOUD_ENGINEER]: 'Cloud Engineer',
    [MockCvTargetRoleCode.DATA_ANALYST]: 'Data Analyst',
    [MockCvTargetRoleCode.DATA_ENGINEER]: 'Data Engineer',
    [MockCvTargetRoleCode.DATA_SCIENTIST_ML_ENGINEER]:
      'Data Scientist / Machine Learning Engineer',
    [MockCvTargetRoleCode.BUSINESS_ANALYST]: 'Business Analyst',
    [MockCvTargetRoleCode.PRODUCT_MANAGER]: 'Product Owner / Product Manager',
    [MockCvTargetRoleCode.UI_UX_PRODUCT_DESIGNER]: 'UI/UX / Product Designer',
  };
