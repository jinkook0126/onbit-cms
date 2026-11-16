import {
  customerVisibilityWhere,
  resolveCustomerActor,
} from '~/features/customers/api/customerScope.server';
import { prisma } from '~/lib/db.server';
import { errorCodeLabel } from '~/lib/error.server';

import type { TodayCaseTask, TodayContact, TodayOverdueInstallment } from '~/features/today/type';
import type { Prisma } from '../../../../generated/prisma/client';

export type TodayWorkResult =
  | {
      status: 'ok';
      recontactCount: number;
      dueCaseCount: number;
      overdueCustomerCount: number;
      overdueAmount: number;
      contacts: TodayContact[];
      cases: TodayCaseTask[];
      overdueInstallments: TodayOverdueInstallment[];
    }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'failed' };

function seoulToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function seoulTodayDate(today: string): Date {
  const [year, month, day] = today.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatUtcDate(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function readContacts(
  visibility: Prisma.CustomerWhereInput,
  today: string,
  todayDate: Date,
): Promise<TodayContact[]> {
  const customers = await prisma.customer.findMany({
    where: {
      ...visibility,
      consultations: { some: { nextContactOn: todayDate } },
    },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      name: true,
      assignee: { select: { name: true } },
      consultations: {
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 1,
        select: { content: true, nextContactOn: true },
      },
    },
  });
  return customers.flatMap((customer) => {
    const latest = customer.consultations[0];
    if (latest.nextContactOn == null || formatUtcDate(latest.nextContactOn) !== today) {
      return [];
    }
    return [
      {
        customerId: customer.id,
        customerName: customer.name,
        assigneeName: customer.assignee?.name ?? null,
        content: latest.content,
      },
    ];
  });
}

async function readDueCases(
  visibility: Prisma.CustomerWhereInput,
  todayDate: Date,
): Promise<TodayCaseTask[]> {
  const cases = await prisma.customerCase.findMany({
    where: {
      taskDueOn: todayDate,
      progressStage: { not: 'CLOSURE' },
      customer: visibility,
    },
    orderBy: [{ customer: { name: 'asc' } }, { id: 'asc' }],
    select: {
      nextTask: true,
      customer: { select: { id: true, name: true } },
    },
  });
  return cases.map((item) => ({
    customerId: item.customer.id,
    customerName: item.customer.name,
    task: item.nextTask,
  }));
}

function compareOverdue(left: TodayOverdueInstallment, right: TodayOverdueInstallment): number {
  if (left.promisedOn !== right.promisedOn) {
    return left.promisedOn < right.promisedOn ? -1 : 1;
  }
  const nameOrder = left.customerName.localeCompare(right.customerName, 'ko');
  if (nameOrder !== 0) {
    return nameOrder;
  }
  return left.sequence - right.sequence;
}

async function readOverdue(
  visibility: Prisma.CustomerWhereInput,
  todayDate: Date,
): Promise<{
  customerCount: number;
  amount: number;
  installments: TodayOverdueInstallment[];
}> {
  const rows = await prisma.customerInstallment.findMany({
    where: {
      promisedOn: { lt: todayDate },
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
          customer: {
            select: {
              id: true,
              name: true,
              assignee: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  const installments: TodayOverdueInstallment[] = [];
  for (const row of rows) {
    const remainingAmount = Math.max(row.scheduledAmount - row.receivedAmount, 0);
    if (remainingAmount === 0) {
      continue;
    }
    const customer = row.customerCase.customer;
    installments.push({
      id: row.id,
      customerId: customer.id,
      customerName: customer.name,
      assigneeName: customer.assignee?.name ?? null,
      kind: row.kind,
      sequence: row.sequence,
      promisedOn: formatUtcDate(row.promisedOn),
      scheduledAmount: row.scheduledAmount,
      remainingAmount,
    });
  }
  installments.sort(compareOverdue);
  const customerIds = new Set(installments.map((installment) => installment.customerId));
  let amount = 0;
  for (const installment of installments) {
    amount += installment.remainingAmount;
  }
  return { customerCount: customerIds.size, amount, installments };
}

export async function readTodayWork(
  request: Request,
): Promise<{ result: TodayWorkResult; headers: Headers }> {
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
    const today = seoulToday();
    const todayDate = seoulTodayDate(today);
    const [contacts, cases, overdue] = await Promise.all([
      readContacts(visibility, today, todayDate),
      readDueCases(visibility, todayDate),
      readOverdue(visibility, todayDate),
    ]);
    return {
      result: {
        status: 'ok',
        recontactCount: contacts.length,
        dueCaseCount: cases.length,
        overdueCustomerCount: overdue.customerCount,
        overdueAmount: overdue.amount,
        contacts,
        cases,
        overdueInstallments: overdue.installments,
      },
      headers,
    };
  } catch (error) {
    console.error('오늘의 업무를 불러오지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}
