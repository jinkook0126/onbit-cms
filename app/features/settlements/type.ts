import { isPaymentMethod, ledgerEntryKindLabels } from '~/features/customers/type';

import type { LedgerEntryKind, PaymentMethod } from '~/features/customers/type';

const settlementMonthPattern = /^(\d{4})-(0[1-9]|1[0-2])$/;

export type SettlementEntry = {
  id: string;
  transactedOn: string;
  customerName: string;
  kind: LedgerEntryKind;
  amount: number;
  assigneeName: string | null;
  method: PaymentMethod;
  reason: string | null;
};

export type SettlementResponse = {
  month: string;
  paymentTotal: number;
  refundTotal: number;
  netTotal: number;
  entries: SettlementEntry[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isWon(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

function isNonNegativeWon(value: unknown): value is number {
  return isWon(value) && value >= 0;
}

function isNullableString(value: unknown): boolean {
  return value === null || typeof value === 'string';
}

function isLedgerEntryKind(value: unknown): value is LedgerEntryKind {
  return typeof value === 'string' && Object.hasOwn(ledgerEntryKindLabels, value);
}

function isSettlementEntry(value: unknown): value is SettlementEntry {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.transactedOn === 'string' &&
    typeof value.customerName === 'string' &&
    isLedgerEntryKind(value.kind) &&
    isNonNegativeWon(value.amount) &&
    isNullableString(value.assigneeName) &&
    isPaymentMethod(value.method) &&
    isNullableString(value.reason)
  );
}

export function isSettlementResponse(value: unknown): value is SettlementResponse {
  if (
    !isRecord(value) ||
    typeof value.month !== 'string' ||
    !isNonNegativeWon(value.paymentTotal) ||
    !isNonNegativeWon(value.refundTotal) ||
    !isWon(value.netTotal) ||
    !Array.isArray(value.entries)
  ) {
    return false;
  }
  return settlementMonthPattern.test(value.month) && value.entries.every(isSettlementEntry);
}

export function parseSettlementMonth(value: string | null): string | null {
  if (value === null || !settlementMonthPattern.test(value)) {
    return null;
  }
  return value;
}

export function seoulSettlementMonth(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  if (!year || !month) {
    return '1970-01';
  }
  return `${year}-${month}`;
}

export function formatSettlementMonth(month: string): string {
  const [year, monthNumber] = month.split('-');
  return `${year}년 ${Number(monthNumber)}월`;
}

export function settlementFormError(value: unknown): string | undefined {
  if (!isRecord(value) || typeof value.formError !== 'string') {
    return undefined;
  }
  return value.formError;
}
