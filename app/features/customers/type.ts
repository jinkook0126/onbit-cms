export const CUSTOMER_PAGE_SIZE = 15;
export const MAX_CUSTOMER_KEYWORD_LENGTH = 50;
export const MAX_CUSTOMER_NAME_LENGTH = 30;
export const MIN_CUSTOMER_PHONE_LENGTH = 8;
export const MAX_CUSTOMER_PHONE_LENGTH = 12;
export const MAX_CONSULTATION_CONTENT_LENGTH = 1000;

export function customerPhoneDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, MAX_CUSTOMER_PHONE_LENGTH);
}

function splitPhone(digits: string, head: number, middle: number): string {
  const first = digits.slice(0, head);
  const second = digits.slice(head, head + middle);
  const third = digits.slice(head + middle);
  if (second.length === 0) {
    return first;
  }
  if (third.length === 0) {
    return `${first}-${second}`;
  }
  return `${first}-${second}-${third}`;
}

export function formatCustomerPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length < MIN_CUSTOMER_PHONE_LENGTH) {
    return digits;
  }
  if (digits.startsWith('02')) {
    if (digits.length <= 9) {
      return splitPhone(digits, 2, 3);
    }
    return splitPhone(digits, 2, 4);
  }
  if (digits.length === 8) {
    return splitPhone(digits, 4, 4);
  }
  if (digits.length === 10) {
    return splitPhone(digits, 3, 3);
  }
  if (digits.length >= MAX_CUSTOMER_PHONE_LENGTH) {
    return splitPhone(digits.slice(0, MAX_CUSTOMER_PHONE_LENGTH), 4, 4);
  }
  return splitPhone(digits, 3, 4);
}

export const consultationStatusLabels = {
  IN_CONSULTATION: '상담중',
  CONSIDERING: '고민중',
  ABSENT: '부재',
  REJECTED: '거절',
  RETAINED: '수임',
} as const;

export const inflowSourceLabels = {
  HOMEPAGE: '홈페이지',
  NAVER: '네이버',
  REFERRAL: '거래처 소개',
  PHONE: '전화',
  OTHER: '기타',
} as const;

export const customerSearchFieldLabels = {
  name: '이름',
  phone: '전화번호',
} as const;

export type ConsultationStatus = keyof typeof consultationStatusLabels;
export type InflowSource = keyof typeof inflowSourceLabels;
export type CustomerSearchField = keyof typeof customerSearchFieldLabels;

export type CustomerListItem = {
  id: string;
  name: string;
  phone: string;
  source: InflowSource;
  status: ConsultationStatus;
  assigneeName: string | null;
  nextContactOn: string | null;
};

export type CustomerDetail = {
  id: string;
  name: string;
  phone: string;
  assigneeName: string | null;
  status: ConsultationStatus;
};

export type CustomerListResponse = {
  customers: CustomerListItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type CustomerListParams = {
  field: CustomerSearchField;
  keyword: string;
  status: ConsultationStatus | null;
  page: number;
};

export type CustomerAssigneeOption = {
  id: string;
  name: string;
};

export type CustomerAssigneeResponse = {
  currentUserId: string;
  assignees: CustomerAssigneeOption[];
};

export type CustomerCreateFieldErrors = {
  name?: string;
  phone?: string;
  source?: string;
  assigneeId?: string;
  nextContactOn?: string;
};

export type CustomerCreateSubmission = {
  name: string;
  phone: string;
  source: string;
  assigneeId: string;
  nextContactOn: string | null;
};

export type CustomerCreateResponse = {
  id?: string;
  fieldErrors?: CustomerCreateFieldErrors;
  formError?: string;
};

export type ConsultationListItem = {
  id: string;
  content: string;
  nextContactOn: string | null;
  createdAt: string;
};

export type ConsultationListResponse = {
  consultations: ConsultationListItem[];
};

export type ConsultationCreateFieldErrors = {
  content?: string;
  nextContactOn?: string;
};

export type ConsultationCreateSubmission = {
  content: string;
  nextContactOn: string | null;
};

export type ConsultationCreateResponse = {
  id?: string;
  fieldErrors?: ConsultationCreateFieldErrors;
  formError?: string;
};

const consultationStatuses = Object.keys(consultationStatusLabels);
const inflowSources = Object.keys(inflowSourceLabels);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isConsultationStatus(value: unknown): value is ConsultationStatus {
  return typeof value === 'string' && consultationStatuses.includes(value);
}

function isInflowSource(value: unknown): value is InflowSource {
  return typeof value === 'string' && inflowSources.includes(value);
}

function isNullableString(value: unknown): boolean {
  return value === null || typeof value === 'string';
}

function isCustomerListItem(value: unknown): value is CustomerListItem {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.phone === 'string' &&
    isInflowSource(value.source) &&
    isConsultationStatus(value.status) &&
    isNullableString(value.assigneeName) &&
    isNullableString(value.nextContactOn)
  );
}

export function isCustomerDetail(value: unknown): value is CustomerDetail {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.phone === 'string' &&
    isNullableString(value.assigneeName) &&
    isConsultationStatus(value.status)
  );
}

export type CustomerStatusSubmission = {
  status: ConsultationStatus;
};

export type CustomerStatusResponse = {
  status?: ConsultationStatus;
  formError?: string;
};

export function isCustomerStatusSubmission(value: unknown): value is CustomerStatusSubmission {
  return isRecord(value) && isConsultationStatus(value.status);
}

export function isCustomerStatusResponse(value: unknown): value is CustomerStatusResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (value.formError !== undefined && typeof value.formError !== 'string') {
    return false;
  }
  return value.status === undefined || isConsultationStatus(value.status);
}

export function isCustomerListResponse(value: unknown): value is CustomerListResponse {
  if (
    !isRecord(value) ||
    !Array.isArray(value.customers) ||
    typeof value.page !== 'number' ||
    typeof value.pageSize !== 'number' ||
    typeof value.total !== 'number'
  ) {
    return false;
  }
  return value.customers.every(isCustomerListItem);
}

const customerCreateErrorKeys = ['name', 'phone', 'source', 'assigneeId', 'nextContactOn'] as const;

function isCustomerAssigneeOption(value: unknown): value is CustomerAssigneeOption {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.id === 'string' && typeof value.name === 'string';
}

export function isCustomerAssigneeResponse(value: unknown): value is CustomerAssigneeResponse {
  if (
    !isRecord(value) ||
    typeof value.currentUserId !== 'string' ||
    !Array.isArray(value.assignees)
  ) {
    return false;
  }
  return value.assignees.every(isCustomerAssigneeOption);
}

function isCustomerCreateFieldErrors(value: unknown): value is CustomerCreateFieldErrors {
  if (!isRecord(value)) {
    return false;
  }
  return customerCreateErrorKeys.every(
    (key) => value[key] === undefined || typeof value[key] === 'string',
  );
}

export function isCustomerCreateSubmission(value: unknown): value is CustomerCreateSubmission {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.name === 'string' &&
    typeof value.phone === 'string' &&
    typeof value.source === 'string' &&
    typeof value.assigneeId === 'string' &&
    (value.nextContactOn === null || typeof value.nextContactOn === 'string')
  );
}

function isConsultationListItem(value: unknown): value is ConsultationListItem {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.content === 'string' &&
    isNullableString(value.nextContactOn) &&
    typeof value.createdAt === 'string'
  );
}

export function isConsultationListResponse(value: unknown): value is ConsultationListResponse {
  if (!isRecord(value) || !Array.isArray(value.consultations)) {
    return false;
  }
  return value.consultations.every(isConsultationListItem);
}

const consultationCreateErrorKeys = ['content', 'nextContactOn'] as const;

function isConsultationCreateFieldErrors(value: unknown): value is ConsultationCreateFieldErrors {
  if (!isRecord(value)) {
    return false;
  }
  return consultationCreateErrorKeys.every(
    (key) => value[key] === undefined || typeof value[key] === 'string',
  );
}

export function isConsultationCreateSubmission(
  value: unknown,
): value is ConsultationCreateSubmission {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.content === 'string' &&
    (value.nextContactOn === null || typeof value.nextContactOn === 'string')
  );
}

export function isConsultationCreateResponse(value: unknown): value is ConsultationCreateResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (value.id !== undefined && typeof value.id !== 'string') {
    return false;
  }
  if (value.formError !== undefined && typeof value.formError !== 'string') {
    return false;
  }
  if (value.fieldErrors !== undefined && !isConsultationCreateFieldErrors(value.fieldErrors)) {
    return false;
  }
  return true;
}

export function isCustomerCreateResponse(value: unknown): value is CustomerCreateResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (value.id !== undefined && typeof value.id !== 'string') {
    return false;
  }
  if (value.formError !== undefined && typeof value.formError !== 'string') {
    return false;
  }
  if (value.fieldErrors !== undefined && !isCustomerCreateFieldErrors(value.fieldErrors)) {
    return false;
  }
  return true;
}

export function customerFormError(value: unknown): string | undefined {
  if (!isRecord(value) || typeof value.formError !== 'string') {
    return undefined;
  }
  return value.formError;
}

export function parseCustomerSearchField(value: string | null): CustomerSearchField | null {
  if (value === null || value === 'name') {
    return 'name';
  }
  if (value === 'phone') {
    return 'phone';
  }
  return null;
}

export function parseConsultationStatus(value: string | null): ConsultationStatus | null {
  if (value === null || value === 'all') {
    return null;
  }
  if (isConsultationStatus(value)) {
    return value;
  }
  return null;
}

export function isConsultationStatusParam(value: string | null): boolean {
  return value === null || value === 'all' || isConsultationStatus(value);
}
