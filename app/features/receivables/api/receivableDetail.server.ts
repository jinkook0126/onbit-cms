import { formatContactDate, seoulToday } from '~/features/customers/api/customerDates.server';
import { readCustomerInstallments } from '~/features/customers/api/customerInstallments.server';
import {
  readAccessibleCustomer,
  resolveCustomerActor,
} from '~/features/customers/api/customerScope.server';
import { isCaseType } from '~/features/customers/type';
import { receivableInstallmentStatus } from '~/features/receivables/type';
import { prisma } from '~/lib/db.server';
import { errorCodeLabel } from '~/lib/error.server';

import type { InstallmentListItem } from '~/features/customers/type';
import type {
  ReceivableCustomerSummary,
  ReceivablePaymentItem,
  ReceivablePlanItem,
} from '~/features/receivables/type';

export type ReceivableDetailResult =
  | {
      status: 'ok';
      customer: ReceivableCustomerSummary;
      plans: ReceivablePlanItem[];
      payments: ReceivablePaymentItem[];
    }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'failed' };

function summarizeInstallments(
  retainerFee: number,
  installments: InstallmentListItem[],
): Pick<
  ReceivableCustomerSummary,
  'depositReceived' | 'installmentReceived' | 'remainingRetainer'
> {
  let depositReceived = 0;
  let installmentReceived = 0;
  for (const installment of installments) {
    if (installment.kind === 'DEPOSIT') {
      depositReceived += installment.receivedAmount;
    } else {
      installmentReceived += installment.receivedAmount;
    }
  }
  return {
    depositReceived,
    installmentReceived,
    remainingRetainer: Math.max(retainerFee - depositReceived - installmentReceived, 0),
  };
}

export async function readReceivableDetail(
  request: Request,
  customerId: string,
): Promise<{ result: ReceivableDetailResult; headers: Headers }> {
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
      select: { caseType: true, retainerFee: true },
    });
    if (!customerCase) {
      return { result: { status: 'not-found' }, headers };
    }
    if (!isCaseType(customerCase.caseType)) {
      return { result: { status: 'failed' }, headers };
    }
    const installments = await readCustomerInstallments(customer.id);
    if (installments === null) {
      return { result: { status: 'failed' }, headers };
    }
    const today = seoulToday();
    const plans = installments.map((installment) => {
      const remainingAmount = Math.max(installment.scheduledAmount - installment.receivedAmount, 0);
      return {
        id: installment.id,
        kind: installment.kind,
        sequence: installment.sequence,
        promisedOn: installment.promisedOn,
        scheduledAmount: installment.scheduledAmount,
        receivedAmount: installment.receivedAmount,
        remainingAmount,
        status: receivableInstallmentStatus(installment.promisedOn, remainingAmount, today),
      };
    });
    const payments = await prisma.installmentPayment.findMany({
      where: { installment: { customerCase: { customerId: customer.id } } },
      select: {
        id: true,
        amount: true,
        paidOn: true,
        installment: { select: { kind: true, sequence: true } },
      },
      orderBy: [{ paidOn: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    });
    const received = summarizeInstallments(customerCase.retainerFee, installments);
    return {
      result: {
        status: 'ok',
        customer: {
          id: customer.id,
          name: customer.name,
          caseType: customerCase.caseType,
          totalRetainer: customerCase.retainerFee,
          depositReceived: received.depositReceived,
          installmentReceived: received.installmentReceived,
          remainingRetainer: received.remainingRetainer,
        },
        plans,
        payments: payments.map((payment) => ({
          id: payment.id,
          paidOn: formatContactDate(payment.paidOn),
          kind: payment.installment.kind,
          sequence: payment.installment.sequence,
          amount: payment.amount,
        })),
      },
      headers,
    };
  } catch (error) {
    console.error('분납 상세를 불러오지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}
