import { useState } from 'react';
import { useSearchParams } from 'react-router';

import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { CustomerAssigneeBulkDialog } from '~/features/customers/components/CustomerAssigneeBulkDialog';
import { CustomerDataTable } from '~/features/customers/components/CustomerDataTable';
import { CustomerDeleteDialog } from '~/features/customers/components/CustomerDeleteDialog';
import { CustomerDetailDialog } from '~/features/customers/components/CustomerDetailDialog';
import { CustomerImportDialog } from '~/features/customers/components/CustomerImportDialog';
import { CustomerListEditDialog } from '~/features/customers/components/CustomerListEditDialog';
import { CustomerProfileDialog } from '~/features/customers/components/CustomerProfileDialog';
import { CustomerReminderSection } from '~/features/customers/components/CustomerReminderSection';
import { CustomerSearchForm } from '~/features/customers/components/CustomerSearchForm';
import { CustomerSourceFilter } from '~/features/customers/components/CustomerSourceFilter';
import { CustomerStatusFilter } from '~/features/customers/components/CustomerStatusFilter';
import { useCustomerFavorite } from '~/features/customers/hooks/useCustomerFavorite';
import { useCustomerList } from '~/features/customers/hooks/useCustomerList';
import {
  customerPhoneDigits,
  isConsultationStatusParam,
  isInflowSourceParam,
  parseConsultationStatus,
  parseCustomerDate,
  parseCustomerListView,
  parseCustomerSearchField,
  parseCustomerSortDirection,
  parseCustomerSortField,
  parseInflowSource,
  seoulCalendarToday,
  seoulMonthStart,
} from '~/features/customers/type';
import { readQueryError } from '~/lib/formError';
import { pageAlert, pageSurface } from '~/lib/styles';

import type { RowSelectionState } from '@tanstack/react-table';
import type { JSX } from 'react';
import type { CustomerSearchValues } from '~/features/customers/components/CustomerSearchForm';
import type {
  ConsultationStatus,
  CustomerListParams,
  CustomerListSort,
  CustomerListView,
  InflowSource,
} from '~/features/customers/type';

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

const emptyListParams: CustomerListParams = {
  field: 'name',
  keyword: '',
  status: null,
  source: null,
  from: '',
  to: '',
  sort: { field: 'registered', direction: 'desc' },
  view: 'all',
  page: 1,
};

function readListParams(
  searchParams: URLSearchParams,
): { valid: true; params: CustomerListParams } | { valid: false } {
  const field = parseCustomerSearchField(searchParams.get('field'));
  const statusParam = searchParams.get('status');
  const sourceParam = searchParams.get('source');
  const fromRaw = searchParams.get('from');
  const toRaw = searchParams.get('to');
  const useDefaultRange = fromRaw === null && toRaw === null;
  const from = useDefaultRange ? seoulMonthStart() : parseCustomerDate(fromRaw);
  const to = useDefaultRange ? seoulCalendarToday() : parseCustomerDate(toRaw);
  const sortField = parseCustomerSortField(searchParams.get('sort'));
  const sortDirection = parseCustomerSortDirection(searchParams.get('order'));
  const view = parseCustomerListView(searchParams.get('view'));
  if (
    field === null ||
    from === null ||
    to === null ||
    sortField === null ||
    sortDirection === null ||
    view === null ||
    !isInflowSourceParam(sourceParam) ||
    !isConsultationStatusParam(statusParam)
  ) {
    return { valid: false };
  }
  if (from !== '' && to !== '' && from > to) {
    return { valid: false };
  }
  const status = parseConsultationStatus(statusParam);
  return {
    valid: true,
    params: {
      field,
      keyword: searchParams.get('q') ?? '',
      status,
      source: parseInflowSource(sourceParam),
      from,
      to,
      sort: { field: sortField, direction: sortDirection },
      view,
      page: readPage(searchParams.get('page')),
    },
  };
}

export function CustomerListPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [creating, setCreating] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState('');
  const [deletingCustomer, setDeletingCustomer] = useState<{ id: string; name: string } | null>(
    null,
  );
  const filters = readListParams(searchParams);
  const listParams = filters.valid ? filters.params : emptyListParams;
  const customerId = searchParams.get('customer') ?? '';
  const customers = useCustomerList(listParams, filters.valid);
  const favorite = useCustomerFavorite();

  function replaceParams(
    update: (params: URLSearchParams) => void,
    preventScrollReset = false,
  ): void {
    const next = new URLSearchParams(searchParams);
    update(next);
    setRowSelection({});
    setSearchParams(next, { replace: true, preventScrollReset });
  }

  function searchCustomers(next: CustomerSearchValues): void {
    replaceParams((params) => {
      if (next.field === 'name') {
        params.delete('field');
      } else {
        params.set('field', next.field);
      }
      const query = next.field === 'phone' ? customerPhoneDigits(next.keyword) : next.keyword;
      if (query === '') {
        params.delete('q');
      } else {
        params.set('q', query);
      }
      params.set('from', next.from);
      params.set('to', next.to);
      params.delete('page');
    });
  }

  function changeSource(nextSource: InflowSource | null): void {
    replaceParams((params) => {
      if (nextSource === null) {
        params.delete('source');
      } else {
        params.set('source', nextSource);
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

  function openCustomer(nextCustomerId: string): void {
    const next = new URLSearchParams(searchParams);
    next.set('customer', nextCustomerId);
    setSearchParams(next);
  }

  function closeCustomer(): void {
    const next = new URLSearchParams(searchParams);
    next.delete('customer');
    setSearchParams(next, { replace: true });
  }

  function changeView(nextView: string): void {
    if (nextView !== 'all' && nextView !== 'favorites') {
      return;
    }
    const view: CustomerListView = nextView;
    replaceParams((params) => {
      if (view === 'all') {
        params.delete('view');
      } else {
        params.set('view', view);
      }
      params.delete('page');
    }, true);
  }

  function changeSort(nextSort: CustomerListSort): void {
    replaceParams((params) => {
      if (nextSort.field === 'registered') {
        params.delete('sort');
      } else {
        params.set('sort', nextSort.field);
      }
      if (nextSort.direction === 'desc') {
        params.delete('order');
      } else {
        params.set('order', nextSort.direction);
      }
      params.delete('page');
    }, true);
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

  const hasFilter =
    listParams.keyword.trim() !== '' ||
    listParams.status !== null ||
    listParams.source !== null ||
    listParams.from !== '' ||
    listParams.to !== '';
  let emptyMessage = '등록된 상담 고객이 없습니다.';
  if (hasFilter) {
    emptyMessage = '검색 결과가 없습니다.';
  } else if (listParams.view === 'favorites') {
    emptyMessage = '즐겨찾기한 고객이 없습니다.';
  }

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
        sort={listParams.sort}
        onSortChange={changeSort}
        onPageChange={changePage}
        onRowSelectionChange={setRowSelection}
        onOpenCustomer={openCustomer}
        onEditCustomer={setEditingCustomerId}
        onDeleteCustomer={setDeletingCustomer}
        pendingFavoriteId={favorite.isPending ? favorite.variables.customerId : ''}
        onToggleFavorite={(customerId, favorited) => {
          favorite.mutate({ customerId, favorited });
        }}
      />
    );
  }

  return (
    <div className="grid gap-5">
      <CustomerReminderSection onOpenCustomer={openCustomer} />
      <section className={`${pageSurface} grid gap-5 p-5`}>
        <h2 className="text-sm font-medium text-foreground">검색 조건</h2>
        <CustomerSearchForm
          key={`${listParams.field}:${listParams.keyword}:${listParams.from}:${listParams.to}`}
          values={listParams}
          onSearch={searchCustomers}
        />
        <CustomerStatusFilter status={listParams.status} onStatusChange={changeStatus} />
        <CustomerSourceFilter source={listParams.source} onSourceChange={changeSource} />
      </section>
      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="sr-only">상담 고객 목록</h2>
          <Tabs value={listParams.view} onValueChange={changeView}>
            <TabsList className="h-10">
              <TabsTrigger value="all" className="px-3">
                전체
              </TabsTrigger>
              <TabsTrigger value="favorites" className="px-3">
                즐겨찾기
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            <CustomerImportDialog />
            <Button
              type="button"
              size="lg"
              onClick={() => {
                setCreating(true);
              }}
            >
              상담등록
            </Button>
            <CustomerAssigneeBulkDialog
              customerIds={selectedCustomerIds(rowSelection)}
              onAssigned={() => {
                setRowSelection({});
              }}
            />
            <CustomerProfileDialog
              mode="create"
              open={creating}
              customer={null}
              onClose={() => {
                setCreating(false);
              }}
            />
          </div>
        </div>
        {filters.valid ? (
          listBody
        ) : (
          <p role="alert" className={pageAlert}>
            검색 조건이 올바르지 않습니다.
          </p>
        )}
      </section>
      <CustomerDetailDialog customerId={customerId} onClose={closeCustomer} />
      <CustomerListEditDialog
        customerId={editingCustomerId}
        onClose={() => {
          setEditingCustomerId('');
        }}
      />
      <CustomerDeleteDialog
        customer={deletingCustomer}
        onClose={() => {
          setDeletingCustomer(null);
        }}
        onDeleted={(deletedCustomerId) => {
          setRowSelection((current) =>
            Object.fromEntries(Object.entries(current).filter(([id]) => id !== deletedCustomerId)),
          );
          if (deletedCustomerId === customerId) {
            closeCustomer();
          }
          if (editingCustomerId === deletedCustomerId) {
            setEditingCustomerId('');
          }
          if (customers.data?.customers.length === 1 && listParams.page > 1) {
            changePage(listParams.page - 1);
          }
        }}
      />
    </div>
  );
}
