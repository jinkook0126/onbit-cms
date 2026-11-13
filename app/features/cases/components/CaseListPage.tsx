import { useSearchParams } from 'react-router';

import { Skeleton } from '~/components/ui/skeleton';
import { CaseDataTable } from '~/features/cases/components/CaseDataTable';
import { CaseSearchForm } from '~/features/cases/components/CaseSearchForm';
import { CaseStageFilter } from '~/features/cases/components/CaseStageFilter';
import { useCaseList } from '~/features/cases/hooks/useCaseList';
import { caseFormError, parseCaseProgressStage, parseCaseSearchField } from '~/features/cases/type';
import { ApiError } from '~/lib/apiClient';

import type { JSX } from 'react';
import type { CaseSearchField } from '~/features/cases/type';
import type { CaseProgressStage } from '~/features/customers/type';

function CaseListSkeleton(): JSX.Element {
  return <Skeleton className="h-80 w-full" aria-hidden="true" />;
}

function caseListErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return caseFormError(error.body) ?? '사건 목록을 불러오지 못했습니다.';
  }
  return '사건 목록을 불러오지 못했습니다.';
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

export function CaseListPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const field = parseCaseSearchField(searchParams.get('field')) ?? 'name';
  const keyword = searchParams.get('q') ?? '';
  const stage = parseCaseProgressStage(searchParams.get('stage'));
  const page = readPage(searchParams.get('page'));
  const cases = useCaseList({ field, keyword, stage, page });

  function replaceParams(update: (params: URLSearchParams) => void): void {
    const next = new URLSearchParams(searchParams);
    update(next);
    setSearchParams(next, { replace: true });
  }

  function searchCases(nextField: CaseSearchField, nextKeyword: string): void {
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

  function changeStage(nextStage: CaseProgressStage | null): void {
    replaceParams((params) => {
      if (nextStage === null) {
        params.delete('stage');
      } else {
        params.set('stage', nextStage);
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

  const hasKeyword = keyword.trim() !== '';
  const emptyMessage =
    hasKeyword || stage !== null ? '검색 결과가 없습니다.' : '등록된 사건이 없습니다.';

  let listBody: JSX.Element;
  if (cases.isPending) {
    listBody = <CaseListSkeleton />;
  } else if (cases.isError) {
    listBody = (
      <p role="alert" className="text-sm text-destructive">
        {caseListErrorMessage(cases.error)}
      </p>
    );
  } else {
    listBody = (
      <CaseDataTable
        cases={cases.data.cases}
        total={cases.data.total}
        page={cases.data.page}
        isFetching={cases.isFetching}
        emptyMessage={emptyMessage}
        onPageChange={changePage}
      />
    );
  }

  return (
    <div className="grid gap-4">
      <section className="grid gap-4 rounded-xl bg-card p-4 ring-1 ring-border">
        <h2 className="text-sm font-medium text-foreground">검색 조건</h2>
        <CaseSearchForm
          key={`${field}:${keyword}`}
          field={field}
          keyword={keyword}
          onSearch={searchCases}
        />
        <CaseStageFilter stage={stage} onStageChange={changeStage} />
      </section>
      <section className="grid gap-3">
        <h2 className="sr-only">사건 목록</h2>
        {listBody}
      </section>
    </div>
  );
}
