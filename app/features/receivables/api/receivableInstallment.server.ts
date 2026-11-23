import { parseContactDate } from '~/features/customers/api/customerDates.server';
import {
  readAccessibleCustomer,
  resolveCustomerActor,
} from '~/features/customers/api/customerScope.server';
import { MAX_RETAIN_AMOUNT } from '~/features/customers/type';
import { prisma } from '~/lib/db.server';
import { errorCodeLabel } from '~/lib/error.server';
import { isUuid } from '~/lib/uuid.server';

import type {
  ReceivableInstallmentFieldErrors,
  ReceivableInstallmentSubmission,
} from '~/features/receivables/type';

export type ReceivableInstallmentResult =
  | { status: 'ok'; id: string }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'invalid'; fieldErrors: ReceivableInstallmentFieldErrors }
  | { status: 'not-found' }
  | { status: 'failed' };

const DATE_REQUIRED_MESSAGE = '예정일을 선택하세요.';
const DATE_INVALID_MESSAGE = '예정일은 올바른 날짜로 입력하세요.';
const AMOUNT_REQUIRED_MESSAGE = '예정액을 입력하세요.';
const AMOUNT_INVALID_MESSAGE = '예정액은 0 이상 20억 원 이하의 정수로 입력하세요.';
const AMOUNT_BELOW_RECEIVED_MESSAGE = '예정액은 이미 받은 금액보다 작을 수 없습니다.';

function readScheduledAmount(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount > MAX_RETAIN_AMOUNT) {
    return null;
  }
  return amount;
}

export async function updateReceivableInstallment(
  request: Request,
  customerId: string,
  installmentId: string,
  submission: ReceivableInstallmentSubmission,
): Promise<{ result: ReceivableInstallmentResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  const fieldErrors: ReceivableInstallmentFieldErrors = {};
  const promisedOn = parseContactDate(submission.promisedOn);
  if (submission.promisedOn.trim().length < 1) {
    fieldErrors.promisedOn = DATE_REQUIRED_MESSAGE;
  } else if (promisedOn === null) {
    fieldErrors.promisedOn = DATE_INVALID_MESSAGE;
  }
  const scheduledAmount = readScheduledAmount(submission.scheduledAmount.trim());
  if (submission.scheduledAmount.trim().length < 1) {
    fieldErrors.scheduledAmount = AMOUNT_REQUIRED_MESSAGE;
  } else if (scheduledAmount === null) {
    fieldErrors.scheduledAmount = AMOUNT_INVALID_MESSAGE;
  }
  if (!isUuid(installmentId)) {
    return { result: { status: 'not-found' }, headers };
  }
  if (Object.keys(fieldErrors).length > 0 || promisedOn === null || scheduledAmount === null) {
    return { result: { status: 'invalid', fieldErrors }, headers };
  }

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer) {
      return { result: { status: 'not-found' }, headers };
    }
    const saved = await prisma.$transaction(async (tx) => {
      const installment = await tx.customerInstallment.findFirst({
        where: { id: installmentId, customerCase: { customerId: customer.id } },
        select: {
          id: true,
          kind: true,
          sequence: true,
          receivedAmount: true,
          customerCaseId: true,
        },
      });
      if (!installment) {
        return { status: 'not-found' } as const;
      }
      if (scheduledAmount < installment.receivedAmount) {
        return { status: 'below-received' } as const;
      }
      const updated = await tx.customerInstallment.updateMany({
        where: { id: installment.id, receivedAmount: { lte: scheduledAmount } },
        data: { promisedOn, scheduledAmount },
      });
      if (updated.count !== 1) {
        return { status: 'below-received' } as const;
      }
      if (installment.kind === 'DEPOSIT') {
        await tx.customerCase.update({
          where: { id: installment.customerCaseId },
          data: { deposit: scheduledAmount },
        });
      }
      if (installment.kind === 'INSTALLMENT' && installment.sequence === 1) {
        await tx.customerCase.update({
          where: { id: installment.customerCaseId },
          data: { firstPaymentOn: promisedOn },
        });
      }
      return { status: 'ok', id: installment.id } as const;
    });
    if (saved.status === 'below-received') {
      return {
        result: {
          status: 'invalid',
          fieldErrors: { scheduledAmount: AMOUNT_BELOW_RECEIVED_MESSAGE },
        },
        headers,
      };
    }
    if (saved.status === 'not-found') {
      return { result: { status: 'not-found' }, headers };
    }
    return { result: saved, headers };
  } catch (error) {
    console.error('분납 일정을 변경하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}
