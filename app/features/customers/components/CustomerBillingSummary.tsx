import { Skeleton } from '~/components/ui/skeleton';
import { useCustomerSummary } from '~/features/customers/hooks/useCustomerSummary';
import { customerFormError } from '~/features/customers/type';
import { ApiError } from '~/lib/apiClient';
import { fieldLabel, fieldValue } from '~/lib/styles';

import type { JSX } from 'react';
import type { CustomerSummary } from '~/features/customers/type';

type CustomerBillingSummaryProps = {
  customerId: string;
};

const wonFormat = new Intl.NumberFormat('ko-KR');

const summaryFields: { key: keyof CustomerSummary; label: string }[] = [
  { key: 'totalAmount', label: '계약금 포함 총 금액' },
  { key: 'deposit', label: '계약금' },
  { key: 'netReceived', label: '순수납' },
  { key: 'remainingRetainer', label: '남은 수임료' },
  { key: 'overdue', label: '연체액' },
];

function formatWon(amount: number): string {
  return `${wonFormat.format(amount)}원`;
}

function summaryErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return customerFormError(error.body) ?? '수임 요약을 불러오지 못했습니다.';
  }
  return '수임 요약을 불러오지 못했습니다.';
}

export function CustomerBillingSummary({ customerId }: CustomerBillingSummaryProps): JSX.Element {
  const summary = useCustomerSummary(customerId);

  if (summary.isPending) {
    return (
      <div className="mt-6 border-t border-border pt-6" aria-hidden="true">
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (summary.isError) {
    return (
      <p role="alert" className="mt-6 border-t border-border pt-6 text-sm text-destructive">
        {summaryErrorMessage(summary.error)}
      </p>
    );
  }

  return (
    <div className="mt-6 grid gap-4 border-t border-border pt-6 sm:grid-cols-5 sm:gap-0 sm:divide-x sm:divide-border">
      {summaryFields.map((field, index) => {
        const overdue = field.key === 'overdue' && summary.data.overdue > 0;
        return (
          <div
            key={field.key}
            className={`grid content-center gap-2 ${index === 0 ? 'sm:pr-6' : 'sm:px-6'}`}
          >
            <p className={fieldLabel}>{field.label}</p>
            <p className={overdue ? 'text-sm font-medium text-destructive' : fieldValue}>
              {formatWon(summary.data[field.key])}
            </p>
          </div>
        );
      })}
    </div>
  );
}
