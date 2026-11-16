import { fieldLabel, fieldValue } from '~/lib/styles';
import { cn } from '~/lib/utils';

import type { JSX } from 'react';
import type { SettlementResponse } from '~/features/settlements/type';

type SettlementSummaryProps = {
  settlement: Pick<SettlementResponse, 'paymentTotal' | 'refundTotal' | 'netTotal'>;
};

const wonFormat = new Intl.NumberFormat('ko-KR');

const summaryFields = [
  { key: 'paymentTotal', label: '수납합계' },
  { key: 'refundTotal', label: '환불합계' },
  { key: 'netTotal', label: '순수납' },
] as const;

function formatWon(amount: number): string {
  return `${wonFormat.format(amount)}원`;
}

export function SettlementSummary({ settlement }: SettlementSummaryProps): JSX.Element {
  return (
    <section className="grid gap-4 rounded-xl bg-card p-4 ring-1 ring-border sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border">
      <h2 className="sr-only">월별 합계</h2>
      {summaryFields.map((field, index) => {
        const amount = settlement[field.key];
        const negative = field.key === 'netTotal' && amount < 0;
        return (
          <div
            key={field.key}
            className={`grid content-center gap-2 ${index === 0 ? 'sm:pr-6' : 'sm:px-6'}`}
          >
            <p className={fieldLabel}>{field.label}</p>
            <p className={cn(fieldValue, negative && 'text-destructive')}>{formatWon(amount)}</p>
          </div>
        );
      })}
    </section>
  );
}
