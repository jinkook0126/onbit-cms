import {
  createColumnHelper,
  rowPaginationFeature,
  rowSelectionFeature,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import { Link, useNavigate } from 'react-router';

import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import {
  CUSTOMER_PAGE_SIZE,
  consultationStatusLabels,
  customerConsultationTab,
  formatCustomerPhone,
  inflowSourceLabels,
} from '~/features/customers/type';
import { focusRing } from '~/lib/styles';
import { cn } from '~/lib/utils';

import type { PaginationState, Updater } from '@tanstack/react-table';
import type { JSX, MouseEvent } from 'react';
import type { ConsultationStatus, CustomerListItem } from '~/features/customers/type';

type CustomerDataTableProps = {
  customers: CustomerListItem[];
  total: number;
  page: number;
  isFetching: boolean;
  emptyMessage: string;
  onPageChange: (page: number) => void;
};

const features = tableFeatures({ rowPaginationFeature, rowSelectionFeature });
const columnHelper = createColumnHelper<typeof features, CustomerListItem>();
const emptyCustomers: CustomerListItem[] = [];

const statusVariants: Record<
  ConsultationStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  IN_CONSULTATION: 'default',
  CONSIDERING: 'secondary',
  ABSENT: 'outline',
  REJECTED: 'destructive',
  RETAINED: 'default',
};

function UnassignedBadge(): JSX.Element {
  return <Badge variant="outline">미정</Badge>;
}

function formatContactDate(value: string): string {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) {
    return value;
  }
  return `${year}. ${month}. ${day}.`;
}

function pageSelectionChecked(
  allSelected: boolean,
  someSelected: boolean,
): boolean | 'indeterminate' {
  if (allSelected) {
    return true;
  }
  if (someSelected) {
    return 'indeterminate';
  }
  return false;
}

function customerColumnClassName(columnId: string): string | undefined {
  if (columnId === 'select') {
    return 'w-12';
  }
  if (columnId === 'status') {
    return 'text-center';
  }
  return undefined;
}

function stopRowNavigation(event: { stopPropagation: () => void }): void {
  event.stopPropagation();
}

function customerConsultationPath(customerId: string): string {
  return `/customers/${customerId}?tab=${customerConsultationTab}`;
}

const customerColumns = columnHelper.columns([
  columnHelper.display({
    id: 'select',
    header: (context) => (
      <Checkbox
        aria-label="현재 페이지 전체 선택"
        checked={pageSelectionChecked(
          context.table.getIsAllPageRowsSelected(),
          context.table.getIsSomePageRowsSelected(),
        )}
        disabled={context.table.getRowModel().rows.length === 0}
        onCheckedChange={(checked) => {
          context.table.toggleAllPageRowsSelected(checked === true);
        }}
        onClick={stopRowNavigation}
      />
    ),
    cell: (context) => (
      <Checkbox
        aria-label={`${context.row.original.name} 선택`}
        checked={context.row.getIsSelected()}
        onCheckedChange={(checked) => {
          context.row.toggleSelected(checked === true);
        }}
        onClick={stopRowNavigation}
      />
    ),
  }),
  columnHelper.accessor('name', {
    header: '고객이름',
    cell: (context) => (
      <Link
        to={customerConsultationPath(context.row.original.id)}
        className={cn('rounded-sm text-foreground', focusRing)}
      >
        {context.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor('phone', {
    header: '연락처',
    cell: (context) => formatCustomerPhone(context.getValue()),
  }),
  columnHelper.accessor('source', {
    header: '유입처',
    cell: (context) => inflowSourceLabels[context.getValue()],
  }),
  columnHelper.accessor('assigneeName', {
    header: '담당',
    cell: (context) => {
      const name = context.getValue();
      if (!name) {
        return <UnassignedBadge />;
      }
      return name;
    },
  }),
  columnHelper.accessor('status', {
    header: '상담상태',
    cell: (context) => {
      const status = context.getValue();
      return <Badge variant={statusVariants[status]}>{consultationStatusLabels[status]}</Badge>;
    },
  }),
  columnHelper.accessor('nextContactOn', {
    header: '다음 연락',
    cell: (context) => {
      const value = context.getValue();
      if (!value) {
        return <UnassignedBadge />;
      }
      return formatContactDate(value);
    },
  }),
]);

export function CustomerDataTable({
  customers,
  total,
  page,
  isFetching,
  emptyMessage,
  onPageChange,
}: CustomerDataTableProps): JSX.Element {
  const navigate = useNavigate();
  const pageCount = Math.max(1, Math.ceil(total / CUSTOMER_PAGE_SIZE));

  function openCustomer(customerId: string, event: MouseEvent<HTMLTableRowElement>): void {
    if (event.target instanceof Element && event.target.closest('a, button, [role="checkbox"]')) {
      return;
    }
    void navigate(customerConsultationPath(customerId));
  }
  const table = useTable(
    {
      features,
      columns: customerColumns,
      data: customers.length === 0 ? emptyCustomers : customers,
      getRowId: (row) => row.id,
      rowCount: total,
      manualPagination: true,
      autoResetPageIndex: false,
      state: {
        pagination: { pageIndex: page - 1, pageSize: CUSTOMER_PAGE_SIZE },
      },
      onPaginationChange: (updater: Updater<PaginationState>) => {
        const current = { pageIndex: page - 1, pageSize: CUSTOMER_PAGE_SIZE };
        const next = typeof updater === 'function' ? updater(current) : updater;
        onPageChange(next.pageIndex + 1);
      },
    },
    (state) => ({ pagination: state.pagination, rowSelection: state.rowSelection }),
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
                    className={cn('font-semibold', customerColumnClassName(header.column.id))}
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
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  className="cursor-pointer"
                  onClick={(event) => {
                    openCustomer(row.original.id, event);
                  }}
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id} className={customerColumnClassName(cell.column.id)}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={customerColumns.length}
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
