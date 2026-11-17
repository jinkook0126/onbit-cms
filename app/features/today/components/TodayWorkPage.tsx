import { Card, CardHeader } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { TodayOverdueCard } from '~/features/today/components/TodayOverdueCard';
import { TodayWorkLists } from '~/features/today/components/TodayWorkLists';
import { useTodayWork } from '~/features/today/hooks/useTodayWork';
import { readQueryError } from '~/lib/formError';
import { formatWon } from '~/lib/money';
import { fieldLabel } from '~/lib/styles';
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
      key: 'dueCaseCount',
      label: '사건 기한 도래',
      value: formatCount(work.dueCaseCount, '건'),
      emphasize: false,
    },
    {
      key: 'overdueCustomerCount',
      label: '연체고객',
      value: formatCount(work.overdueCustomerCount, '명'),
      emphasize: false,
    },
    {
      key: 'overdueAmount',
      label: '총 연체액',
      value: formatWon(work.overdueAmount),
      emphasize: work.overdueAmount > 0,
    },
  ];
}

function TodayWorkSkeleton(): JSX.Element {
  return (
    <div className="grid gap-4" aria-hidden="true">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
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
      <p role="alert" className="text-sm text-destructive">
        {readQueryError(work.error, '오늘의 업무를 불러오지 못했습니다.')}
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <h2 className="sr-only">오늘의 업무 요약</h2>
        {todayCards(work.data).map((card) => (
          <Card key={card.key}>
            <CardHeader>
              <p className={fieldLabel}>{card.label}</p>
              <p
                className={cn(
                  'text-2xl leading-9 font-semibold text-foreground',
                  card.emphasize && 'text-destructive',
                )}
              >
                {card.value}
              </p>
            </CardHeader>
          </Card>
        ))}
      </section>
      <TodayWorkLists contacts={work.data.contacts} cases={work.data.cases} />
      <TodayOverdueCard installments={work.data.overdueInstallments} />
    </div>
  );
}
