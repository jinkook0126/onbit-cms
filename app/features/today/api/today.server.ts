import {
  catalogOptionRefSelect,
  toOptionRef,
} from '~/features/customers/api/customerCatalog.server';
import { formatContactDate, parseContactDate } from '~/features/customers/api/customerDates.server';
import {
  customerVisibilityWhere,
  resolveCustomerActor,
} from '~/features/customers/api/customerScope.server';
import { prisma } from '~/lib/db.server';
import { errorCodeLabel } from '~/lib/error.server';

import type { CatalogOptionRef } from '~/features/catalog/type';
import type {
  TodayDeposit,
  TodayOverdueCustomer,
  TodayUpcomingPayment,
} from '~/features/today/type';
import type { Prisma } from '../../../../generated/prisma/client';

const upcomingDaySpan = 3;

export type TodayWorkQuery = {
  from: string;
  to: string;
};

export type TodayWorkResult =
  | {
      status: 'ok';
      totalRetainer: number;
      receivedAmount: number;
      processedCount: number;
      retainedCount: number;
      retentionRate: number | null;
      overdueCustomerCount: number;
      deposits: TodayDeposit[];
      overdueCustomers: TodayOverdueCustomer[];
      upcomingPayments: TodayUpcomingPayment[];
    }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'failed' };

function addUtcDays(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

function dayOffset(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

function retentionRate(retainedCount: number, processedCount: number): number | null {
  if (processedCount === 0) {
    return null;
  }
  return Math.round((retainedCount / processedCount) * 1000) / 10;
}

async function readDeposits(
  visibility: Prisma.CustomerWhereInput,
  fromDate: Date,
  toDate: Date,
): Promise<{ amount: number; deposits: TodayDeposit[] }> {
  const rows = await prisma.installmentPayment.findMany({
    where: {
      paidOn: { gte: fromDate, lte: toDate },
      installment: { customerCase: { customer: visibility } },
    },
    orderBy: [{ paidOn: 'desc' }, { id: 'desc' }],
    select: {
      id: true,
      amount: true,
      paidOn: true,
      installment: {
        select: {
          kind: true,
          customerCase: {
            select: { customer: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });
  let amount = 0;
  const deposits: TodayDeposit[] = [];
  for (const row of rows) {
    amount += row.amount;
    const customer = row.installment.customerCase.customer;
    deposits.push({
      id: row.id,
      paidOn: formatContactDate(row.paidOn),
      customerId: customer.id,
      customerName: customer.name,
      category: row.installment.kind,
      amount: row.amount,
    });
  }
  return { amount, deposits };
}

async function readSchedule(
  visibility: Prisma.CustomerWhereInput,
  toDate: Date,
): Promise<{
  overdueCustomers: TodayOverdueCustomer[];
  upcomingPayments: TodayUpcomingPayment[];
}> {
  const upcomingEnd = addUtcDays(toDate, upcomingDaySpan);
  const rows = await prisma.customerInstallment.findMany({
    where: {
      promisedOn: { lte: upcomingEnd },
      customerCase: { customer: visibility },
    },
    select: {
      id: true,
      kind: true,
      sequence: true,
      promisedOn: true,
      scheduledAmount: true,
      receivedAmount: true,
      customerCase: {
        select: {
          caseType: { select: catalogOptionRefSelect },
          customer: { select: { id: true, name: true } },
        },
      },
    },
  });
  const overdueByCustomer = new Map<
    string,
    { customerName: string; amount: number; caseType: CatalogOptionRef }
  >();
  const upcomingPayments: TodayUpcomingPayment[] = [];
  for (const row of rows) {
    const remaining = Math.max(row.scheduledAmount - row.receivedAmount, 0);
    if (remaining === 0) {
      continue;
    }
    const customer = row.customerCase.customer;
    if (row.promisedOn < toDate) {
      const current = overdueByCustomer.get(customer.id);
      if (current) {
        current.amount += remaining;
      } else {
        overdueByCustomer.set(customer.id, {
          customerName: customer.name,
          amount: remaining,
          caseType: toOptionRef(row.customerCase.caseType),
        });
      }
      continue;
    }
    upcomingPayments.push({
      id: row.id,
      customerId: customer.id,
      customerName: customer.name,
      amount: remaining,
      promisedOn: formatContactDate(row.promisedOn),
      kind: row.kind,
      sequence: row.sequence,
      dayOffset: dayOffset(toDate, row.promisedOn),
    });
  }
  const overdueCustomers = [...overdueByCustomer.entries()]
    .map(([customerId, customer]) => ({
      customerId,
      customerName: customer.customerName,
      amount: customer.amount,
      caseType: customer.caseType,
    }))
    .sort((left, right) => left.customerName.localeCompare(right.customerName, 'ko'));
  upcomingPayments.sort((left, right) => {
    if (left.promisedOn !== right.promisedOn) {
      return left.promisedOn < right.promisedOn ? -1 : 1;
    }
    const nameOrder = left.customerName.localeCompare(right.customerName, 'ko');
    if (nameOrder !== 0) {
      return nameOrder;
    }
    return left.sequence - right.sequence;
  });
  return { overdueCustomers, upcomingPayments };
}

export async function readTodayWork(
  request: Request,
  query: TodayWorkQuery,
): Promise<{ result: TodayWorkResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  const fromDate = parseContactDate(query.from);
  const toDate = parseContactDate(query.to);
  if (fromDate === null || toDate === null || query.from > query.to) {
    return { result: { status: 'failed' }, headers };
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
    const period = { gte: fromDate, lte: toDate };
    const [processedCount, retained, deposits, schedule] = await Promise.all([
      prisma.customer.count({
        where: { ...visibility, firstProcessedOn: period },
      }),
      prisma.customerCase.aggregate({
        where: { contractedOn: period, customer: visibility },
        _sum: { retainerFee: true },
        _count: true,
      }),
      readDeposits(visibility, fromDate, toDate),
      readSchedule(visibility, toDate),
    ]);
    const retainedCount = retained._count;
    return {
      result: {
        status: 'ok',
        totalRetainer: retained._sum.retainerFee ?? 0,
        receivedAmount: deposits.amount,
        processedCount,
        retainedCount,
        retentionRate: retentionRate(retainedCount, processedCount),
        overdueCustomerCount: schedule.overdueCustomers.length,
        deposits: deposits.deposits,
        overdueCustomers: schedule.overdueCustomers,
        upcomingPayments: schedule.upcomingPayments,
      },
      headers,
    };
  } catch (error) {
    console.error('오늘의 업무를 불러오지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}
