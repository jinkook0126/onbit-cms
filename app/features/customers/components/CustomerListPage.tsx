import { useState } from 'react';
import { useSearchParams } from 'react-router';

import { Skeleton } from '~/components/ui/skeleton';
import { CustomerAssigneeBulkDialog } from '~/features/customers/components/CustomerAssigneeBulkDialog';
import { CustomerCreateDrawer } from '~/features/customers/components/CustomerCreateDrawer';
import { CustomerDataTable } from '~/features/customers/components/CustomerDataTable';
import { CustomerImportDialog } from '~/features/customers/components/CustomerImportDialog';
import { CustomerSearchForm } from '~/features/customers/components/CustomerSearchForm';
import { CustomerStatusFilter } from '~/features/customers/components/CustomerStatusFilter';
import { useCustomerList } from '~/features/customers/hooks/useCustomerList';
import {
  customerPhoneDigits,
  parseConsultationStatus,
  parseCustomerSearchField,
} from '~/features/customers/type';
import { readQueryError } from '~/lib/formError';
import { pageAlert, pageSurface } from '~/lib/styles';

import type { RowSelectionState } from '@tanstack/react-table';
import type { JSX } from 'react';
import type { ConsultationStatus, CustomerSearchField } from '~/features/customers/type';

function selectedCustomerIds(selection: RowSelectionState): string[] {
  return Object.keys(selection);
}

function CustomerListSkeleton(): JSX.Element {
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

export function CustomerListPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const field = parseCustomerSearchField(searchParams.get('field')) ?? 'name';
  const keyword = searchParams.get('q') ?? '';
  const status = parseConsultationStatus(searchParams.get('status'));
  const page = readPage(searchParams.get('page'));
  const customers = useCustomerList({ field, keyword, status, page });

  function replaceParams(update: (params: URLSearchParams) => void): void {
    const next = new URLSearchParams(searchParams);
    update(next);
    setRowSelection({});
    setSearchParams(next, { replace: true });
  }

  function searchCustomers(nextField: CustomerSearchField, nextKeyword: string): void {
    replaceParams((params) => {
      if (nextField === 'name') {
        params.delete('field');
      } else {
        params.set('field', nextField);
      }
      const query = nextField === 'phone' ? customerPhoneDigits(nextKeyword) : nextKeyword;
      if (query === '') {
        params.delete('q');
      } else {
        params.set('q', query);
      }
      params.delete('page');
    });
  }

  function changeStatus(nextStatus: ConsultationStatus | null): void {
    replaceParams((params) => {
      if (nextStatus === null) {
        params.delete('status');
      } else {
        params.set('status', nextStatus);
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
    hasKeyword || status !== null ? '검색 결과가 없습니다.' : '등록된 상담 고객이 없습니다.';

  let listBody: JSX.Element;
  if (customers.isPending) {
    listBody = <CustomerListSkeleton />;
  } else if (customers.isError) {
    listBody = (
      <p role="alert" className={pageAlert}>
        {readQueryError(customers.error, '상담 고객 목록을 불러오지 못했습니다.')}
      </p>
    );
  } else {
    listBody = (
      <CustomerDataTable
        customers={customers.data.customers}
        total={customers.data.total}
        page={customers.data.page}
        isFetching={customers.isFetching}
        emptyMessage={emptyMessage}
        rowSelection={rowSelection}
        onPageChange={changePage}
        onRowSelectionChange={setRowSelection}
      />
    );
  }

  return (
    <div className="grid gap-5">
      <section className={`${pageSurface} grid gap-5 p-5`}>
        <h2 className="text-sm font-medium text-foreground">검색 조건</h2>
        <CustomerSearchForm
          key={`${field}:${keyword}`}
          field={field}
          keyword={keyword}
          onSearch={searchCustomers}
        />
        <CustomerStatusFilter status={status} onStatusChange={changeStatus} />
      </section>
      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="sr-only">상담 고객 목록</h2>
          <CustomerAssigneeBulkDialog
            customerIds={selectedCustomerIds(rowSelection)}
            onAssigned={() => {
              setRowSelection({});
            }}
          />
          <div className="flex items-center gap-2">
            <CustomerImportDialog />
            <CustomerCreateDrawer />
          </div>
        </div>
        {listBody}
      </section>
    </div>
  );
}
