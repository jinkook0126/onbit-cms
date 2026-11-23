import { useSearchParams } from 'react-router';

import { Card, CardHeader } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { TodayPeriodForm } from '~/features/today/components/TodayPeriodForm';
import { TodayReminderSection } from '~/features/today/components/TodayReminderSection';
import { TodayWorkLists } from '~/features/today/components/TodayWorkLists';
import { useTodayWork } from '~/features/today/hooks/useTodayWork';
import { parseTodayDate, seoulCalendarToday, seoulMonthStart } from '~/features/today/type';
import { readQueryError } from '~/lib/formError';
import { formatWon } from '~/lib/money';
import { fieldLabel, pageAlert, pageSurface } from '~/lib/styles';
import { cn } from '~/lib/utils';

import type { JSX } from 'react';
import type { TodayWork } from '~/features/today/type';

const countFormat = new Intl.NumberFormat('ko-KR');

type TodayCard = {
  key: string;
  label: string;
  value: string;
  emphasize: boolean;
};

function formatCount(value: number, unit: string): string {
  return `${countFormat.format(value)}${unit}`;
}

function formatRate(rate: number | null): string {
  if (rate === null) {
    return '—';
  }
  return `${rate.toFixed(1)}%`;
}

function readPeriod(
  searchParams: URLSearchParams,
): { valid: true; from: string; to: string } | { valid: false; from: string; to: string } {
  const fromRaw = searchParams.get('from');
  const toRaw = searchParams.get('to');
  if (fromRaw === null && toRaw === null) {
    return { valid: true, from: seoulMonthStart(), to: seoulCalendarToday() };
  }
  const from = parseTodayDate(fromRaw);
  const to = parseTodayDate(toRaw);
  if (from === null || to === null || from === '' || to === '' || from > to) {
    return { valid: false, from: from ?? '', to: to ?? '' };
  }
  return { valid: true, from, to };
}

function todayCards(work: TodayWork): TodayCard[] {
  return [
    {
      key: 'totalRetainer',
      label: '총매출',
      value: formatWon(work.totalRetainer),
      emphasize: false,
    },
    {
      key: 'receivedAmount',
      label: '입금액',
      value: formatWon(work.receivedAmount),
      emphasize: false,
    },
    {
      key: 'processedCount',
      label: 'DB 처리',
      value: formatCount(work.processedCount, '건'),
      emphasize: false,
    },
    {
      key: 'retainedCount',
      label: '수임 건수',
      value: formatCount(work.retainedCount, '건'),
      emphasize: false,
    },
    {
      key: 'retentionRate',
      label: '수임률',
      value: formatRate(work.retentionRate),
      emphasize: false,
    },
    {
      key: 'overdueCustomerCount',
      label: '미납인원',
      value: formatCount(work.overdueCustomerCount, '명'),
      emphasize: work.overdueCustomerCount > 0,
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

export function TodayWorkPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const period = readPeriod(searchParams);
  const work = useTodayWork(period.from, period.to, period.valid);

  function searchPeriod(from: string, to: string): void {
    const next = new URLSearchParams(searchParams);
    next.set('from', from);
    next.set('to', to);
    setSearchParams(next, { replace: true, preventScrollReset: true });
  }

  let summary: JSX.Element;
  if (!period.valid) {
    summary = (
      <p role="alert" className={pageAlert}>
        조회 기간이 올바르지 않습니다.
      </p>
    );
  } else if (work.isPending) {
    summary = (
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
        <SummarySkeleton />
        <SummarySkeleton />
        <SummarySkeleton />
        <SummarySkeleton />
        <SummarySkeleton />
        <SummarySkeleton />
      </div>
    );
  } else if (work.isError) {
    summary = (
      <p role="alert" className={pageAlert}>
        {readQueryError(work.error, '오늘의 업무를 불러오지 못했습니다.')}
      </p>
    );
  } else {
    summary = (
      <>
        <section className="grid auto-rows-fr gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <h2 className="sr-only">오늘의 업무 요약</h2>
          {todayCards(work.data).map((card) => (
            <Card key={card.key} className="h-full shadow-none">
              <CardHeader className="h-full content-start items-start justify-items-start gap-3">
                <p className={cn(fieldLabel, 'w-full text-left')}>{card.label}</p>
                <p
                  className={cn(
                    'text-3xl leading-none font-semibold tracking-tight text-foreground tabular-nums',
                    card.emphasize && 'text-destructive',
                  )}
                >
                  {card.value}
                </p>
              </CardHeader>
            </Card>
          ))}
        </section>
        <TodayWorkLists
          deposits={work.data.deposits}
          overdueCustomers={work.data.overdueCustomers}
          upcomingPayments={work.data.upcomingPayments}
        />
      </>
    );
  }

  return (
    <div className="grid gap-5">
      <section className={`${pageSurface} grid gap-4 p-5`}>
        <h2 className="text-sm font-medium text-foreground">조회 기간</h2>
        <TodayPeriodForm
          key={`${period.from}:${period.to}`}
          from={period.from}
          to={period.to}
          onSearch={searchPeriod}
        />
      </section>
      {summary}
      <TodayReminderSection />
    </div>
  );
}
