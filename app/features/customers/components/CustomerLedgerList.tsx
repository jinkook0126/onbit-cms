import { Badge } from '~/components/ui/badge';
import { Skeleton } from '~/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { RefundDialog } from '~/features/customers/components/RefundDialog';
import { useCustomerLedger } from '~/features/customers/hooks/useCustomerLedger';
import {
  customerFormError,
  ledgerEntryKindLabels,
  paymentMethodLabels,
} from '~/features/customers/type';
import { ApiError } from '~/lib/apiClient';

import type { JSX } from 'react';
import type { LedgerEntryKind } from '~/features/customers/type';

type CustomerLedgerListProps = {
  customerId: string;
};

const wonFormat = new Intl.NumberFormat('ko-KR');

const ledgerKindVariants: Record<LedgerEntryKind, 'default' | 'destructive'> = {
  PAYMENT: 'default',
  REFUND: 'destructive',
};

function formatWon(amount: number): string {
  return `${wonFormat.format(amount)}원`;
}

function ledgerListErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return customerFormError(error.body) ?? '거래 원장을 불러오지 못했습니다.';
  }
  return '거래 원장을 불러오지 못했습니다.';
}

export function CustomerLedgerList({ customerId }: CustomerLedgerListProps): JSX.Element {
  const ledger = useCustomerLedger(customerId);

  if (ledger.isPending) {
    return <Skeleton className="h-64 w-full" aria-hidden="true" />;
  }

  if (ledger.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {ledgerListErrorMessage(ledger.error)}
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex justify-end">
        <RefundDialog customerId={customerId} refundSources={ledger.data.refundSources} />
      </div>
      {ledger.data.entries.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <p className="text-sm font-medium text-foreground">거래 원장 영역</p>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">등록된 입금 내역이 없습니다.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-border">
          <Table className="table-fixed">
            <caption className="sr-only">거래 원장</caption>
            <TableHeader className="bg-muted">
              <TableRow className="border-border hover:bg-muted">
                <TableHead className="h-12 w-44 px-4 font-medium text-muted-foreground">
                  거래일
                </TableHead>
                <TableHead className="h-12 w-20 px-4 font-medium text-muted-foreground">구분</TableHead>
                <TableHead className="h-12 w-36 px-4 text-right font-medium text-muted-foreground">
                  금액
                </TableHead>
                <TableHead className="h-12 w-20 px-4 font-medium text-muted-foreground">수단</TableHead>
                <TableHead className="h-12 px-4 font-medium text-muted-foreground">사유</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.data.entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="px-4 py-3">
                    <time dateTime={entry.transactedOn}>{entry.transactedOn}</time>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge variant={ledgerKindVariants[entry.kind]}>
                      {ledgerEntryKindLabels[entry.kind]}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">{formatWon(entry.amount)}</TableCell>
                  <TableCell className="px-4 py-3">{paymentMethodLabels[entry.method]}</TableCell>
                  <TableCell className="px-4 py-3">{entry.reason ?? ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
