import {
  createColumnHelper,
  rowPaginationFeature,
  rowSelectionFeature,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';

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
  caseTypeLabels,
  consultationStatusBadgeVariants,
  consultationStatusLabels,
  formatCustomerPhone,
  inflowSourceLabels,
} from '~/features/customers/type';
import { focusRing, pageSurface } from '~/lib/styles';
import { cn } from '~/lib/utils';

import type { PaginationState, RowSelectionState, Updater } from '@tanstack/react-table';
import type { JSX, MouseEvent } from 'react';
import type { CustomerListItem } from '~/features/customers/type';

type CustomerDataTableProps = {
  customers: CustomerListItem[];
  total: number;
  page: number;
  isFetching: boolean;
  emptyMessage: string;
  rowSelection: RowSelectionState;
  onPageChange: (page: number) => void;
  onRowSelectionChange: (selection: RowSelectionState) => void;
  onOpenCustomer: (customerId: string) => void;
  onEditCustomer: (customerId: string) => void;
  onDeleteCustomer: (customer: { id: string; name: string }) => void;
};

const features = tableFeatures({ rowPaginationFeature, rowSelectionFeature });
const columnHelper = createColumnHelper<typeof features, CustomerListItem>();
const emptyCustomers: CustomerListItem[] = [];

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
  if (columnId === 'latestConsultation') {
    return 'max-w-56';
  }
  if (columnId === 'actions') {
    return 'w-36';
  }
  return undefined;
}

function DateCell({ value }: { value: string | null }): JSX.Element | string {
  if (!value) {
    return <UnassignedBadge />;
  }
  return formatContactDate(value);
}

function stopRowNavigation(event: { stopPropagation: () => void }): void {
  event.stopPropagation();
}

function createCustomerColumns(
  onOpenCustomer: (customerId: string) => void,
  onEditCustomer: (customerId: string) => void,
  onDeleteCustomer: (customer: { id: string; name: string }) => void,
) {
  return columnHelper.columns([
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
      <button
        type="button"
        className={cn('rounded-sm text-foreground', focusRing)}
        onClick={(event) => {
          event.stopPropagation();
          onOpenCustomer(context.row.original.id);
        }}
      >
        {context.getValue()}
      </button>
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
      return (
        <Badge variant={consultationStatusBadgeVariants[status]}>
          {consultationStatusLabels[status]}
        </Badge>
      );
    },
  }),
  columnHelper.accessor('firstProcessedOn', {
    header: 'DB 최초 처리일',
    cell: (context) => <DateCell value={context.getValue()} />,
  }),
  columnHelper.accessor('registeredOn', {
    header: '등록날짜',
    cell: (context) => <DateCell value={context.getValue()} />,
  }),
  columnHelper.accessor('contractedOn', {
    header: '수임날짜',
    cell: (context) => <DateCell value={context.getValue()} />,
  }),
  columnHelper.accessor('caseType', {
    header: '사건유형',
    cell: (context) => {
      const caseType = context.getValue();
      if (!caseType) {
        return <UnassignedBadge />;
      }
      return caseTypeLabels[caseType];
    },
  }),
  columnHelper.accessor('nextContactOn', {
    header: '다음 상담일',
    cell: (context) => <DateCell value={context.getValue()} />,
  }),
  columnHelper.accessor('latestConsultation', {
    header: '상담이력',
    cell: (context) => {
      const content = context.getValue();
      if (!content) {
        return <UnassignedBadge />;
      }
      return (
        <span className="line-clamp-2 whitespace-normal" title={content}>
          {content}
        </span>
      );
    },
  }),
  columnHelper.display({
    id: 'actions',
    header: '관리',
    cell: (context) => (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            onEditCustomer(context.row.original.id);
          }}
        >
          수정
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            onDeleteCustomer({
              id: context.row.original.id,
              name: context.row.original.name,
            });
          }}
        >
          삭제
        </Button>
      </div>
    ),
  }),
  ]);
}

export function CustomerDataTable({
  customers,
  total,
  page,
  isFetching,
  emptyMessage,
  rowSelection,
  onPageChange,
  onRowSelectionChange,
  onOpenCustomer,
  onEditCustomer,
  onDeleteCustomer,
}: CustomerDataTableProps): JSX.Element {
  const pageCount = Math.max(1, Math.ceil(total / CUSTOMER_PAGE_SIZE));
  const columns = createCustomerColumns(onOpenCustomer, onEditCustomer, onDeleteCustomer);

  function openCustomer(customerId: string, event: MouseEvent<HTMLTableRowElement>): void {
    if (event.target instanceof Element && event.target.closest('a, button, [role="checkbox"]')) {
      return;
    }
    onOpenCustomer(customerId);
  }
  const table = useTable(
    {
      features,
      columns,
      data: customers.length === 0 ? emptyCustomers : customers,
      getRowId: (row) => row.id,
      rowCount: total,
      manualPagination: true,
      autoResetPageIndex: false,
      state: {
        pagination: { pageIndex: page - 1, pageSize: CUSTOMER_PAGE_SIZE },
        rowSelection,
      },
      onRowSelectionChange: (updater: Updater<RowSelectionState>) => {
        onRowSelectionChange(typeof updater === 'function' ? updater(rowSelection) : updater);
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
    <div className={`${pageSurface} overflow-hidden`} aria-busy={isFetching}>
      <div className="min-h-80">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-border hover:bg-card">
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
                  colSpan={columns.length}
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
