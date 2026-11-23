import {
  createColumnHelper,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router';

import { Button } from '~/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { installmentScheduleLabel } from '~/features/customers/type';
import { ReceivableStatusBadge } from '~/features/receivables/components/ReceivableStatusBadge';
import { RECEIVABLE_PAGE_SIZE, receivableDetailPath } from '~/features/receivables/type';
import { formatWon } from '~/lib/money';
import { focusRing, pageSurface } from '~/lib/styles';
import { cn } from '~/lib/utils';

import type { PaginationState, SortingState, Updater } from '@tanstack/react-table';
import type { JSX, MouseEvent } from 'react';
import type { ReceivableListItem, ReceivableSort } from '~/features/receivables/type';

type ReceivableDataTableProps = {
  receivables: ReceivableListItem[];
  total: number;
  page: number;
  isFetching: boolean;
  emptyMessage: string;
  sort: ReceivableSort;
  onSortChange: (sort: ReceivableSort) => void;
  onPageChange: (page: number) => void;
};

const features = tableFeatures({ rowPaginationFeature, rowSortingFeature });
const columnHelper = createColumnHelper<typeof features, ReceivableListItem>();
const emptyReceivables: ReceivableListItem[] = [];
const amountColumnIds = new Set(['scheduledAmount', 'remainingAmount']);

const receivableColumns = columnHelper.columns([
  columnHelper.accessor('customerName', {
    header: '고객이름',
    enableSorting: false,
    cell: (context) => (
      <Link
        to={receivableDetailPath(context.row.original.customerId)}
        className={cn('rounded-sm text-foreground', focusRing)}
      >
        {context.getValue()}
      </Link>
    ),
  }),
  columnHelper.display({
    id: 'schedule',
    header: '회차',
    enableSorting: false,
    cell: (context) => installmentScheduleLabel(context.row.original),
  }),
  columnHelper.accessor('promisedOn', {
    header: (context) => {
      const sorted = context.column.getIsSorted();
      const oldestFirst = sorted === 'asc';
      return (
        <button
          type="button"
          className={cn('inline-flex items-center gap-1 rounded-sm', focusRing)}
          aria-label={
            oldestFirst
              ? '약속일 오래된순. 최신순으로 바꾸기'
              : '약속일 최신순. 오래된순으로 바꾸기'
          }
          onClick={context.column.getToggleSortingHandler()}
        >
          약속일
          {oldestFirst ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />}
        </button>
      );
    },
    cell: (context) => <time dateTime={context.getValue()}>{context.getValue()}</time>,
    enableSorting: true,
    sortDescFirst: true,
  }),
  columnHelper.accessor('scheduledAmount', {
    header: '예정금액',
    enableSorting: false,
    cell: (context) => formatWon(context.getValue()),
  }),
  columnHelper.accessor('remainingAmount', {
    header: '남은금액',
    enableSorting: false,
    cell: (context) => {
      const amount = context.getValue();
      return (
        <span
          className={context.row.original.status === 'OVERDUE' ? 'text-destructive' : undefined}
        >
          {formatWon(amount)}
        </span>
      );
    },
  }),
  columnHelper.accessor('status', {
    header: '상태',
    enableSorting: false,
    cell: (context) => <ReceivableStatusBadge status={context.getValue()} />,
  }),
]);

export function ReceivableDataTable({
  receivables,
  total,
  page,
  isFetching,
  emptyMessage,
  sort,
  onSortChange,
  onPageChange,
}: ReceivableDataTableProps): JSX.Element {
  const navigate = useNavigate();
  const pageCount = Math.max(1, Math.ceil(total / RECEIVABLE_PAGE_SIZE));

  function openCustomer(customerId: string, event: MouseEvent<HTMLTableRowElement>): void {
    if (event.target instanceof Element && event.target.closest('a, button')) {
      return;
    }
    void navigate(receivableDetailPath(customerId));
  }

  const table = useTable(
    {
      features,
      columns: receivableColumns,
      data: receivables.length === 0 ? emptyReceivables : receivables,
      getRowId: (row) => row.id,
      rowCount: total,
      manualPagination: true,
      manualSorting: true,
      enableSortingRemoval: false,
      enableMultiSort: false,
      autoResetPageIndex: false,
      autoResetSorting: false,
      state: {
        pagination: { pageIndex: page - 1, pageSize: RECEIVABLE_PAGE_SIZE },
        sorting: [{ id: 'promisedOn', desc: sort === 'desc' }],
      },
      onSortingChange: (updater: Updater<SortingState>) => {
        const current: SortingState = [{ id: 'promisedOn', desc: sort === 'desc' }];
        const next = typeof updater === 'function' ? updater(current) : updater;
        const promisedOn = next.find((item) => item.id === 'promisedOn');
        onSortChange(promisedOn?.desc === false ? 'asc' : 'desc');
      },
      onPaginationChange: (updater: Updater<PaginationState>) => {
        const current = { pageIndex: page - 1, pageSize: RECEIVABLE_PAGE_SIZE };
        const next = typeof updater === 'function' ? updater(current) : updater;
        onPageChange(next.pageIndex + 1);
      },
    },
    (state) => ({ pagination: state.pagination, sorting: state.sorting }),
  );

  return (
    <div className={`${pageSurface} overflow-hidden`} aria-busy={isFetching}>
      <div className="min-h-80">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-border hover:bg-card">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      'font-semibold',
                      amountColumnIds.has(header.column.id) && 'text-right',
                    )}
                  >
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={(event) => {
                    openCustomer(row.original.customerId, event);
                  }}
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={amountColumnIds.has(cell.column.id) ? 'text-right' : undefined}
                    >
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={receivableColumns.length}
                  className="h-64 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
        <p className="text-sm text-muted-foreground">총 {total}건</p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isFetching || !table.getCanPreviousPage()}
            onClick={() => {
              table.previousPage();
            }}
          >
            이전
          </Button>
          <span className="text-sm text-foreground">
            {page} / {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isFetching || !table.getCanNextPage()}
            onClick={() => {
              table.nextPage();
            }}
          >
            다음
          </Button>
        </div>
      </div>
    </div>
  );
}
