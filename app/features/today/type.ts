import { isCatalogOptionRef } from '~/features/catalog/type';

import type { CatalogOptionRef } from '~/features/catalog/type';

export type TodayDepositCategory = 'DEPOSIT' | 'INSTALLMENT';

export type TodayDeposit = {
  id: string;
  paidOn: string;
  customerId: string;
  customerName: string;
  category: TodayDepositCategory;
  amount: number;
};

export type TodayOverdueCustomer = {
  customerId: string;
  customerName: string;
  amount: number;
  caseType: CatalogOptionRef;
};

export type TodayUpcomingPayment = {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  promisedOn: string;
  kind: TodayDepositCategory;
  sequence: number;
  dayOffset: number;
};

export type TodayWork = {
  totalRetainer: number;
  receivedAmount: number;
  processedCount: number;
  retainedCount: number;
  retentionRate: number | null;
  overdueCustomerCount: number;
  deposits: TodayDeposit[];
  overdueCustomers: TodayOverdueCustomer[];
  upcomingPayments: TodayUpcomingPayment[];
};

export const todayDepositCategoryLabels: Record<TodayDepositCategory, string> = {
  DEPOSIT: '계약금',
  INSTALLMENT: '회차수납',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isDateText(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

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

export function parseTodayDate(value: string | null): string | null {
  if (value === null || value === '') {
    return '';
  }
  if (!isCalendarDate(value)) {
    return null;
  }
  return value;
}

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

function isDepositCategory(value: unknown): value is TodayDepositCategory {
  return value === 'DEPOSIT' || value === 'INSTALLMENT';
}

function isTodayDeposit(value: unknown): value is TodayDeposit {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    isDateText(value.paidOn) &&
    typeof value.customerId === 'string' &&
    typeof value.customerName === 'string' &&
    isDepositCategory(value.category) &&
    isCount(value.amount)
  );
}

function isTodayOverdueCustomer(value: unknown): value is TodayOverdueCustomer {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.customerId === 'string' &&
    typeof value.customerName === 'string' &&
    isCount(value.amount) &&
    isCatalogOptionRef(value.caseType)
  );
}

function isTodayUpcomingPayment(value: unknown): value is TodayUpcomingPayment {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.customerId === 'string' &&
    typeof value.customerName === 'string' &&
    isCount(value.amount) &&
    isDateText(value.promisedOn) &&
    isDepositCategory(value.kind) &&
    isCount(value.sequence) &&
    isCount(value.dayOffset) &&
    value.dayOffset <= 3
  );
}

function isRetentionRate(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}

export function isTodayWork(value: unknown): value is TodayWork {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isCount(value.totalRetainer) &&
    isCount(value.receivedAmount) &&
    isCount(value.processedCount) &&
    isCount(value.retainedCount) &&
    isRetentionRate(value.retentionRate) &&
    isCount(value.overdueCustomerCount) &&
    Array.isArray(value.deposits) &&
    value.deposits.every(isTodayDeposit) &&
    Array.isArray(value.overdueCustomers) &&
    value.overdueCustomers.every(isTodayOverdueCustomer) &&
    Array.isArray(value.upcomingPayments) &&
    value.upcomingPayments.every(isTodayUpcomingPayment)
  );
}
