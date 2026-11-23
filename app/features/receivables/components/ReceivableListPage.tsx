import { useSearchParams } from 'react-router';

import { Skeleton } from '~/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { ReceivableCalendarPanel } from '~/features/receivables/components/ReceivableCalendarPanel';
import { ReceivableDataTable } from '~/features/receivables/components/ReceivableDataTable';
import { ReceivableSearchForm } from '~/features/receivables/components/ReceivableSearchForm';
import { useReceivableList } from '~/features/receivables/hooks/useReceivableList';
import {
  parseReceivableDate,
  parseReceivablePaymentFilter,
  parseReceivableSearchField,
  parseReceivableSort,
  receivablePaymentFilterParam,
  seoulCalendarToday,
  seoulMonthStart,
} from '~/features/receivables/type';
import { readQueryError } from '~/lib/formError';
import { pageAlert, pageSurface } from '~/lib/styles';

import type { JSX } from 'react';
import type { ReceivableSearchValues } from '~/features/receivables/components/ReceivableSearchForm';
import type { ReceivableListParams, ReceivableSort } from '~/features/receivables/type';

function ReceivableListSkeleton(): JSX.Element {
  return (
    <div className={`${pageSurface} p-5`} aria-hidden="true">
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

function readPage(value: string | null): number {
  if (value === null || !/^[1-9]\d*$/.test(value)) {
    return 1;
  }
  const page = Number(value);
  if (!Number.isSafeInteger(page)) {
    return 1;
  }
  return page;
}

const emptyListParams: ReceivableListParams = {
  field: 'name',
  keyword: '',
  from: '',
  to: '',
  status: 'ALL',
  sort: 'desc',
  page: 1,
};

function readListParams(
  searchParams: URLSearchParams,
): { valid: true; params: ReceivableListParams } | { valid: false } {
  const field = parseReceivableSearchField(searchParams.get('field'));
  const fromRaw = searchParams.get('from');
  const toRaw = searchParams.get('to');
  const useDefaultRange = fromRaw === null && toRaw === null;
  const from = useDefaultRange ? seoulMonthStart() : parseReceivableDate(fromRaw);
  const to = useDefaultRange ? seoulCalendarToday() : parseReceivableDate(toRaw);
  const status = parseReceivablePaymentFilter(searchParams.get('status'));
  const sort = parseReceivableSort(searchParams.get('sort'));
  if (field === null || from === null || to === null || status === null || sort === null) {
    return { valid: false };
  }
  if (from !== '' && to !== '' && from > to) {
    return { valid: false };
  }
  return {
    valid: true,
    params: {
      field,
      keyword: searchParams.get('q') ?? '',
      from,
      to,
      status,
      sort,
      page: readPage(searchParams.get('page')),
    },
  };
}

function ReceivableStatusPanel(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readListParams(searchParams);
  const listParams = filters.valid ? filters.params : emptyListParams;
  const receivables = useReceivableList(listParams, filters.valid);

  function replaceParams(
    update: (params: URLSearchParams) => void,
    preventScrollReset = false,
  ): void {
    const next = new URLSearchParams(searchParams);
    update(next);
    setSearchParams(next, { replace: true, preventScrollReset });
  }

  function searchReceivables(next: ReceivableSearchValues): void {
    replaceParams((params) => {
      if (next.field === 'name') {
        params.delete('field');
      } else {
        params.set('field', next.field);
      }
      if (next.keyword === '') {
        params.delete('q');
      } else {
        params.set('q', next.keyword);
      }
      params.set('from', next.from);
      params.set('to', next.to);
      const status = receivablePaymentFilterParam(next.status);
      if (status === null) {
        params.delete('status');
      } else {
        params.set('status', status);
      }
      params.delete('page');
    });
  }

  function changeSort(nextSort: ReceivableSort): void {
    replaceParams((params) => {
      if (nextSort === 'desc') {
        params.delete('sort');
      } else {
        params.set('sort', nextSort);
      }
      params.delete('page');
    });
  }

  function changePage(nextPage: number): void {
    replaceParams((params) => {
      if (nextPage <= 1) {
        params.delete('page');
        return;
      }
      params.set('page', String(nextPage));
    }, true);
  }

  const hasFilter =
    listParams.keyword.trim() !== '' ||
    listParams.from !== '' ||
    listParams.to !== '' ||
    listParams.status !== 'ALL';
  const emptyMessage = hasFilter ? '검색 결과가 없습니다.' : '등록된 분납 내역이 없습니다.';

  let listBody: JSX.Element;
  if (receivables.isPending) {
    listBody = <ReceivableListSkeleton />;
  } else if (receivables.isError) {
    listBody = (
      <p role="alert" className={pageAlert}>
        {readQueryError(receivables.error, '분납 목록을 불러오지 못했습니다.')}
      </p>
    );
  } else {
    listBody = (
      <ReceivableDataTable
        receivables={receivables.data.receivables}
        total={receivables.data.total}
        page={receivables.data.page}
        isFetching={receivables.isFetching}
        emptyMessage={emptyMessage}
        sort={listParams.sort}
        onSortChange={changeSort}
        onPageChange={changePage}
      />
    );
  }

  return (
    <div className="grid gap-5">
      <section className={`${pageSurface} grid gap-5 p-5`}>
        <h2 className="text-sm font-medium text-foreground">검색 조건</h2>
        <ReceivableSearchForm
          key={`${listParams.field}:${listParams.keyword}:${listParams.from}:${listParams.to}:${listParams.status}`}
          values={listParams}
          onSearch={searchReceivables}
        />
      </section>
      <section className="grid gap-3">
        <h2 className="sr-only">분납 목록</h2>
        {filters.valid ? (
          listBody
        ) : (
          <p role="alert" className={pageAlert}>
            검색 조건이 올바르지 않습니다.
          </p>
        )}
      </section>
    </div>
  );
}

function readView(value: string | null): 'calendar' | 'customers' {
  return value === 'customers' ? 'customers' : 'calendar';
}

export function ReceivableListPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = readView(searchParams.get('view'));

  function changeView(nextView: string): void {
    if (nextView !== 'calendar' && nextView !== 'customers') {
      return;
    }
    const next = new URLSearchParams(searchParams);
    if (nextView === 'calendar') {
      next.delete('view');
    } else {
      next.set('view', 'customers');
    }
    setSearchParams(next, { replace: true });
  }

  return (
    <Tabs value={view} onValueChange={changeView}>
      <TabsList>
        <TabsTrigger value="calendar">캘린더</TabsTrigger>
        <TabsTrigger value="customers">고객별 현황</TabsTrigger>
      </TabsList>
      <TabsContent value="calendar">
        <ReceivableCalendarPanel />
      </TabsContent>
      <TabsContent value="customers">
        <ReceivableStatusPanel />
      </TabsContent>
    </Tabs>
  );
}
