import { seoulToday } from '~/features/customers/api/customerDates.server';
import { readOrCreateInstallments } from '~/features/customers/api/customerInstallments.server';
import {
  readAccessibleCustomer,
  resolveCustomerActor,
} from '~/features/customers/api/customerScope.server';
import { prisma } from '~/lib/db.server';
import { errorCodeLabel } from '~/lib/error.server';

import type { CustomerSummary, InstallmentListItem } from '~/features/customers/type';

export type CustomerSummaryResult =
  | { status: 'ok'; summary: CustomerSummary }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'failed' };

function customerSummaryFromInstallments(
  deposit: number,
  retainerFee: number,
  installments: InstallmentListItem[],
  today: string,
): CustomerSummary {
  const netReceived = installments.reduce((sum, row) => sum + row.receivedAmount, 0);
  const overdue = installments.reduce((sum, row) => {
    if (row.promisedOn >= today) {
      return sum;
    }
    return sum + Math.max(row.scheduledAmount - row.receivedAmount, 0);
  }, 0);
  return {
    totalAmount: retainerFee,
    deposit,
    netReceived,
    remainingRetainer: Math.max(retainerFee - netReceived, 0),
    overdue,
  };
}

export async function readCustomerSummary(
  request: Request,
  customerId: string,
): Promise<{ result: CustomerSummaryResult; headers: Headers }> {
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
      select: { deposit: true, retainerFee: true },
    });
    if (!customerCase) {
      return { result: { status: 'not-found' }, headers };
    }
    const installments = await readOrCreateInstallments(customer.id);
    if (installments === null) {
      return { result: { status: 'failed' }, headers };
    }
    return {
      result: {
        status: 'ok',
        summary: customerSummaryFromInstallments(
          customerCase.deposit,
          customerCase.retainerFee,
          installments,
          seoulToday(),
        ),
      },
      headers,
    };
  } catch (error) {
    console.error('수임 요약을 불러오지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}
