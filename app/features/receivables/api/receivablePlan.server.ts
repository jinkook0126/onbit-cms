import { parseContactDate } from '~/features/customers/api/customerDates.server';
import { buildFixedAmountDrafts } from '~/features/customers/api/customerInstallments.server';
import {
  readAccessibleCustomer,
  resolveCustomerActor,
} from '~/features/customers/api/customerScope.server';
import { MAX_INSTALLMENT_COUNT, MAX_RETAIN_AMOUNT } from '~/features/customers/type';
import { prisma } from '~/lib/db.server';
import { errorCodeLabel } from '~/lib/error.server';

import type {
  ReceivablePlanFieldErrors,
  ReceivablePlanSubmission,
} from '~/features/receivables/type';

export type ReceivablePlanResult =
  | { status: 'ok'; id: string }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'invalid'; fieldErrors: ReceivablePlanFieldErrors }
  | { status: 'locked' }
  | { status: 'not-found' }
  | { status: 'failed' };

const DEPOSIT_REQUIRED_MESSAGE = '계약금을 입력하세요.';
const DEPOSIT_INVALID_MESSAGE = '계약금은 0 이상 20억 원 이하의 정수로 입력하세요.';
const INSTALLMENT_REQUIRED_MESSAGE = '회차를 입력하세요.';
const INSTALLMENT_INVALID_MESSAGE = '회차는 1 이상 120 이하의 정수로 입력하세요.';
const PAID_ON_REQUIRED_MESSAGE = '수납일을 선택하세요.';
const PAID_ON_INVALID_MESSAGE = '수납일은 올바른 날짜로 입력하세요.';
const AMOUNT_REQUIRED_MESSAGE = '수납액을 입력하세요.';
const AMOUNT_INVALID_MESSAGE = '수납액은 0 이상 20억 원 이하의 정수로 입력하세요.';

function moneyFieldError(value: string, required: string, invalid: string): string | undefined {
  if (value.trim().length < 1) {
    return required;
  }
  if (!/^\d+$/.test(value)) {
    return invalid;
  }
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount > MAX_RETAIN_AMOUNT) {
    return invalid;
  }
  return undefined;
}

function readPlanWrite(submission: ReceivablePlanSubmission):
  | {
      ok: true;
      deposit: number;
      installmentCount: number;
      paidOn: Date;
      amount: number;
    }
  | { ok: false; fieldErrors: ReceivablePlanFieldErrors } {
  const fieldErrors: ReceivablePlanFieldErrors = {};
  const depositError = moneyFieldError(
    submission.deposit,
    DEPOSIT_REQUIRED_MESSAGE,
    DEPOSIT_INVALID_MESSAGE,
  );
  if (depositError) {
    fieldErrors.deposit = depositError;
  }
  if (submission.installmentCount.trim().length < 1) {
    fieldErrors.installmentCount = INSTALLMENT_REQUIRED_MESSAGE;
  } else if (!/^\d+$/.test(submission.installmentCount)) {
    fieldErrors.installmentCount = INSTALLMENT_INVALID_MESSAGE;
  } else {
    const installmentCount = Number(submission.installmentCount);
    if (
      !Number.isSafeInteger(installmentCount) ||
      installmentCount < 1 ||
      installmentCount > MAX_INSTALLMENT_COUNT
    ) {
      fieldErrors.installmentCount = INSTALLMENT_INVALID_MESSAGE;
    }
  }
  if (submission.paidOn.trim().length < 1) {
    fieldErrors.paidOn = PAID_ON_REQUIRED_MESSAGE;
  } else if (parseContactDate(submission.paidOn) === null) {
    fieldErrors.paidOn = PAID_ON_INVALID_MESSAGE;
  }
  const amountError = moneyFieldError(
    submission.amount,
    AMOUNT_REQUIRED_MESSAGE,
    AMOUNT_INVALID_MESSAGE,
  );
  if (amountError) {
    fieldErrors.amount = amountError;
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  const paidOn = parseContactDate(submission.paidOn);
  if (paidOn === null) {
    return { ok: false, fieldErrors: { paidOn: PAID_ON_INVALID_MESSAGE } };
  }
  return {
    ok: true,
    deposit: Number(submission.deposit),
    installmentCount: Number(submission.installmentCount),
    paidOn,
    amount: Number(submission.amount),
  };
}

export async function saveReceivablePlan(
  request: Request,
  customerId: string,
  submission: ReceivablePlanSubmission,
): Promise<{ result: ReceivablePlanResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  const draft = readPlanWrite(submission);
  if (!draft.ok) {
    return { result: { status: 'invalid', fieldErrors: draft.fieldErrors }, headers };
  }

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer) {
      return { result: { status: 'not-found' }, headers };
    }
    const customerCase = await prisma.customerCase.findUnique({
      where: { customerId: customer.id },
      select: { id: true, contractedOn: true },
    });
    if (!customerCase) {
      return { result: { status: 'not-found' }, headers };
    }
    const saved = await prisma.$transaction(async (tx) => {
      const payments = await tx.installmentPayment.count({
        where: { installment: { customerCaseId: customerCase.id } },
      });
      if (payments > 0) {
        return { status: 'locked' } as const;
      }
      await tx.customerInstallment.deleteMany({
        where: { customerCaseId: customerCase.id },
      });
      await tx.customerCase.update({
        where: { id: customerCase.id },
        data: {
          deposit: draft.deposit,
          installmentCount: draft.installmentCount,
          firstPaymentOn: draft.paidOn,
        },
      });
      await tx.customerInstallment.createMany({
        data: buildFixedAmountDrafts({
          contractedOn: customerCase.contractedOn,
          deposit: draft.deposit,
          installmentCount: draft.installmentCount,
          firstPaymentOn: draft.paidOn,
          roundAmount: draft.amount,
        }).map((row) => ({
          customerCaseId: customerCase.id,
          ...row,
        })),
      });
      return { status: 'ok', id: customerCase.id } as const;
    });
    return { result: saved, headers };
  } catch (error) {
    console.error('분납 계획을 저장하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}
