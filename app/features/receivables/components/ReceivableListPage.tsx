import { useSearchParams } from 'react-router';

import { Skeleton } from '~/components/ui/skeleton';
import { ReceivableDataTable } from '~/features/receivables/components/ReceivableDataTable';
import { ReceivableSearchForm } from '~/features/receivables/components/ReceivableSearchForm';
import { useReceivableList } from '~/features/receivables/hooks/useReceivableList';
import { parseReceivableSearchField, receivableFormError } from '~/features/receivables/type';
import { ApiError } from '~/lib/apiClient';

import type { JSX } from 'react';
import type { ReceivableSearchField } from '~/features/receivables/type';

function ReceivableListSkeleton(): JSX.Element {
  return <Skeleton className="h-80 w-full" aria-hidden="true" />;
}

function receivableListErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return receivableFormError(error.body) ?? '분납 목록을 불러오지 못했습니다.';
  }
  return '분납 목록을 불러오지 못했습니다.';
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

export function ReceivableListPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const field = parseReceivableSearchField(searchParams.get('field')) ?? 'name';
  const keyword = searchParams.get('q') ?? '';
  const page = readPage(searchParams.get('page'));
  const receivables = useReceivableList({ field, keyword, page });

  function replaceParams(update: (params: URLSearchParams) => void): void {
    const next = new URLSearchParams(searchParams);
    update(next);
    setSearchParams(next, { replace: true });
  }

  function searchReceivables(nextField: ReceivableSearchField, nextKeyword: string): void {
    replaceParams((params) => {
      if (nextField === 'name') {
        params.delete('field');
      } else {
        params.set('field', nextField);
      }
      if (nextKeyword === '') {
        params.delete('q');
      } else {
        params.set('q', nextKeyword);
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
    });
  }

  const emptyMessage =
    keyword.trim() === '' ? '등록된 분납 내역이 없습니다.' : '검색 결과가 없습니다.';

  let listBody: JSX.Element;
  if (receivables.isPending) {
    listBody = <ReceivableListSkeleton />;
  } else if (receivables.isError) {
    listBody = (
      <p role="alert" className="text-sm text-destructive">
        {receivableListErrorMessage(receivables.error)}
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
        onPageChange={changePage}
      />
    );
  }

  return (
    <div className="grid gap-4">
      <section className="grid gap-4 rounded-xl bg-card p-4 ring-1 ring-border">
        <h2 className="text-sm font-medium text-foreground">검색 조건</h2>
        <ReceivableSearchForm
          key={`${field}:${keyword}`}
          field={field}
          keyword={keyword}
          onSearch={searchReceivables}
        />
      </section>
      <section className="grid gap-3">
        <h2 className="sr-only">분납 목록</h2>
        {listBody}
      </section>
    </div>
  );
}
