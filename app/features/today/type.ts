export type TodayContact = {
  customerId: string;
  customerName: string;
  assigneeName: string | null;
  content: string;
};

export type TodayOverdueInstallment = {
  id: string;
  customerId: string;
  customerName: string;
  assigneeName: string | null;
  kind: 'DEPOSIT' | 'INSTALLMENT';
  sequence: number;
  promisedOn: string;
  scheduledAmount: number;
  remainingAmount: number;
};

export type TodayWork = {
  recontactCount: number;
  overdueCustomerCount: number;
  overdueAmount: number;
  contacts: TodayContact[];
  overdueInstallments: TodayOverdueInstallment[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isTodayContact(value: unknown): value is TodayContact {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.customerId === 'string' &&
    typeof value.customerName === 'string' &&
    (value.assigneeName === null || typeof value.assigneeName === 'string') &&
    typeof value.content === 'string'
  );
}

function isDateText(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTodayOverdueInstallment(value: unknown): value is TodayOverdueInstallment {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.customerId === 'string' &&
    typeof value.customerName === 'string' &&
    (value.assigneeName === null || typeof value.assigneeName === 'string') &&
    (value.kind === 'DEPOSIT' || value.kind === 'INSTALLMENT') &&
    isCount(value.sequence) &&
    isDateText(value.promisedOn) &&
    isCount(value.scheduledAmount) &&
    isCount(value.remainingAmount)
  );
}

export function isTodayWork(value: unknown): value is TodayWork {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isCount(value.recontactCount) &&
    isCount(value.overdueCustomerCount) &&
    isCount(value.overdueAmount) &&
    Array.isArray(value.contacts) &&
    value.contacts.every(isTodayContact) &&
    Array.isArray(value.overdueInstallments) &&
    value.overdueInstallments.every(isTodayOverdueInstallment)
  );
}
