import {
  customerVisibilityWhere,
  resolveCustomerActor,
} from '~/features/customers/api/customerScope.server';
import { isPaymentMethod } from '~/features/customers/type';
import { prisma } from '~/lib/db.server';
import { errorCodeLabel } from '~/lib/error.server';

import type { LedgerEntryKind } from '~/features/customers/type';
import type { SettlementEntry } from '~/features/settlements/type';
import type { Prisma } from '../../../../generated/prisma/client';

export type SettlementResult =
  | {
      status: 'ok';
      month: string;
      paymentTotal: number;
      refundTotal: number;
      netTotal: number;
      entries: SettlementEntry[];
    }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'failed' };

type DraftEntry = SettlementEntry & { createdAt: number };

type SettlementCustomer = {
  name: string;
  assignee: { name: string } | null;
};

function formatTransactedOn(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthBounds(month: string): { gte: Date; lt: Date } {
  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  return {
    gte: new Date(Date.UTC(year, monthIndex, 1)),
    lt: new Date(Date.UTC(year, monthIndex + 1, 1)),
  };
}

function customerFields(customer: SettlementCustomer): {
  customerName: string;
  assigneeName: string | null;
} {
  return {
    customerName: customer.name,
    assigneeName: customer.assignee?.name ?? null,
  };
}

function toEntry(entry: {
  id: string;
  transactedOn: Date;
  customer: SettlementCustomer;
  kind: LedgerEntryKind;
  amount: number;
  method: string;
  reason: string | null;
  createdAt: Date;
}): DraftEntry | null {
  if (!isPaymentMethod(entry.method)) {
    return null;
  }
  const customer = customerFields(entry.customer);
  return {
    id: `${entry.kind}:${entry.id}`,
    transactedOn: formatTransactedOn(entry.transactedOn),
    customerName: customer.customerName,
    kind: entry.kind,
    amount: entry.amount,
    assigneeName: customer.assigneeName,
    method: entry.method,
    reason: entry.reason,
    createdAt: entry.createdAt.getTime(),
  };
}

const customerSelect = {
  name: true,
  assignee: { select: { name: true } },
} as const;

async function readMonthEntries(
  visibility: Prisma.CustomerWhereInput,
  month: string,
): Promise<DraftEntry[]> {
  const bounds = monthBounds(month);
  const [payments, refunds] = await prisma.$transaction([
    prisma.installmentPayment.findMany({
      where: {
        paidOn: { gte: bounds.gte, lt: bounds.lt },
        installment: { customerCase: { customer: visibility } },
      },
      select: {
        id: true,
        amount: true,
        paidOn: true,
        method: true,
        createdAt: true,
        installment: {
          select: {
            customerCase: { select: { customer: { select: customerSelect } } },
          },
        },
      },
    }),
    prisma.installmentRefund.findMany({
      where: {
        refundedOn: { gte: bounds.gte, lt: bounds.lt },
        payment: { installment: { customerCase: { customer: visibility } } },
      },
      select: {
        id: true,
        amount: true,
        refundedOn: true,
        reason: true,
        createdAt: true,
        payment: {
          select: {
            method: true,
            installment: {
              select: {
                customerCase: { select: { customer: { select: customerSelect } } },
              },
            },
          },
        },
      },
    }),
  ]);

  const entries: DraftEntry[] = [];
  for (const payment of payments) {
    const entry = toEntry({
      id: payment.id,
      transactedOn: payment.paidOn,
      customer: payment.installment.customerCase.customer,
      kind: 'PAYMENT',
      amount: payment.amount,
      method: payment.method,
      reason: null,
      createdAt: payment.createdAt,
    });
    if (entry) {
      entries.push(entry);
    }
  }
  for (const refund of refunds) {
    const entry = toEntry({
      id: refund.id,
      transactedOn: refund.refundedOn,
      customer: refund.payment.installment.customerCase.customer,
      kind: 'REFUND',
      amount: refund.amount,
      method: refund.payment.method,
      reason: refund.reason,
      createdAt: refund.createdAt,
    });
    if (entry) {
      entries.push(entry);
    }
  }
  entries.sort((left, right) => {
    const byDate = right.transactedOn.localeCompare(left.transactedOn);
    if (byDate !== 0) {
      return byDate;
    }
    const byCreated = right.createdAt - left.createdAt;
    if (byCreated !== 0) {
      return byCreated;
    }
    return right.id.localeCompare(left.id);
  });
  return entries;
}

export async function readSettlement(
  request: Request,
  month: string,
): Promise<{ result: SettlementResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: actor.companyId },
      select: { id: true },
    });
    if (!company) {
      return { result: { status: 'not-found' }, headers };
    }
    const visibility = await customerVisibilityWhere(actor);
    const drafts = await readMonthEntries(visibility, month);
    let paymentTotal = 0;
    let refundTotal = 0;
    const entries: SettlementEntry[] = [];
    for (const draft of drafts) {
      if (draft.kind === 'PAYMENT') {
        paymentTotal += draft.amount;
      } else {
        refundTotal += draft.amount;
      }
      entries.push({
        id: draft.id,
        transactedOn: draft.transactedOn,
        customerName: draft.customerName,
        kind: draft.kind,
        amount: draft.amount,
        assigneeName: draft.assigneeName,
        method: draft.method,
        reason: draft.reason,
      });
    }
    return {
      result: {
        status: 'ok',
        month,
        paymentTotal,
        refundTotal,
        netTotal: paymentTotal - refundTotal,
        entries,
      },
      headers,
    };
  } catch (error) {
    console.error('월별 정산을 불러오지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}
