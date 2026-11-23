import { syncLatestNextContact } from '~/features/customers/api/customerConsultations.server';
import { formatContactDate, parseContactDate } from '~/features/customers/api/customerDates.server';
import {
  readAccessibleCustomer,
  resolveCustomerActor,
} from '~/features/customers/api/customerScope.server';
import {
  MAX_CONSULTATION_CONTENT_LENGTH,
  MAX_RETAIN_AMOUNT,
  installmentScheduleLabel,
  isPaymentMethod,
} from '~/features/customers/type';
import { prisma } from '~/lib/db.server';
import { errorCodeLabel } from '~/lib/error.server';
import { isUuid } from '~/lib/uuid.server';

import type {
  InstallmentKind,
  InstallmentListItem,
  InstallmentPaymentFieldErrors,
  InstallmentPromiseFieldErrors,
  InstallmentPromiseSubmission,
} from '~/features/customers/type';

type InstallmentDraft = {
  kind: InstallmentKind;
  sequence: number;
  promisedOn: Date;
  scheduledAmount: number;
};

function addUtcMonths(value: Date, months: number): Date {
  const target = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(value.getUTCDate(), lastDay)),
  );
}

function installmentAmounts(retainerFee: number, deposit: number, count: number): number[] {
  const remaining = Math.max(retainerFee - deposit, 0);
  const base = Math.floor(remaining / count);
  const remainder = remaining - base * count;
  return Array.from({ length: count }, (_, index) =>
    index === count - 1 ? base + remainder : base,
  );
}

export function buildInstallmentDrafts(input: {
  contractedOn: Date;
  retainerFee: number;
  deposit: number;
  installmentCount: number;
  firstPaymentOn: Date;
}): InstallmentDraft[] {
  const rounds = installmentAmounts(input.retainerFee, input.deposit, input.installmentCount);
  return [
    {
      kind: 'DEPOSIT',
      sequence: 0,
      promisedOn: input.contractedOn,
      scheduledAmount: input.deposit,
    },
    ...rounds.map((scheduledAmount, index) => ({
      kind: 'INSTALLMENT' as const,
      sequence: index + 1,
      promisedOn: addUtcMonths(input.firstPaymentOn, index),
      scheduledAmount,
    })),
  ];
}

export function buildFixedAmountDrafts(input: {
  contractedOn: Date;
  deposit: number;
  installmentCount: number;
  firstPaymentOn: Date;
  roundAmount: number;
}): InstallmentDraft[] {
  return [
    {
      kind: 'DEPOSIT',
      sequence: 0,
      promisedOn: input.contractedOn,
      scheduledAmount: input.deposit,
    },
    ...Array.from({ length: input.installmentCount }, (_, index) => ({
      kind: 'INSTALLMENT' as const,
      sequence: index + 1,
      promisedOn: addUtcMonths(input.firstPaymentOn, index),
      scheduledAmount: input.roundAmount,
    })),
  ];
}

const installmentSelect = {
  id: true,
  kind: true,
  sequence: true,
  promisedOn: true,
  scheduledAmount: true,
  receivedAmount: true,
} as const;

type InstallmentRow = {
  id: string;
  kind: string;
  sequence: number;
  promisedOn: Date;
  scheduledAmount: number;
  receivedAmount: number;
};

function toInstallmentListItem(row: InstallmentRow): InstallmentListItem | null {
  if (row.kind !== 'DEPOSIT' && row.kind !== 'INSTALLMENT') {
    return null;
  }
  return {
    id: row.id,
    kind: row.kind,
    sequence: row.sequence,
    promisedOn: formatContactDate(row.promisedOn),
    scheduledAmount: row.scheduledAmount,
    receivedAmount: row.receivedAmount,
  };
}

export async function readCustomerInstallments(
  customerId: string,
): Promise<InstallmentListItem[] | null> {
  const customerCase = await prisma.customerCase.findUnique({
    where: { customerId },
    select: {
      installments: { orderBy: { sequence: 'asc' }, select: installmentSelect },
    },
  });
  if (!customerCase) {
    return [];
  }
  const installments: InstallmentListItem[] = [];
  for (const row of customerCase.installments) {
    const item = toInstallmentListItem(row);
    if (!item) {
      return null;
    }
    installments.push(item);
  }
  return installments;
}

export type InstallmentListResult =
  | { status: 'ok'; installments: InstallmentListItem[] }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'failed' };

export async function readInstallments(
  request: Request,
  customerId: string,
): Promise<{ result: InstallmentListResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer) {
      return { result: { status: 'not-found' }, headers };
    }
    const installments = await readCustomerInstallments(customer.id);
    if (installments === null) {
      return { result: { status: 'failed' }, headers };
    }
    return { result: { status: 'ok', installments }, headers };
  } catch (error) {
    console.error('분납 일정을 불러오지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

const PROMISE_REQUIRED_MESSAGE = '약속일을 선택하세요.';
const PROMISE_INVALID_MESSAGE = '약속일은 올바른 날짜로 입력하세요.';
const PROMISE_UNCHANGED_MESSAGE = '현재 약속일과 다른 날짜를 선택하세요.';
const REASON_REQUIRED_MESSAGE = '변경 사유를 입력하세요.';

export type InstallmentPromiseResult =
  | { status: 'ok'; id: string }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'invalid'; fieldErrors: InstallmentPromiseFieldErrors }
  | { status: 'paid' }
  | { status: 'not-found' }
  | { status: 'failed' };

function promiseChangeContent(label: string, from: string, to: string, reason: string): string {
  return `${label} 납기 ${from} -> ${to} / ${reason}`;
}

function readPromiseChange(
  promisedOn: string,
  reason: string,
): { promisedDate: Date | null; reason: string; fieldErrors: InstallmentPromiseFieldErrors } {
  const fieldErrors: InstallmentPromiseFieldErrors = {};
  const trimmedReason = reason.trim();
  const promisedDate = parseContactDate(promisedOn);
  if (promisedOn.trim().length < 1) {
    fieldErrors.promisedOn = PROMISE_REQUIRED_MESSAGE;
  } else if (promisedDate === null) {
    fieldErrors.promisedOn = PROMISE_INVALID_MESSAGE;
  }
  if (trimmedReason.length < 1) {
    fieldErrors.reason = REASON_REQUIRED_MESSAGE;
  } else if (trimmedReason.length > MAX_CONSULTATION_CONTENT_LENGTH) {
    fieldErrors.reason = `변경 사유는 ${MAX_CONSULTATION_CONTENT_LENGTH}자 이하여야 합니다.`;
  }
  return { promisedDate, reason: trimmedReason, fieldErrors };
}

export async function updateInstallmentPromise(
  request: Request,
  customerId: string,
  installmentId: string,
  submission: InstallmentPromiseSubmission,
): Promise<{ result: InstallmentPromiseResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }
  const input = readPromiseChange(submission.promisedOn, submission.reason);
  if (Object.keys(input.fieldErrors).length > 0 || input.promisedDate === null) {
    return { result: { status: 'invalid', fieldErrors: input.fieldErrors }, headers };
  }
  const promisedDate = input.promisedDate;

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer || !isUuid(installmentId)) {
      return { result: { status: 'not-found' }, headers };
    }
    const installment = await prisma.customerInstallment.findFirst({
      where: { id: installmentId, customerCase: { customerId: customer.id } },
      select: {
        id: true,
        kind: true,
        sequence: true,
        promisedOn: true,
        scheduledAmount: true,
        receivedAmount: true,
      },
    });
    if (!installment) {
      return { result: { status: 'not-found' }, headers };
    }
    if (installment.receivedAmount >= installment.scheduledAmount) {
      return { result: { status: 'paid' }, headers };
    }
    const from = formatContactDate(installment.promisedOn);
    const to = formatContactDate(promisedDate);
    const fieldErrors: InstallmentPromiseFieldErrors = {};
    if (from === to) {
      fieldErrors.promisedOn = PROMISE_UNCHANGED_MESSAGE;
    }
    const content = promiseChangeContent(
      installmentScheduleLabel(installment),
      from,
      to,
      input.reason,
    );
    if (content.length > MAX_CONSULTATION_CONTENT_LENGTH) {
      fieldErrors.reason = `변경 사유는 ${MAX_CONSULTATION_CONTENT_LENGTH - (content.length - input.reason.length)}자 이하여야 합니다.`;
    }
    if (Object.keys(fieldErrors).length > 0) {
      return { result: { status: 'invalid', fieldErrors }, headers };
    }

    const outcome = await prisma.$transaction(async (tx) => {
      const updated = await tx.customerInstallment.updateMany({
        where: {
          id: installment.id,
          promisedOn: installment.promisedOn,
          receivedAmount: { lt: installment.scheduledAmount },
        },
        data: { promisedOn: promisedDate },
      });
      if (updated.count !== 1) {
        const current = await tx.customerInstallment.findFirst({
          where: { id: installment.id, customerCase: { customerId: customer.id } },
          select: { receivedAmount: true, scheduledAmount: true },
        });
        if (current && current.receivedAmount >= current.scheduledAmount) {
          return 'paid' as const;
        }
        return 'not-found' as const;
      }
      await tx.consultation.create({
        data: {
          customerId: customer.id,
          content,
          nextContactOn: null,
          actorId: actor.userId,
        },
      });
      await syncLatestNextContact(tx, customer.id);
      return 'ok' as const;
    });
    if (outcome === 'paid') {
      return { result: { status: 'paid' }, headers };
    }
    if (outcome === 'not-found') {
      return { result: { status: 'not-found' }, headers };
    }
    return { result: { status: 'ok', id: installmentId }, headers };
  } catch (error) {
    console.error('약속일을 변경하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

const PAYMENT_AMOUNT_REQUIRED_MESSAGE = '입금액을 입력하세요.';
const PAYMENT_AMOUNT_INVALID_MESSAGE = '입금액은 1원 이상 20억 원 이하의 정수로 입력하세요.';
const PAYMENT_AMOUNT_EXCEEDS_MESSAGE = '남은 예정액보다 큰 금액은 등록할 수 없습니다.';
const PAYMENT_DATE_REQUIRED_MESSAGE = '입금일을 선택하세요.';
const PAYMENT_DATE_INVALID_MESSAGE = '입금일은 올바른 날짜로 입력하세요.';
const PAYMENT_TARGET_REQUIRED_MESSAGE = '회차를 선택하세요.';
const PAYMENT_METHOD_REQUIRED_MESSAGE = '수단을 선택하세요.';

export type InstallmentPaymentResult =
  | { status: 'ok'; id: string }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'invalid'; fieldErrors: InstallmentPaymentFieldErrors }
  | { status: 'paid' }
  | { status: 'not-found' }
  | { status: 'failed' };

export function readPaymentAmount(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > MAX_RETAIN_AMOUNT) {
    return null;
  }
  return amount;
}

export async function createInstallmentPayment(
  request: Request,
  customerId: string,
  installmentId: string,
  amountText: string,
  paidOn: string,
  method: string,
): Promise<{ result: InstallmentPaymentResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  const fieldErrors: InstallmentPaymentFieldErrors = {};
  const amount = readPaymentAmount(amountText.trim());
  if (amountText.trim().length < 1) {
    fieldErrors.amount = PAYMENT_AMOUNT_REQUIRED_MESSAGE;
  } else if (amount === null) {
    fieldErrors.amount = PAYMENT_AMOUNT_INVALID_MESSAGE;
  }
  const paidDate = parseContactDate(paidOn);
  if (paidOn.trim().length < 1) {
    fieldErrors.paidOn = PAYMENT_DATE_REQUIRED_MESSAGE;
  } else if (paidDate === null) {
    fieldErrors.paidOn = PAYMENT_DATE_INVALID_MESSAGE;
  }
  if (installmentId.trim().length < 1 || !isUuid(installmentId)) {
    fieldErrors.installmentId = PAYMENT_TARGET_REQUIRED_MESSAGE;
  }
  if (!isPaymentMethod(method)) {
    fieldErrors.method = PAYMENT_METHOD_REQUIRED_MESSAGE;
  }
  if (
    Object.keys(fieldErrors).length > 0 ||
    amount === null ||
    paidDate === null ||
    !isPaymentMethod(method)
  ) {
    return { result: { status: 'invalid', fieldErrors }, headers };
  }

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer) {
      return { result: { status: 'not-found' }, headers };
    }
    const outcome = await prisma.$transaction(async (tx) => {
      const installment = await tx.customerInstallment.findFirst({
        where: { id: installmentId, customerCase: { customerId: customer.id } },
        select: { id: true, scheduledAmount: true, receivedAmount: true },
      });
      if (!installment) {
        return { status: 'not-found' } as const;
      }
      const remaining = installment.scheduledAmount - installment.receivedAmount;
      if (remaining <= 0) {
        return { status: 'paid' } as const;
      }
      if (amount > remaining) {
        return { status: 'exceeds' } as const;
      }
      const updated = await tx.customerInstallment.updateMany({
        where: {
          id: installment.id,
          receivedAmount: { lte: installment.scheduledAmount - amount },
        },
        data: { receivedAmount: { increment: amount } },
      });
      if (updated.count !== 1) {
        return { status: 'paid' } as const;
      }
      const payment = await tx.installmentPayment.create({
        data: {
          installmentId: installment.id,
          amount,
          paidOn: paidDate,
          method,
          actorId: actor.userId,
        },
        select: { id: true },
      });
      return { status: 'ok', id: payment.id } as const;
    });
    if (outcome.status === 'exceeds') {
      return {
        result: {
          status: 'invalid',
          fieldErrors: { amount: PAYMENT_AMOUNT_EXCEEDS_MESSAGE },
        },
        headers,
      };
    }
    if (outcome.status === 'paid') {
      return { result: { status: 'paid' }, headers };
    }
    if (outcome.status === 'not-found') {
      return { result: { status: 'not-found' }, headers };
    }
    return { result: { status: 'ok', id: outcome.id }, headers };
  } catch (error) {
    console.error('입금을 등록하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}
