import { useState } from 'react';

import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { InstallmentPaymentDialog } from '~/features/customers/components/InstallmentPaymentDialog';
import { InstallmentPromiseDialog } from '~/features/customers/components/InstallmentPromiseDialog';
import { useCustomerInstallments } from '~/features/customers/hooks/useCustomerInstallments';
import { customerFormError, installmentScheduleLabel } from '~/features/customers/type';
import { ApiError } from '~/lib/apiClient';

import type { JSX } from 'react';
import type { InstallmentListItem } from '~/features/customers/type';

type CustomerInstallmentListProps = {
  customerId: string;
};

const wonFormat = new Intl.NumberFormat('ko-KR');

function formatWon(amount: number): string {
  return `${wonFormat.format(amount)}원`;
}

function installmentListErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return customerFormError(error.body) ?? '분납 일정을 불러오지 못했습니다.';
  }
  return '분납 일정을 불러오지 못했습니다.';
}

export function CustomerInstallmentList({
  customerId,
}: CustomerInstallmentListProps): JSX.Element {
  const installments = useCustomerInstallments(customerId);
  const [editing, setEditing] = useState<InstallmentListItem | null>(null);

  if (installments.isPending) {
    return <Skeleton className="h-64 w-full" aria-hidden="true" />;
  }

  if (installments.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {installmentListErrorMessage(installments.error)}
      </p>
    );
  }

  if (installments.data.installments.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
        <p className="text-sm font-medium text-foreground">분납 내역 영역</p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">등록된 분납 일정이 없습니다.</p>
      </div>
    );
  }

  const editingLabel = editing ? installmentScheduleLabel(editing) : '';

  return (
    <div className="grid gap-3">
      <div className="flex justify-end">
        <InstallmentPaymentDialog
          customerId={customerId}
          installments={installments.data.installments}
        />
      </div>
      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-border">
      <Table>
        <caption className="sr-only">분납 내역</caption>
        <TableHeader className="bg-muted">
          <TableRow className="border-border hover:bg-muted">
            <TableHead className="h-12 px-4 font-medium text-muted-foreground">회차</TableHead>
            <TableHead className="h-12 px-4 font-medium text-muted-foreground">약속일</TableHead>
            <TableHead className="h-12 px-4 text-right font-medium text-muted-foreground">
              예정액
            </TableHead>
            <TableHead className="h-12 px-4 text-right font-medium text-muted-foreground">
              수납액
            </TableHead>
            <TableHead className="h-12 px-4 text-right font-medium text-muted-foreground">
              미납액
            </TableHead>
            <TableHead className="h-12 px-4 text-right font-medium text-muted-foreground">
              약속 변경
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {installments.data.installments.map((installment) => {
            const label = installmentScheduleLabel(installment);
            const paid = installment.receivedAmount >= installment.scheduledAmount;
            const unpaid = Math.max(installment.scheduledAmount - installment.receivedAmount, 0);
            return (
              <TableRow key={installment.id}>
                <TableCell className="px-4 py-3">{label}</TableCell>
                <TableCell className="px-4 py-3">
                  <time dateTime={installment.promisedOn}>{installment.promisedOn}</time>
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
                  {formatWon(installment.scheduledAmount)}
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
                  {formatWon(installment.receivedAmount)}
                </TableCell>
                <TableCell className="px-4 py-3 text-right">{formatWon(unpaid)}</TableCell>
                <TableCell className="px-4 py-3 text-right">
                  {paid ? (
                    <Badge>완납</Badge>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`${label} 약속일 변경`}
                      onClick={() => {
                        setEditing(installment);
                      }}
                    >
                      변경
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {editing ? (
        <InstallmentPromiseDialog
          key={editing.id}
          customerId={customerId}
          installment={editing}
          label={editingLabel}
          onClose={() => {
            setEditing(null);
          }}
        />
      ) : null}
      </div>
    </div>
  );
}
