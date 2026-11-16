import { CASE_PAGE_SIZE, isCaseType } from '~/features/cases/type';
import {
  customerVisibilityWhere,
  resolveCustomerActor,
} from '~/features/customers/api/customerScope.server';
import { MAX_CUSTOMER_KEYWORD_LENGTH, isCaseProgressStage } from '~/features/customers/type';
import { prisma } from '~/lib/db.server';
import { errorCodeLabel } from '~/lib/error.server';

import type { CaseListItem, CaseSearchField } from '~/features/cases/type';
import type { CaseProgressStage } from '~/features/customers/type';
import type { Prisma } from '../../../../generated/prisma/client';

export type CaseListResult =
  | {
      status: 'ok';
      cases: CaseListItem[];
      page: number;
      pageSize: number;
      total: number;
    }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'failed' };

export type CaseListQuery = {
  field: CaseSearchField;
  keyword: string;
  stage: CaseProgressStage | null;
  page: number;
};

function keywordWhere(field: CaseSearchField, keyword: string): Prisma.CustomerWhereInput {
  if (field === 'name') {
    return { name: { contains: keyword, mode: 'insensitive' } };
  }
  return {
    assignee: {
      is: { name: { contains: keyword, mode: 'insensitive' } },
    },
  };
}

function formatTaskDue(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toCaseListItem(row: {
  caseType: string;
  progressStage: string;
  nextTask: string;
  taskDueOn: Date | null;
  customer: {
    id: string;
    name: string;
    assignee: { name: string } | null;
  };
}): CaseListItem | null {
  if (!isCaseType(row.caseType) || !isCaseProgressStage(row.progressStage)) {
    return null;
  }
  return {
    customerId: row.customer.id,
    customerName: row.customer.name,
    caseType: row.caseType,
    stage: row.progressStage,
    assigneeName: row.customer.assignee?.name ?? null,
    nextTask: row.nextTask,
    taskDueOn: row.taskDueOn ? formatTaskDue(row.taskDueOn) : null,
  };
}

async function readScopedCases(
  visibility: Prisma.CustomerWhereInput,
  query: CaseListQuery,
): Promise<{ cases: CaseListItem[]; total: number }> {
  const keyword = query.keyword.trim().slice(0, MAX_CUSTOMER_KEYWORD_LENGTH);
  const where: Prisma.CustomerCaseWhereInput = {
    ...(query.stage ? { progressStage: query.stage } : {}),
    customer: {
      ...visibility,
      ...(keyword ? keywordWhere(query.field, keyword) : {}),
    },
  };
  const [total, rows] = await prisma.$transaction([
    prisma.customerCase.count({ where }),
    prisma.customerCase.findMany({
      where,
      select: {
        caseType: true,
        progressStage: true,
        nextTask: true,
        taskDueOn: true,
        customer: {
          select: {
            id: true,
            name: true,
            assignee: { select: { name: true } },
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { customer: { name: 'asc' } }],
      skip: (query.page - 1) * CASE_PAGE_SIZE,
      take: CASE_PAGE_SIZE,
    }),
  ]);
  const cases: CaseListItem[] = [];
  for (const row of rows) {
    const item = toCaseListItem(row);
    if (item) {
      cases.push(item);
    }
  }
  return { cases, total };
}

export async function readCases(
  request: Request,
  query: CaseListQuery,
): Promise<{ result: CaseListResult; headers: Headers }> {
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
    const scoped = await readScopedCases(visibility, query);
    return {
      result: {
        status: 'ok',
        cases: scoped.cases,
        page: query.page,
        pageSize: CASE_PAGE_SIZE,
        total: scoped.total,
      },
      headers,
    };
  } catch (error) {
    console.error('사건 목록을 불러오지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}
