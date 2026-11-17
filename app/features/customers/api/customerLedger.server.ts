import { syncLatestNextContact } from '~/features/customers/api/customerConsultations.server';
import { formatContactDate, parseContactDate } from '~/features/customers/api/customerDates.server';
import { readPaymentAmount } from '~/features/customers/api/customerInstallments.server';
import {
  readAccessibleCustomer,
  resolveCustomerActor,
} from '~/features/customers/api/customerScope.server';
import {
  MAX_CONSULTATION_CONTENT_LENGTH,
  MAX_REFUND_REASON_LENGTH,
} from '~/features/customers/type';
import { prisma } from '~/lib/db.server';
import { errorCodeLabel } from '~/lib/error.server';
import { formatWon } from '~/lib/money';
import { isUuid } from '~/lib/uuid.server';

import type {
  LedgerEntry,
  RefundFieldErrors,
  RefundSource,
  RefundSubmission,
} from '~/features/customers/type';

export type LedgerListResult =
  | { status: 'ok'; entries: LedgerEntry[]; refundSources: RefundSource[] }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'failed' };

function refundableAmount(
  paymentAmount: number,
  refundedAmount: number,
  receivedAmount: number,
): number {
  return Math.max(Math.min(paymentAmount - refundedAmount, receivedAmount), 0);
}

export async function readLedger(
  request: Request,
  customerId: string,
): Promise<{ result: LedgerListResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer) {
      return { result: { status: 'not-found' }, headers };
    }
    const payments = await prisma.installmentPayment.findMany({
      where: { installment: { customerCase: { customerId: customer.id } } },
      select: {
        id: true,
        amount: true,
        paidOn: true,
        method: true,
        createdAt: true,
        installment: { select: { receivedAmount: true } },
        refunds: {
          select: { id: true, amount: true, refundedOn: true, reason: true, createdAt: true },
        },
      },
    });
    const entries: (LedgerEntry & { createdAt: Date })[] = [];
    const refundSources: RefundSource[] = [];
    for (const payment of payments) {
      const refunded = payment.refunds.reduce((sum, refund) => sum + refund.amount, 0);
      entries.push({
        id: payment.id,
        transactedOn: formatContactDate(payment.paidOn),
        kind: 'PAYMENT',
        amount: payment.amount,
        method: payment.method,
        reason: null,
        createdAt: payment.createdAt,
      });
      for (const refund of payment.refunds) {
        entries.push({
          id: refund.id,
          transactedOn: formatContactDate(refund.refundedOn),
          kind: 'REFUND',
          amount: refund.amount,
          method: payment.method,
          reason: refund.reason,
          createdAt: refund.createdAt,
        });
      }
      const available = refundableAmount(
        payment.amount,
        refunded,
        payment.installment.receivedAmount,
      );
      if (available > 0) {
        refundSources.push({
          id: payment.id,
          paidOn: formatContactDate(payment.paidOn),
          refundableAmount: available,
        });
      }
    }
    entries.sort((left, right) => {
      const byDate = right.transactedOn.localeCompare(left.transactedOn);
      if (byDate !== 0) {
        return byDate;
      }
      const byCreated = right.createdAt.getTime() - left.createdAt.getTime();
      if (byCreated !== 0) {
        return byCreated;
      }
      return right.id.localeCompare(left.id);
    });
    refundSources.sort((left, right) => {
      const byDate = right.paidOn.localeCompare(left.paidOn);
      if (byDate !== 0) {
        return byDate;
      }
      return right.id.localeCompare(left.id);
    });
    return {
      result: {
        status: 'ok',
        entries: entries.map((entry) => ({
          id: entry.id,
          transactedOn: entry.transactedOn,
          kind: entry.kind,
          amount: entry.amount,
          method: entry.method,
          reason: entry.reason,
        })),
        refundSources,
      },
      headers,
    };
  } catch (error) {
    console.error('거래 원장을 불러오지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

const REFUND_AMOUNT_REQUIRED_MESSAGE = '환불금액을 입력하세요.';
const REFUND_AMOUNT_INVALID_MESSAGE = '환불금액은 1원 이상 20억 원 이하의 정수로 입력하세요.';
const REFUND_AMOUNT_EXCEEDS_MESSAGE = '환불가능금액보다 큰 금액은 등록할 수 없습니다.';
const REFUND_DATE_REQUIRED_MESSAGE = '환불일을 선택하세요.';
const REFUND_DATE_INVALID_MESSAGE = '환불일은 올바른 날짜로 입력하세요.';
const REFUND_TARGET_REQUIRED_MESSAGE = '원입금을 선택하세요.';
const REFUND_REASON_REQUIRED_MESSAGE = '환불 사유를 입력하세요.';

function refundConsultationContent(amount: number, reason: string): string {
  return `환불 ${formatWon(amount)} · ${reason}`;
}

class RefundLimitError extends Error {
  constructor() {
    super('환불 한도를 넘었습니다.');
    this.name = 'RefundLimitError';
  }
}

export type InstallmentRefundResult =
  | { status: 'ok'; id: string }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'invalid'; fieldErrors: RefundFieldErrors }
  | { status: 'exhausted' }
  | { status: 'not-found' }
  | { status: 'failed' };

export async function createInstallmentRefund(
  request: Request,
  customerId: string,
  submission: RefundSubmission,
): Promise<{ result: InstallmentRefundResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  const fieldErrors: RefundFieldErrors = {};
  const amount = readPaymentAmount(submission.amount.trim());
  if (submission.amount.trim().length < 1) {
    fieldErrors.amount = REFUND_AMOUNT_REQUIRED_MESSAGE;
  } else if (amount === null) {
    fieldErrors.amount = REFUND_AMOUNT_INVALID_MESSAGE;
  }
  const refundedDate = parseContactDate(submission.refundedOn);
  if (submission.refundedOn.trim().length < 1) {
    fieldErrors.refundedOn = REFUND_DATE_REQUIRED_MESSAGE;
  } else if (refundedDate === null) {
    fieldErrors.refundedOn = REFUND_DATE_INVALID_MESSAGE;
  }
  if (submission.paymentId.trim().length < 1 || !isUuid(submission.paymentId)) {
    fieldErrors.paymentId = REFUND_TARGET_REQUIRED_MESSAGE;
  }
  const reason = submission.reason.trim();
  if (reason.length < 1) {
    fieldErrors.reason = REFUND_REASON_REQUIRED_MESSAGE;
  } else if (reason.length > MAX_REFUND_REASON_LENGTH) {
    fieldErrors.reason = `환불 사유는 ${MAX_REFUND_REASON_LENGTH}자 이하여야 합니다.`;
  }
  if (Object.keys(fieldErrors).length > 0 || amount === null || refundedDate === null) {
    return { result: { status: 'invalid', fieldErrors }, headers };
  }
  const content = refundConsultationContent(amount, reason);
  if (content.length > MAX_CONSULTATION_CONTENT_LENGTH) {
    const prefixLength = content.length - reason.length;
    return {
      result: {
        status: 'invalid',
        fieldErrors: {
          reason: `환불 사유는 ${MAX_CONSULTATION_CONTENT_LENGTH - prefixLength}자 이하여야 합니다.`,
        },
      },
      headers,
    };
  }

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer) {
      return { result: { status: 'not-found' }, headers };
    }
    const refundId = await prisma.$transaction(async (tx) => {
      const payment = await tx.installmentPayment.findFirst({
        where: {
          id: submission.paymentId,
          installment: { customerCase: { customerId: customer.id } },
        },
        select: {
          id: true,
          amount: true,
          installment: { select: { id: true, receivedAmount: true } },
          refunds: { select: { amount: true } },
        },
      });
      if (!payment) {
        return { status: 'not-found' } as const;
      }
      const refunded = payment.refunds.reduce((sum, refund) => sum + refund.amount, 0);
      const available = refundableAmount(
        payment.amount,
        refunded,
        payment.installment.receivedAmount,
      );
      if (available <= 0) {
        return { status: 'exhausted' } as const;
      }
      if (amount > available) {
        return { status: 'exceeds' } as const;
      }
      const updated = await tx.customerInstallment.updateMany({
        where: { id: payment.installment.id, receivedAmount: { gte: amount } },
        data: { receivedAmount: { decrement: amount } },
      });
      if (updated.count !== 1) {
        return { status: 'exhausted' } as const;
      }
      const refund = await tx.installmentRefund.create({
        data: {
          paymentId: payment.id,
          amount,
          refundedOn: refundedDate,
          reason,
          actorId: actor.userId,
        },
        select: { id: true },
      });
      const totals = await tx.installmentRefund.aggregate({
        where: { paymentId: payment.id },
        _sum: { amount: true },
      });
      if ((totals._sum.amount ?? 0) > payment.amount) {
        throw new RefundLimitError();
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
      return { status: 'ok', id: refund.id } as const;
    });
    if (refundId.status === 'exceeds') {
      return {
        result: { status: 'invalid', fieldErrors: { amount: REFUND_AMOUNT_EXCEEDS_MESSAGE } },
        headers,
      };
    }
    if (refundId.status === 'exhausted') {
      return { result: { status: 'exhausted' }, headers };
    }
    if (refundId.status === 'not-found') {
      return { result: { status: 'not-found' }, headers };
    }
    return { result: { status: 'ok', id: refundId.id }, headers };
  } catch (error) {
    if (error instanceof RefundLimitError) {
      return { result: { status: 'exhausted' }, headers };
    }
    console.error('환불을 등록하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}
