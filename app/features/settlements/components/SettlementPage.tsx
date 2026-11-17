import { useSearchParams } from 'react-router';

import { Skeleton } from '~/components/ui/skeleton';
import { SettlementEntryList } from '~/features/settlements/components/SettlementEntryList';
import { SettlementMonthField } from '~/features/settlements/components/SettlementMonthField';
import { SettlementSummary } from '~/features/settlements/components/SettlementSummary';
import { useSettlement } from '~/features/settlements/hooks/useSettlement';
import { parseSettlementMonth, seoulSettlementMonth } from '~/features/settlements/type';
import { readQueryError } from '~/lib/formError';
import { pageAlert, pageSurface } from '~/lib/styles';

import type { JSX } from 'react';

function SettlementBodySkeleton(): JSX.Element {
  return (
    <div className="grid gap-5" aria-hidden="true">
      <div className={`${pageSurface} p-5`}>
        <Skeleton className="h-16 w-full" />
      </div>
      <div className={`${pageSurface} p-5`}>
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  );
}

export function SettlementPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const month = parseSettlementMonth(searchParams.get('month')) ?? seoulSettlementMonth();
  const settlement = useSettlement(month);

  function changeMonth(nextMonth: string): void {
    const next = new URLSearchParams(searchParams);
    next.set('month', nextMonth);
    setSearchParams(next, { replace: true });
  }

  let body: JSX.Element;
  if (settlement.isPending) {
    body = <SettlementBodySkeleton />;
  } else if (settlement.isError) {
    body = (
      <p role="alert" className={pageAlert}>
        {readQueryError(settlement.error, '월별 정산을 불러오지 못했습니다.')}
      </p>
    );
  } else {
    body = (
      <>
        <SettlementSummary settlement={settlement.data} />
        <section className="grid gap-3">
          <h2 className="sr-only">거래 목록</h2>
          <SettlementEntryList entries={settlement.data.entries} />
        </section>
      </>
    );
  }

  return (
    <div className="grid gap-5">
      <div className={`${pageSurface} px-5 py-4`}>
        <SettlementMonthField month={month} onMonthChange={changeMonth} />
      </div>
      {body}
    </div>
  );
}
