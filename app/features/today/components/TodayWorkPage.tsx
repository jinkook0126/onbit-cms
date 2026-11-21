import { Card, CardHeader } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { TodayOverdueCard } from '~/features/today/components/TodayOverdueCard';
import { TodayWorkLists } from '~/features/today/components/TodayWorkLists';
import { useTodayWork } from '~/features/today/hooks/useTodayWork';
import { readQueryError } from '~/lib/formError';
import { formatWon } from '~/lib/money';
import { fieldLabel, pageAlert, pageSurface } from '~/lib/styles';
import { cn } from '~/lib/utils';

import type { JSX } from 'react';
import type { TodayWork } from '~/features/today/type';

const countFormat = new Intl.NumberFormat('ko-KR');

type TodayCard = {
  key: keyof TodayWork;
  label: string;
  value: string;
  emphasize: boolean;
};

function formatCount(value: number, unit: string): string {
  return `${countFormat.format(value)}${unit}`;
}

function todayCards(work: TodayWork): TodayCard[] {
  return [
    {
      key: 'recontactCount',
      label: '재연락대상',
      value: formatCount(work.recontactCount, '명'),
      emphasize: false,
    },
    {
      key: 'overdueCustomerCount',
      label: '연체고객',
      value: formatCount(work.overdueCustomerCount, '명'),
      emphasize: work.overdueCustomerCount > 0,
    },
    {
      key: 'overdueAmount',
      label: '총 연체액',
      value: formatWon(work.overdueAmount),
      emphasize: work.overdueAmount > 0,
    },
  ];
}

function SummarySkeleton(): JSX.Element {
  return (
    <div className={cn(pageSurface, 'h-28 p-5')}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-4 h-8 w-28" />
    </div>
  );
}

function TodayWorkSkeleton(): JSX.Element {
  return (
    <div className="grid gap-5" aria-hidden="true">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <SummarySkeleton />
        <SummarySkeleton />
        <SummarySkeleton />
      </div>
      <Skeleton className={cn(pageSurface, 'h-64 w-full')} />
      <Skeleton className={cn(pageSurface, 'h-64 w-full')} />
    </div>
  );
}

export function TodayWorkPage(): JSX.Element {
  const work = useTodayWork();

  if (work.isPending) {
    return <TodayWorkSkeleton />;
  }

  if (work.isError) {
    return (
      <p role="alert" className={pageAlert}>
        {readQueryError(work.error, '오늘의 업무를 불러오지 못했습니다.')}
      </p>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="grid auto-rows-fr gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <h2 className="sr-only">오늘의 업무 요약</h2>
        {todayCards(work.data).map((card) => (
          <Card key={card.key} className="h-full shadow-none">
            <CardHeader className="h-full content-start items-start justify-items-start gap-3">
              <p className={cn(fieldLabel, 'w-full text-left')}>{card.label}</p>
              <p
                className={cn(
                  'text-center text-3xl leading-none font-semibold tracking-tight text-foreground tabular-nums',
                  card.emphasize && 'text-destructive',
                )}
              >
                {card.value}
              </p>
            </CardHeader>
          </Card>
        ))}
      </section>
      <TodayWorkLists contacts={work.data.contacts} />
      <TodayOverdueCard installments={work.data.overdueInstallments} />
    </div>
  );
}
