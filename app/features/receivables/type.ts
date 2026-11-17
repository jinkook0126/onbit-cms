import type { InstallmentKind } from '~/features/customers/type';

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

export type ReceivableSearchField = keyof typeof receivableSearchFieldLabels;
export type ReceivableStatus = keyof typeof receivableStatusLabels;

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

export type ReceivableListParams = {
  field: ReceivableSearchField;
  keyword: string;
  page: number;
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

export function parseReceivableSearchField(value: string | null): ReceivableSearchField | null {
  if (value === null) {
    return 'name';
  }
  if (isReceivableSearchField(value)) {
    return value;
  }
  return null;
}
