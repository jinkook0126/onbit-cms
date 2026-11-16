import {
  createColumnHelper,
  rowPaginationFeature,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import { Link, useNavigate } from 'react-router';

import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { customerInstallmentTab, installmentScheduleLabel } from '~/features/customers/type';
import { RECEIVABLE_PAGE_SIZE, receivableStatusLabels } from '~/features/receivables/type';
import { focusRing } from '~/lib/styles';
import { cn } from '~/lib/utils';

import type { PaginationState, Updater } from '@tanstack/react-table';
import type { JSX, MouseEvent } from 'react';
import type { ReceivableListItem, ReceivableStatus } from '~/features/receivables/type';

type ReceivableDataTableProps = {
  receivables: ReceivableListItem[];
  total: number;
  page: number;
  isFetching: boolean;
  emptyMessage: string;
  onPageChange: (page: number) => void;
};

const features = tableFeatures({ rowPaginationFeature });
const columnHelper = createColumnHelper<typeof features, ReceivableListItem>();
const emptyReceivables: ReceivableListItem[] = [];
const wonFormat = new Intl.NumberFormat('ko-KR');
const amountColumnIds = new Set(['scheduledAmount', 'remainingAmount']);

const statusVariants: Record<ReceivableStatus, 'default' | 'destructive' | 'secondary'> = {
  PAID: 'default',
  OVERDUE: 'destructive',
  SCHEDULED: 'secondary',
};

function formatWon(amount: number): string {
  return `${wonFormat.format(amount)}원`;
}

function customerInstallmentPath(customerId: string): string {
  return `/customers/${customerId}?tab=${customerInstallmentTab}`;
}

const receivableColumns = columnHelper.columns([
  columnHelper.accessor('customerName', {
    header: '고객이름',
    cell: (context) => (
      <Link
        to={customerInstallmentPath(context.row.original.customerId)}
        className={cn('rounded-sm text-foreground', focusRing)}
      >
        {context.getValue()}
      </Link>
    ),
  }),
  columnHelper.display({
    id: 'schedule',
    header: '회차',
    cell: (context) => installmentScheduleLabel(context.row.original),
  }),
  columnHelper.accessor('promisedOn', {
    header: '약속일',
    cell: (context) => <time dateTime={context.getValue()}>{context.getValue()}</time>,
  }),
  columnHelper.accessor('scheduledAmount', {
    header: '예정금액',
    cell: (context) => formatWon(context.getValue()),
  }),
  columnHelper.accessor('remainingAmount', {
    header: '남은금액',
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
    cell: (context) => {
      const status = context.getValue();
      return <Badge variant={statusVariants[status]}>{receivableStatusLabels[status]}</Badge>;
    },
  }),
]);

export function ReceivableDataTable({
  receivables,
  total,
  page,
  isFetching,
  emptyMessage,
  onPageChange,
}: ReceivableDataTableProps): JSX.Element {
  const navigate = useNavigate();
  const pageCount = Math.max(1, Math.ceil(total / RECEIVABLE_PAGE_SIZE));

  function openCustomer(customerId: string, event: MouseEvent<HTMLTableRowElement>): void {
    if (event.target instanceof Element && event.target.closest('a, button')) {
      return;
    }
    void navigate(customerInstallmentPath(customerId));
  }

  const table = useTable(
    {
      features,
      columns: receivableColumns,
      data: receivables.length === 0 ? emptyReceivables : receivables,
      getRowId: (row) => row.id,
      rowCount: total,
      manualPagination: true,
      autoResetPageIndex: false,
      state: {
        pagination: { pageIndex: page - 1, pageSize: RECEIVABLE_PAGE_SIZE },
      },
      onPaginationChange: (updater: Updater<PaginationState>) => {
        const current = { pageIndex: page - 1, pageSize: RECEIVABLE_PAGE_SIZE };
        const next = typeof updater === 'function' ? updater(current) : updater;
        onPageChange(next.pageIndex + 1);
      },
    },
    (state) => ({ pagination: state.pagination }),
  );

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-border" aria-busy={isFetching}>
      <div className="min-h-80">
        <Table>
          <TableHeader className="bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-border hover:bg-muted">
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
