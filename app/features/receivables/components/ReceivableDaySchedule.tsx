import { Link } from 'react-router';

import { Skeleton } from '~/components/ui/skeleton';
import { installmentScheduleLabel } from '~/features/customers/type';
import { ReceivableStatusBadge } from '~/features/receivables/components/ReceivableStatusBadge';
import { useReceivableSchedule } from '~/features/receivables/hooks/useReceivableSchedule';
import { receivableDetailPath } from '~/features/receivables/type';
import { readQueryError } from '~/lib/formError';
import { focusRing, sectionDescription } from '~/lib/styles';
import { cn } from '~/lib/utils';

import type { JSX } from 'react';

type ReceivableDayScheduleProps = {
  date: string;
  name: string;
};

export function ReceivableDaySchedule({ date, name }: ReceivableDayScheduleProps): JSX.Element {
  const schedule = useReceivableSchedule({ date, name }, date !== '');

  if (schedule.isPending) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (schedule.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {readQueryError(schedule.error, '납부 일정을 불러오지 못했습니다.')}
      </p>
    );
  }

  if (schedule.data.receivables.length === 0) {
    return <p className={sectionDescription}>이 날짜의 납부 일정이 없습니다.</p>;
  }

  return (
    <ul className="grid max-h-96 gap-2 overflow-y-auto">
      {schedule.data.receivables.map((receivable) => (
        <li key={receivable.id}>
          <Link
            to={receivableDetailPath(receivable.customerId)}
            className={cn(
              'grid gap-1 rounded-lg border border-border px-3 py-2 text-foreground',
              focusRing,
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium">{receivable.customerName}</span>
              <ReceivableStatusBadge status={receivable.status} />
            </span>
            <span className="text-sm">{installmentScheduleLabel(receivable)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
