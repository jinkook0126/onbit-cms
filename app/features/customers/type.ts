export const CUSTOMER_PAGE_SIZE = 15;
export const MAX_CUSTOMER_KEYWORD_LENGTH = 50;
export const MAX_CUSTOMER_NAME_LENGTH = 30;
export const MIN_CUSTOMER_PHONE_LENGTH = 8;
export const MAX_CUSTOMER_PHONE_LENGTH = 12;
export const MAX_CONSULTATION_CONTENT_LENGTH = 1000;
export const MAX_RETAIN_AMOUNT = 2_000_000_000;
const refundConsultationPrefixLimit = '환불 2,000,000,000원 · '.length;
export const MAX_REFUND_REASON_LENGTH =
  MAX_CONSULTATION_CONTENT_LENGTH - refundConsultationPrefixLimit;
export const MAX_INSTALLMENT_COUNT = 120;
const promiseChangePrefixLimit = `${MAX_INSTALLMENT_COUNT}회차 납기 0000-00-00 -> 0000-00-00 / `.length;
export const MAX_PROMISE_REASON_LENGTH =
  MAX_CONSULTATION_CONTENT_LENGTH - promiseChangePrefixLimit;
export const MAX_CASE_NEXT_TASK_LENGTH = 200;

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

export const caseTypeLabels = {
  PERSONAL_REHABILITATION: '개인회생',
  PERSONAL_BANKRUPTCY: '개인파산',
  PERSONAL_WORKOUT: '개인워크아웃',
  FAST_DEBT_ADJUSTMENT: '신속채무조정',
  FRESH_START_FUND: '새출발기금',
} as const;

export const caseProgressStageLabels = {
  DOCUMENT_COLLECTION: '서류수집',
  CORRECTION: '보정',
  FILING: '접수',
  COMMENCEMENT: '개시',
  APPROVAL: '인가',
  CLOSURE: '종결',
} as const;

export const initialCaseProgressStage = 'DOCUMENT_COLLECTION' satisfies CaseProgressStage;
export const initialCaseNextTask = '서류 요청';

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
  assignee: '담당',
} as const;

export type ConsultationStatus = keyof typeof consultationStatusLabels;
export type CaseType = keyof typeof caseTypeLabels;
export type CaseProgressStage = keyof typeof caseProgressStageLabels;

export type CaseProgress = {
  stage: CaseProgressStage;
  nextTask: string;
  taskDueOn: string | null;
};

export type CaseProgressUpdateFieldErrors = {
  stage?: string;
  nextTask?: string;
  taskDueOn?: string;
};

export type CaseProgressUpdateSubmission = {
  stage: string;
  nextTask: string;
  taskDueOn: string | null;
};

export type CaseProgressUpdateResponse = {
  id?: string;
  fieldErrors?: CaseProgressUpdateFieldErrors;
  formError?: string;
};

export type CustomerSummary = {
  totalAmount: number;
  deposit: number;
  netReceived: number;
  remainingRetainer: number;
  overdue: number;
};
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

export type CustomerRetainFieldErrors = {
  contractedOn?: string;
  caseType?: string;
  retainerFee?: string;
  deposit?: string;
  installmentCount?: string;
  firstPaymentOn?: string;
};

export type CustomerRetainSubmission = {
  contractedOn: string;
  caseType: string;
  retainerFee: string;
  deposit: string;
  installmentCount: string;
  firstPaymentOn: string;
};

export type CustomerRetainResponse = {
  status?: ConsultationStatus;
  fieldErrors?: CustomerRetainFieldErrors;
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

const customerRetainErrorKeys = [
  'contractedOn',
  'caseType',
  'retainerFee',
  'deposit',
  'installmentCount',
  'firstPaymentOn',
] as const;

function isCustomerRetainFieldErrors(value: unknown): value is CustomerRetainFieldErrors {
  if (!isRecord(value)) {
    return false;
  }
  return customerRetainErrorKeys.every(
    (key) => value[key] === undefined || typeof value[key] === 'string',
  );
}

export function isCustomerRetainSubmission(value: unknown): value is CustomerRetainSubmission {
  if (!isRecord(value)) {
    return false;
  }
  return customerRetainErrorKeys.every((key) => typeof value[key] === 'string');
}

export function isCustomerRetainResponse(value: unknown): value is CustomerRetainResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (value.status !== undefined && !isConsultationStatus(value.status)) {
    return false;
  }
  if (value.formError !== undefined && typeof value.formError !== 'string') {
    return false;
  }
  if (value.fieldErrors !== undefined && !isCustomerRetainFieldErrors(value.fieldErrors)) {
    return false;
  }
  return true;
}

export const INSTALLMENT_ALREADY_PAID_MESSAGE = '이미 완납된 회차입니다.';

export const paymentMethodLabels = {
  CASH: '현금',
  CARD: '카드',
} as const;

export type PaymentMethod = keyof typeof paymentMethodLabels;

export function installmentScheduleLabel(installment: {
  kind: InstallmentKind;
  sequence: number;
}): string {
  if (installment.kind === 'DEPOSIT') {
    return '계약금';
  }
  return `${installment.sequence}회차`;
}

export type InstallmentKind = 'DEPOSIT' | 'INSTALLMENT';

export type InstallmentListItem = {
  id: string;
  kind: InstallmentKind;
  sequence: number;
  promisedOn: string;
  scheduledAmount: number;
  receivedAmount: number;
};

export type InstallmentListResponse = {
  installments: InstallmentListItem[];
};

export type InstallmentPromiseFieldErrors = {
  promisedOn?: string;
  reason?: string;
};

export type InstallmentPromiseSubmission = {
  promisedOn: string;
  reason: string;
};

export type InstallmentPromiseResponse = {
  id?: string;
  fieldErrors?: InstallmentPromiseFieldErrors;
  formError?: string;
};

function isInstallmentKind(value: unknown): value is InstallmentKind {
  return value === 'DEPOSIT' || value === 'INSTALLMENT';
}

function isInstallmentListItem(value: unknown): value is InstallmentListItem {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    isInstallmentKind(value.kind) &&
    typeof value.sequence === 'number' &&
    typeof value.promisedOn === 'string' &&
    typeof value.scheduledAmount === 'number' &&
    typeof value.receivedAmount === 'number'
  );
}

const caseProgressStages = Object.keys(caseProgressStageLabels);

export function isCaseProgressStage(value: unknown): value is CaseProgressStage {
  return typeof value === 'string' && caseProgressStages.includes(value);
}

function isWonAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function isCustomerSummary(value: unknown): value is CustomerSummary {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isWonAmount(value.totalAmount) &&
    isWonAmount(value.deposit) &&
    isWonAmount(value.netReceived) &&
    isWonAmount(value.remainingRetainer) &&
    isWonAmount(value.overdue)
  );
}

export function isCaseProgress(value: unknown): value is CaseProgress {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isCaseProgressStage(value.stage) &&
    typeof value.nextTask === 'string' &&
    (value.taskDueOn === null || typeof value.taskDueOn === 'string')
  );
}

export function isCaseProgressUpdateSubmission(
  value: unknown,
): value is CaseProgressUpdateSubmission {
  return (
    isRecord(value) &&
    typeof value.stage === 'string' &&
    typeof value.nextTask === 'string' &&
    (value.taskDueOn === null || typeof value.taskDueOn === 'string')
  );
}

function isCaseProgressUpdateFieldErrors(value: unknown): value is CaseProgressUpdateFieldErrors {
  if (!isRecord(value)) {
    return false;
  }
  const stage = value.stage === undefined || typeof value.stage === 'string';
  const nextTask = value.nextTask === undefined || typeof value.nextTask === 'string';
  const taskDueOn = value.taskDueOn === undefined || typeof value.taskDueOn === 'string';
  return stage && nextTask && taskDueOn;
}

export function isCaseProgressUpdateResponse(
  value: unknown,
): value is CaseProgressUpdateResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (value.id !== undefined && typeof value.id !== 'string') {
    return false;
  }
  if (value.formError !== undefined && typeof value.formError !== 'string') {
    return false;
  }
  if (value.fieldErrors !== undefined && !isCaseProgressUpdateFieldErrors(value.fieldErrors)) {
    return false;
  }
  return true;
}

export function isInstallmentListResponse(value: unknown): value is InstallmentListResponse {
  if (!isRecord(value) || !Array.isArray(value.installments)) {
    return false;
  }
  return value.installments.every(isInstallmentListItem);
}

function isInstallmentPromiseFieldErrors(value: unknown): value is InstallmentPromiseFieldErrors {
  if (!isRecord(value)) {
    return false;
  }
  const promisedOn = value.promisedOn === undefined || typeof value.promisedOn === 'string';
  const reason = value.reason === undefined || typeof value.reason === 'string';
  return promisedOn && reason;
}

export function isInstallmentPromiseSubmission(
  value: unknown,
): value is InstallmentPromiseSubmission {
  return (
    isRecord(value) && typeof value.promisedOn === 'string' && typeof value.reason === 'string'
  );
}

export function isInstallmentPromiseResponse(value: unknown): value is InstallmentPromiseResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (value.id !== undefined && typeof value.id !== 'string') {
    return false;
  }
  if (value.formError !== undefined && typeof value.formError !== 'string') {
    return false;
  }
  if (value.fieldErrors !== undefined && !isInstallmentPromiseFieldErrors(value.fieldErrors)) {
    return false;
  }
  return true;
}

export type InstallmentPaymentFieldErrors = {
  amount?: string;
  paidOn?: string;
  installmentId?: string;
  method?: string;
};

export type InstallmentPaymentSubmission = {
  amount: string;
  paidOn: string;
  installmentId: string;
  method: string;
};

export type InstallmentPaymentResponse = {
  id?: string;
  fieldErrors?: InstallmentPaymentFieldErrors;
  formError?: string;
};

const installmentPaymentErrorKeys = ['amount', 'paidOn', 'installmentId', 'method'] as const;

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === 'CASH' || value === 'CARD';
}

export const ledgerEntryKindLabels = {
  PAYMENT: '입금',
  REFUND: '환불',
} as const;

export type LedgerEntryKind = keyof typeof ledgerEntryKindLabels;

export type LedgerEntry = {
  id: string;
  transactedOn: string;
  kind: LedgerEntryKind;
  amount: number;
  method: PaymentMethod;
  reason: string | null;
};

export type RefundSource = {
  id: string;
  paidOn: string;
  refundableAmount: number;
};

export type LedgerListResponse = {
  entries: LedgerEntry[];
  refundSources: RefundSource[];
};

export const REFUND_EXHAUSTED_MESSAGE = '환불할 수 있는 금액이 없습니다.';

export type RefundFieldErrors = {
  paymentId?: string;
  amount?: string;
  refundedOn?: string;
  reason?: string;
};

export type RefundSubmission = {
  paymentId: string;
  amount: string;
  refundedOn: string;
  reason: string;
};

export type RefundResponse = {
  id?: string;
  fieldErrors?: RefundFieldErrors;
  formError?: string;
};

function isLedgerEntryKind(value: unknown): value is LedgerEntryKind {
  return value === 'PAYMENT' || value === 'REFUND';
}

function isLedgerEntry(value: unknown): value is LedgerEntry {
  if (!isRecord(value)) {
    return false;
  }
  const reason = value.reason === null || typeof value.reason === 'string';
  return (
    typeof value.id === 'string' &&
    typeof value.transactedOn === 'string' &&
    isLedgerEntryKind(value.kind) &&
    typeof value.amount === 'number' &&
    isPaymentMethod(value.method) &&
    reason
  );
}

function isRefundSource(value: unknown): value is RefundSource {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.paidOn === 'string' &&
    typeof value.refundableAmount === 'number'
  );
}

export function isLedgerListResponse(value: unknown): value is LedgerListResponse {
  if (!isRecord(value) || !Array.isArray(value.entries) || !Array.isArray(value.refundSources)) {
    return false;
  }
  return value.entries.every(isLedgerEntry) && value.refundSources.every(isRefundSource);
}

const refundErrorKeys = ['paymentId', 'amount', 'refundedOn', 'reason'] as const;

function isRefundFieldErrors(value: unknown): value is RefundFieldErrors {
  if (!isRecord(value)) {
    return false;
  }
  return refundErrorKeys.every((key) => value[key] === undefined || typeof value[key] === 'string');
}

export function isRefundSubmission(value: unknown): value is RefundSubmission {
  if (!isRecord(value)) {
    return false;
  }
  return refundErrorKeys.every((key) => typeof value[key] === 'string');
}

export function isRefundResponse(value: unknown): value is RefundResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (value.id !== undefined && typeof value.id !== 'string') {
    return false;
  }
  if (value.formError !== undefined && typeof value.formError !== 'string') {
    return false;
  }
  if (value.fieldErrors !== undefined && !isRefundFieldErrors(value.fieldErrors)) {
    return false;
  }
  return true;
}

function isInstallmentPaymentFieldErrors(value: unknown): value is InstallmentPaymentFieldErrors {
  if (!isRecord(value)) {
    return false;
  }
  return installmentPaymentErrorKeys.every(
    (key) => value[key] === undefined || typeof value[key] === 'string',
  );
}

export function isInstallmentPaymentSubmission(
  value: unknown,
): value is InstallmentPaymentSubmission {
  if (!isRecord(value)) {
    return false;
  }
  return installmentPaymentErrorKeys.every((key) => typeof value[key] === 'string');
}

export function isInstallmentPaymentResponse(
  value: unknown,
): value is InstallmentPaymentResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (value.id !== undefined && typeof value.id !== 'string') {
    return false;
  }
  if (value.formError !== undefined && typeof value.formError !== 'string') {
    return false;
  }
  if (value.fieldErrors !== undefined && !isInstallmentPaymentFieldErrors(value.fieldErrors)) {
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

export function isCustomerSearchField(value: string): value is CustomerSearchField {
  return Object.keys(customerSearchFieldLabels).includes(value);
}

export function parseCustomerSearchField(value: string | null): CustomerSearchField | null {
  if (value === null) {
    return 'name';
  }
  if (isCustomerSearchField(value)) {
    return value;
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
