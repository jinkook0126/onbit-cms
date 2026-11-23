import { isCaseType } from '~/features/customers/type';

import type { CaseType, InstallmentKind } from '~/features/customers/type';

export const RECEIVABLE_PAGE_SIZE = 15;

export const receivableSearchFieldLabels = {
  name: '고객이름',
  assignee: '담당',
} as const;

export const receivableStatusLabels = {
  PAID: '완납',
  OVERDUE: '연체',
  SCHEDULED: '예정',
} as const;

export const receivablePaymentFilterLabels = {
  ALL: '전체',
  OVERDUE: '연체',
  SCHEDULED: '예정',
  PAID: '완납',
} as const;

export type ReceivableSearchField = keyof typeof receivableSearchFieldLabels;
export type ReceivableStatus = keyof typeof receivableStatusLabels;
export type ReceivablePaymentFilter = keyof typeof receivablePaymentFilterLabels;

export function receivableInstallmentStatus(
  promisedOn: string,
  remainingAmount: number,
  today: string,
): ReceivableStatus {
  if (remainingAmount === 0) {
    return 'PAID';
  }
  if (promisedOn < today) {
    return 'OVERDUE';
  }
  return 'SCHEDULED';
}

export function receivableDetailPath(customerId: string): string {
  return `/receivables/${customerId}`;
}

export type ReceivableListItem = {
  id: string;
  customerId: string;
  customerName: string;
  kind: InstallmentKind;
  sequence: number;
  promisedOn: string;
  scheduledAmount: number;
  remainingAmount: number;
  status: ReceivableStatus;
};

export type ReceivableListResponse = {
  receivables: ReceivableListItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type ReceivableSort = 'asc' | 'desc';

export type ReceivableListParams = {
  field: ReceivableSearchField;
  keyword: string;
  from: string;
  to: string;
  status: ReceivablePaymentFilter;
  sort: ReceivableSort;
  page: number;
};

export function seoulCalendarToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function seoulMonthStart(today = seoulCalendarToday()): string {
  return `${today.slice(0, 7)}-01`;
}

export type ReceivableCustomerSummary = {
  id: string;
  name: string;
  caseType: CaseType;
  totalRetainer: number;
  depositReceived: number;
  installmentReceived: number;
  remainingRetainer: number;
};

export type ReceivablePlanItem = {
  id: string;
  kind: InstallmentKind;
  sequence: number;
  promisedOn: string;
  scheduledAmount: number;
  receivedAmount: number;
  remainingAmount: number;
  status: ReceivableStatus;
};

export type ReceivablePaymentItem = {
  id: string;
  paidOn: string;
  kind: InstallmentKind;
  sequence: number;
  amount: number;
};

export type ReceivableDetail = {
  customer: ReceivableCustomerSummary;
  plans: ReceivablePlanItem[];
  payments: ReceivablePaymentItem[];
};

export type ReceivableScheduleItem = {
  id: string;
  customerId: string;
  customerName: string;
  kind: InstallmentKind;
  sequence: number;
  status: ReceivableStatus;
};

export type ReceivableScheduleResponse = {
  receivables: ReceivableScheduleItem[];
};

export type ReceivableScheduleParams = {
  date: string;
  name: string;
};

export type ReceivableCalendarDay = {
  date: string;
  totalAmount: number;
  customerName: string;
  extraCount: number;
  overdue: boolean;
};

export type ReceivableCalendarResponse = {
  days: ReceivableCalendarDay[];
};

export type ReceivableCalendarParams = {
  month: string;
  name: string;
};

const receivableSearchFields = Object.keys(receivableSearchFieldLabels);
const receivableStatuses = Object.keys(receivableStatusLabels);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isDateText(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isReceivableSearchField(value: string): value is ReceivableSearchField {
  return receivableSearchFields.includes(value);
}

function isReceivableStatus(value: unknown): value is ReceivableStatus {
  return typeof value === 'string' && receivableStatuses.includes(value);
}

function isInstallmentKind(value: unknown): value is InstallmentKind {
  return value === 'DEPOSIT' || value === 'INSTALLMENT';
}

function isReceivableListItem(value: unknown): value is ReceivableListItem {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.customerId === 'string' &&
    typeof value.customerName === 'string' &&
    isInstallmentKind(value.kind) &&
    isCount(value.sequence) &&
    isDateText(value.promisedOn) &&
    isCount(value.scheduledAmount) &&
    isCount(value.remainingAmount) &&
    isReceivableStatus(value.status)
  );
}

export function isReceivableListResponse(value: unknown): value is ReceivableListResponse {
  if (
    !isRecord(value) ||
    !Array.isArray(value.receivables) ||
    typeof value.page !== 'number' ||
    typeof value.pageSize !== 'number' ||
    typeof value.total !== 'number'
  ) {
    return false;
  }
  return value.receivables.every(isReceivableListItem);
}

function isReceivableCustomerSummary(value: unknown): value is ReceivableCustomerSummary {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    isCaseType(value.caseType) &&
    isCount(value.totalRetainer) &&
    isCount(value.depositReceived) &&
    isCount(value.installmentReceived) &&
    isCount(value.remainingRetainer)
  );
}

function isReceivablePlanItem(value: unknown): value is ReceivablePlanItem {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    isInstallmentKind(value.kind) &&
    isCount(value.sequence) &&
    isDateText(value.promisedOn) &&
    isCount(value.scheduledAmount) &&
    isCount(value.receivedAmount) &&
    isCount(value.remainingAmount) &&
    isReceivableStatus(value.status)
  );
}

function isReceivablePaymentItem(value: unknown): value is ReceivablePaymentItem {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    isDateText(value.paidOn) &&
    isInstallmentKind(value.kind) &&
    isCount(value.sequence) &&
    isCount(value.amount)
  );
}

export function isReceivableDetail(value: unknown): value is ReceivableDetail {
  if (
    !isRecord(value) ||
    !isReceivableCustomerSummary(value.customer) ||
    !Array.isArray(value.plans) ||
    !Array.isArray(value.payments)
  ) {
    return false;
  }
  return value.plans.every(isReceivablePlanItem) && value.payments.every(isReceivablePaymentItem);
}

function isReceivableScheduleItem(value: unknown): value is ReceivableScheduleItem {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.customerId === 'string' &&
    typeof value.customerName === 'string' &&
    isInstallmentKind(value.kind) &&
    isCount(value.sequence) &&
    isReceivableStatus(value.status)
  );
}

export function isReceivableScheduleResponse(value: unknown): value is ReceivableScheduleResponse {
  if (!isRecord(value) || !Array.isArray(value.receivables)) {
    return false;
  }
  return value.receivables.every(isReceivableScheduleItem);
}

function isReceivableCalendarDay(value: unknown): value is ReceivableCalendarDay {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isDateText(value.date) &&
    isCount(value.totalAmount) &&
    typeof value.customerName === 'string' &&
    value.customerName.length > 0 &&
    isCount(value.extraCount) &&
    typeof value.overdue === 'boolean'
  );
}

export function isReceivableCalendarResponse(value: unknown): value is ReceivableCalendarResponse {
  if (!isRecord(value) || !Array.isArray(value.days)) {
    return false;
  }
  return value.days.every(isReceivableCalendarDay);
}

export function parseReceivableSearchField(value: string | null): ReceivableSearchField | null {
  if (value === null) {
    return 'name';
  }
  if (isReceivableSearchField(value)) {
    return value;
  }
  return null;
}

const receivablePaymentFilterParams = {
  OVERDUE: 'overdue',
  SCHEDULED: 'scheduled',
  PAID: 'paid',
} as const;

function isCalendarDate(value: string): boolean {
  if (!isDateText(value)) {
    return false;
  }
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function parseReceivableDate(value: string | null): string | null {
  if (value === null || value === '') {
    return '';
  }
  if (!isCalendarDate(value)) {
    return null;
  }
  return value;
}

export function parseReceivableSort(value: string | null): ReceivableSort | null {
  if (value === null || value === '') {
    return 'desc';
  }
  if (value === 'asc' || value === 'desc') {
    return value;
  }
  return null;
}

export function parseReceivablePaymentFilter(value: string | null): ReceivablePaymentFilter | null {
  if (value === null || value === '') {
    return 'ALL';
  }
  if (value === receivablePaymentFilterParams.OVERDUE) {
    return 'OVERDUE';
  }
  if (value === receivablePaymentFilterParams.SCHEDULED) {
    return 'SCHEDULED';
  }
  if (value === receivablePaymentFilterParams.PAID) {
    return 'PAID';
  }
  return null;
}

export function receivablePaymentFilterParam(status: ReceivablePaymentFilter): string | null {
  if (status === 'ALL') {
    return null;
  }
  return receivablePaymentFilterParams[status];
}

export type ReceivablePlanFieldErrors = {
  deposit?: string;
  installmentCount?: string;
  paidOn?: string;
  amount?: string;
};

export type ReceivablePlanSubmission = {
  deposit: string;
  installmentCount: string;
  paidOn: string;
  amount: string;
};

export type ReceivablePlanResponse = {
  id?: string;
  fieldErrors?: ReceivablePlanFieldErrors;
  formError?: string;
};

const receivablePlanErrorKeys = ['amount', 'deposit', 'installmentCount', 'paidOn'] as const;

function isReceivablePlanFieldErrors(value: unknown): value is ReceivablePlanFieldErrors {
  if (!isRecord(value)) {
    return false;
  }
  return receivablePlanErrorKeys.every(
    (key) => value[key] === undefined || typeof value[key] === 'string',
  );
}

export function isReceivablePlanSubmission(value: unknown): value is ReceivablePlanSubmission {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.deposit === 'string' &&
    typeof value.installmentCount === 'string' &&
    typeof value.paidOn === 'string' &&
    typeof value.amount === 'string'
  );
}

export type ReceivableInstallmentFieldErrors = {
  promisedOn?: string;
  scheduledAmount?: string;
};

export type ReceivableInstallmentSubmission = {
  promisedOn: string;
  scheduledAmount: string;
};

export type ReceivableInstallmentResponse = {
  id?: string;
  fieldErrors?: ReceivableInstallmentFieldErrors;
  formError?: string;
};

const receivableInstallmentErrorKeys = ['promisedOn', 'scheduledAmount'] as const;

function isReceivableInstallmentFieldErrors(
  value: unknown,
): value is ReceivableInstallmentFieldErrors {
  if (!isRecord(value)) {
    return false;
  }
  return receivableInstallmentErrorKeys.every(
    (key) => value[key] === undefined || typeof value[key] === 'string',
  );
}

export function isReceivableInstallmentSubmission(
  value: unknown,
): value is ReceivableInstallmentSubmission {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.promisedOn === 'string' && typeof value.scheduledAmount === 'string';
}

export function isReceivableInstallmentResponse(
  value: unknown,
): value is ReceivableInstallmentResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (value.id !== undefined && typeof value.id !== 'string') {
    return false;
  }
  if (value.formError !== undefined && typeof value.formError !== 'string') {
    return false;
  }
  if (value.fieldErrors !== undefined && !isReceivableInstallmentFieldErrors(value.fieldErrors)) {
    return false;
  }
  return true;
}

export function isReceivablePlanResponse(value: unknown): value is ReceivablePlanResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (value.id !== undefined && typeof value.id !== 'string') {
    return false;
  }
  if (value.formError !== undefined && typeof value.formError !== 'string') {
    return false;
  }
  if (value.fieldErrors !== undefined && !isReceivablePlanFieldErrors(value.fieldErrors)) {
    return false;
  }
  return true;
}
