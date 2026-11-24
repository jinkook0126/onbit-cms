export const RETAINED_STATUS_CODE = 'RETAINED';
export const DEFAULT_STATUS_CODE = 'IN_CONSULTATION';

export const defaultConsultationStatuses = [
  { code: 'IN_CONSULTATION', name: '상담중', sortOrder: 0 },
  { code: 'CONSIDERING', name: '고민중', sortOrder: 1 },
  { code: 'ABSENT', name: '부재', sortOrder: 2 },
  { code: 'REJECTED', name: '거절', sortOrder: 3 },
  { code: RETAINED_STATUS_CODE, name: '수임', sortOrder: 4 },
] as const;

export const defaultInflowSources = [
  { code: 'HOMEPAGE', name: '홈페이지', sortOrder: 0 },
  { code: 'NAVER', name: '네이버', sortOrder: 1 },
  { code: 'REFERRAL', name: '거래처 소개', sortOrder: 2 },
  { code: 'PHONE', name: '전화', sortOrder: 3 },
  { code: 'OTHER', name: '기타', sortOrder: 4 },
] as const;

export const defaultCaseTypes = [
  { code: 'PERSONAL_REHABILITATION', name: '개인회생', sortOrder: 0 },
  { code: 'PERSONAL_BANKRUPTCY', name: '개인파산', sortOrder: 1 },
  { code: 'PERSONAL_WORKOUT', name: '개인워크아웃', sortOrder: 2 },
  { code: 'FAST_DEBT_ADJUSTMENT', name: '신속채무조정', sortOrder: 3 },
  { code: 'FRESH_START_FUND', name: '새출발기금', sortOrder: 4 },
  { code: 'REHABILITATION_AND_CREDIT_RECOVERY', name: '개회+신복위', sortOrder: 5 },
  { code: 'OTHER', name: '기타', sortOrder: 6 },
] as const;
