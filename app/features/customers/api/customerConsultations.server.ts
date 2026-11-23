import {
  formatNextContactSchedule,
  parseNextContactSchedule,
} from '~/features/customers/api/customerDates.server';
import {
  readAccessibleCustomer,
  resolveCustomerActor,
} from '~/features/customers/api/customerScope.server';
import { MAX_CONSULTATION_CONTENT_LENGTH } from '~/features/customers/type';
import { prisma } from '~/lib/db.server';
import { errorCodeLabel } from '~/lib/error.server';
import { isUuid } from '~/lib/uuid.server';

import type {
  ConsultationCreateFieldErrors,
  ConsultationListItem,
} from '~/features/customers/type';
import type { Prisma } from '../../../../generated/prisma/client';

const CONTENT_REQUIRED_MESSAGE = '상담 내용을 입력하세요.';
const CONTENT_TOO_LONG_MESSAGE = `상담 내용은 ${MAX_CONSULTATION_CONTENT_LENGTH}자 이하여야 합니다.`;
const NEXT_SCHEDULE_INVALID_MESSAGE = '다음 상담일정은 올바른 날짜와 시간으로 입력하세요.';
const NEXT_SCHEDULE_TIME_MESSAGE = '다음 상담 시간을 입력하세요.';

export type ConsultationListResult =
  | { status: 'ok'; consultations: ConsultationListItem[] }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'failed' };

export type ConsultationCreateResult =
  | { status: 'ok'; id: string }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'invalid'; fieldErrors: ConsultationCreateFieldErrors }
  | { status: 'not-found' }
  | { status: 'failed' };

type ConsultationInput =
  | { ok: true; content: string; nextContactOn: Date | null; nextContactTime: string | null }
  | { ok: false; fieldErrors: ConsultationCreateFieldErrors };

function validateConsultation(
  content: string,
  nextContactOn: string | null,
): ConsultationCreateFieldErrors {
  const fieldErrors: ConsultationCreateFieldErrors = {};
  const trimmed = content.trim();
  if (trimmed.length < 1) {
    fieldErrors.content = CONTENT_REQUIRED_MESSAGE;
  } else if (trimmed.length > MAX_CONSULTATION_CONTENT_LENGTH) {
    fieldErrors.content = CONTENT_TOO_LONG_MESSAGE;
  }
  if (nextContactOn !== null) {
    const schedule = parseNextContactSchedule(nextContactOn);
    if (schedule === null) {
      fieldErrors.nextContactOn = NEXT_SCHEDULE_INVALID_MESSAGE;
    } else if (schedule === 'date-only') {
      fieldErrors.nextContactOn = NEXT_SCHEDULE_TIME_MESSAGE;
    }
  }
  return fieldErrors;
}

function readConsultationInput(content: string, nextContactOn: string | null): ConsultationInput {
  const fieldErrors = validateConsultation(content, nextContactOn);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  if (nextContactOn === null) {
    return { ok: true, content: content.trim(), nextContactOn: null, nextContactTime: null };
  }
  const schedule = parseNextContactSchedule(nextContactOn);
  if (schedule === null || schedule === 'date-only') {
    return {
      ok: false,
      fieldErrors: {
        nextContactOn:
          schedule === 'date-only' ? NEXT_SCHEDULE_TIME_MESSAGE : NEXT_SCHEDULE_INVALID_MESSAGE,
      },
    };
  }
  return {
    ok: true,
    content: content.trim(),
    nextContactOn: schedule.date,
    nextContactTime: schedule.time,
  };
}

export async function readConsultations(
  request: Request,
  customerId: string,
): Promise<{ result: ConsultationListResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer) {
      return { result: { status: 'not-found' }, headers };
    }
    const rows = await prisma.consultation.findMany({
      where: { customerId: customer.id },
      select: {
        id: true,
        content: true,
        nextContactOn: true,
        nextContactTime: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return {
      result: {
        status: 'ok',
        consultations: rows.map((row) => ({
          id: row.id,
          content: row.content,
          nextContactOn: row.nextContactOn
            ? formatNextContactSchedule(row.nextContactOn, row.nextContactTime)
            : null,
          createdAt: row.createdAt.toISOString(),
        })),
      },
      headers,
    };
  } catch (error) {
    console.error('상담 이력을 불러오지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

export async function syncLatestNextContact(
  tx: Prisma.TransactionClient,
  customerId: string,
): Promise<void> {
  const latest = await tx.consultation.findFirst({
    where: { customerId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { nextContactOn: true, nextContactTime: true },
  });
  if (!latest) {
    return;
  }
  await tx.customer.update({
    where: { id: customerId },
    data: {
      nextContactOn: latest.nextContactOn,
      nextContactTime: latest.nextContactTime,
    },
  });
}

export async function createConsultation(
  request: Request,
  customerId: string,
  content: string,
  nextContactOn: string | null,
): Promise<{ result: ConsultationCreateResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  const input = readConsultationInput(content, nextContactOn);
  if (!input.ok) {
    return { result: { status: 'invalid', fieldErrors: input.fieldErrors }, headers };
  }

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer) {
      return { result: { status: 'not-found' }, headers };
    }
    const consultation = await prisma.$transaction(async (tx) => {
      const created = await tx.consultation.create({
        data: {
          customerId: customer.id,
          content: input.content,
          nextContactOn: input.nextContactOn,
          nextContactTime: input.nextContactTime,
          actorId: actor.userId,
        },
        select: { id: true },
      });
      await syncLatestNextContact(tx, customer.id);
      return created;
    });
    return { result: { status: 'ok', id: consultation.id }, headers };
  } catch (error) {
    console.error('상담 이력을 등록하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

export type ConsultationUpdateResult =
  | { status: 'ok'; id: string }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'invalid'; fieldErrors: ConsultationCreateFieldErrors }
  | { status: 'not-found' }
  | { status: 'failed' };

export async function updateConsultation(
  request: Request,
  customerId: string,
  consultationId: string,
  content: string,
  nextContactOn: string | null,
): Promise<{ result: ConsultationUpdateResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }
  if (!isUuid(consultationId)) {
    return { result: { status: 'not-found' }, headers };
  }

  const input = readConsultationInput(content, nextContactOn);
  if (!input.ok) {
    return { result: { status: 'invalid', fieldErrors: input.fieldErrors }, headers };
  }

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer) {
      return { result: { status: 'not-found' }, headers };
    }
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.consultation.updateMany({
        where: { id: consultationId, customerId: customer.id },
        data: {
          content: input.content,
          nextContactOn: input.nextContactOn,
          nextContactTime: input.nextContactTime,
          updatedById: actor.userId,
        },
      });
      if (result.count === 1) {
        await syncLatestNextContact(tx, customer.id);
      }
      return result;
    });
    if (updated.count !== 1) {
      return { result: { status: 'not-found' }, headers };
    }
    return { result: { status: 'ok', id: consultationId }, headers };
  } catch (error) {
    console.error('상담 이력을 수정하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}
