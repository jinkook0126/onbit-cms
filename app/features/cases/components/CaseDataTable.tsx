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
import { CASE_PAGE_SIZE } from '~/features/cases/type';
import {
  caseProgressStageLabels,
  caseTypeLabels,
  customerCaseProgressTab,
} from '~/features/customers/type';
import { focusRing } from '~/lib/styles';
import { cn } from '~/lib/utils';

import type { PaginationState, Updater } from '@tanstack/react-table';
import type { JSX, MouseEvent } from 'react';
import type { CaseListItem } from '~/features/cases/type';

type CaseDataTableProps = {
  cases: CaseListItem[];
  total: number;
  page: number;
  isFetching: boolean;
  emptyMessage: string;
  onPageChange: (page: number) => void;
};

const features = tableFeatures({ rowPaginationFeature });
const columnHelper = createColumnHelper<typeof features, CaseListItem>();
const emptyCases: CaseListItem[] = [];

function UnsetBadge(): JSX.Element {
  return <Badge variant="outline">미정</Badge>;
}

function formatTaskDue(value: string): string {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) {
    return value;
  }
  return `${year}. ${month}. ${day}.`;
}

function customerCasePath(customerId: string): string {
  return `/customers/${customerId}?tab=${customerCaseProgressTab}`;
}

const caseColumns = columnHelper.columns([
  columnHelper.accessor('customerName', {
    header: '고객이름',
    cell: (context) => (
      <Link
        to={customerCasePath(context.row.original.customerId)}
        className={cn('rounded-sm text-foreground', focusRing)}
      >
        {context.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor('caseType', {
    header: '제도',
    cell: (context) => caseTypeLabels[context.getValue()],
  }),
  columnHelper.accessor('stage', {
    header: '진행단계',
    cell: (context) => caseProgressStageLabels[context.getValue()],
  }),
  columnHelper.accessor('assigneeName', {
    header: '담당',
    cell: (context) => {
      const name = context.getValue();
      if (!name) {
        return <UnsetBadge />;
      }
      return name;
    },
  }),
  columnHelper.accessor('nextTask', {
    header: '다음 할 일',
    cell: (context) => <span className="break-words">{context.getValue()}</span>,
  }),
  columnHelper.accessor('taskDueOn', {
    header: '업무 기한',
    cell: (context) => {
      const value = context.getValue();
      if (!value) {
        return <UnsetBadge />;
      }
      return formatTaskDue(value);
    },
  }),
]);

export function CaseDataTable({
  cases,
  total,
  page,
  isFetching,
  emptyMessage,
  onPageChange,
}: CaseDataTableProps): JSX.Element {
  const navigate = useNavigate();
  const pageCount = Math.max(1, Math.ceil(total / CASE_PAGE_SIZE));

  function openCustomer(customerId: string, event: MouseEvent<HTMLTableRowElement>): void {
    if (event.target instanceof Element && event.target.closest('a, button')) {
      return;
    }
    void navigate(customerCasePath(customerId));
  }

  const table = useTable(
    {
      features,
      columns: caseColumns,
      data: cases.length === 0 ? emptyCases : cases,
      getRowId: (row) => row.customerId,
      rowCount: total,
      manualPagination: true,
      autoResetPageIndex: false,
      state: {
        pagination: { pageIndex: page - 1, pageSize: CASE_PAGE_SIZE },
      },
      onPaginationChange: (updater: Updater<PaginationState>) => {
        const current = { pageIndex: page - 1, pageSize: CASE_PAGE_SIZE };
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
                  <TableHead key={header.id} className="font-semibold">
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
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={caseColumns.length}
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
