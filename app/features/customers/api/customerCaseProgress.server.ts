import { syncLatestNextContact } from '~/features/customers/api/customerConsultations.server';
import { formatContactDate, parseContactDate } from '~/features/customers/api/customerDates.server';
import {
  readAccessibleCustomer,
  resolveCustomerActor,
} from '~/features/customers/api/customerScope.server';
import {
  MAX_CASE_NEXT_TASK_LENGTH,
  caseProgressStageLabels,
  isCaseProgressStage,
} from '~/features/customers/type';
import { prisma } from '~/lib/db.server';
import { errorCodeLabel } from '~/lib/error.server';

import type {
  CaseProgress,
  CaseProgressUpdateFieldErrors,
  CaseProgressUpdateSubmission,
} from '~/features/customers/type';

export type CaseProgressResult =
  | { status: 'ok'; progress: CaseProgress }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'failed' };

export async function readCaseProgress(
  request: Request,
  customerId: string,
): Promise<{ result: CaseProgressResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer) {
      return { result: { status: 'not-found' }, headers };
    }
    const customerCase = await prisma.customerCase.findUnique({
      where: { customerId: customer.id },
      select: { progressStage: true, nextTask: true, taskDueOn: true },
    });
    if (!customerCase) {
      return { result: { status: 'not-found' }, headers };
    }
    return {
      result: {
        status: 'ok',
        progress: {
          stage: customerCase.progressStage,
          nextTask: customerCase.nextTask,
          taskDueOn: customerCase.taskDueOn ? formatContactDate(customerCase.taskDueOn) : null,
        },
      },
      headers,
    };
  } catch (error) {
    console.error('사건 진행을 불러오지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

const CASE_STAGE_REQUIRED_MESSAGE = '진행단계를 선택하세요.';
const CASE_TASK_REQUIRED_MESSAGE = '다음 할 일 또는 처리결과를 입력하세요.';
const CASE_DUE_INVALID_MESSAGE = '업무 기한은 올바른 날짜로 입력하세요.';

export type CaseProgressUpdateResult =
  | { status: 'ok'; id: string }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'invalid'; fieldErrors: CaseProgressUpdateFieldErrors }
  | { status: 'not-found' }
  | { status: 'failed' };

function caseProgressChangeContent(from: string, to: string, nextTask: string): string {
  return `${from} -> ${to} / ${nextTask}`;
}

export async function updateCaseProgress(
  request: Request,
  customerId: string,
  submission: CaseProgressUpdateSubmission,
): Promise<{ result: CaseProgressUpdateResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  const fieldErrors: CaseProgressUpdateFieldErrors = {};
  const stage = isCaseProgressStage(submission.stage) ? submission.stage : null;
  if (stage === null) {
    fieldErrors.stage = CASE_STAGE_REQUIRED_MESSAGE;
  }
  const nextTask = submission.nextTask.trim();
  if (nextTask.length < 1) {
    fieldErrors.nextTask = CASE_TASK_REQUIRED_MESSAGE;
  } else if (nextTask.length > MAX_CASE_NEXT_TASK_LENGTH) {
    fieldErrors.nextTask = `다음 할 일 또는 처리결과는 ${MAX_CASE_NEXT_TASK_LENGTH}자 이하여야 합니다.`;
  }
  const taskDueOn = submission.taskDueOn;
  const taskDueDate = taskDueOn === null ? null : parseContactDate(taskDueOn);
  if (taskDueOn !== null && taskDueOn.trim().length < 1) {
    fieldErrors.taskDueOn = CASE_DUE_INVALID_MESSAGE;
  } else if (taskDueOn !== null && taskDueDate === null) {
    fieldErrors.taskDueOn = CASE_DUE_INVALID_MESSAGE;
  }
  if (Object.keys(fieldErrors).length > 0 || stage === null) {
    return { result: { status: 'invalid', fieldErrors }, headers };
  }

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer) {
      return { result: { status: 'not-found' }, headers };
    }
    const outcome = await prisma.$transaction(async (tx) => {
      const customerCase = await tx.customerCase.findUnique({
        where: { customerId: customer.id },
        select: { id: true, progressStage: true },
      });
      if (!customerCase) {
        return { status: 'not-found' } as const;
      }
      const content = caseProgressChangeContent(
        caseProgressStageLabels[customerCase.progressStage],
        caseProgressStageLabels[stage],
        nextTask,
      );
      await tx.customerCase.update({
        where: { id: customerCase.id },
        data: { progressStage: stage, nextTask, taskDueOn: taskDueDate },
      });
      await tx.consultation.create({
        data: {
          customerId: customer.id,
          content,
          nextContactOn: null,
          actorId: actor.userId,
        },
      });
      await syncLatestNextContact(tx, customer.id);
      return { status: 'ok', id: customerCase.id } as const;
    });
    if (outcome.status === 'not-found') {
      return { result: { status: 'not-found' }, headers };
    }
    return { result: { status: 'ok', id: outcome.id }, headers };
  } catch (error) {
    console.error('사건 진행을 변경하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}
