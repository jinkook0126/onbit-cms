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
import { ledgerEntryKindLabels, paymentMethodLabels } from '~/features/customers/type';
import { readQueryError } from '~/lib/formError';
import { formatWon } from '~/lib/money';
import { pageAlert, pageSurface } from '~/lib/styles';

import type { JSX } from 'react';
import type { LedgerEntryKind } from '~/features/customers/type';

type CustomerLedgerListProps = {
  customerId: string;
};

const ledgerKindVariants: Record<LedgerEntryKind, 'default' | 'destructive'> = {
  PAYMENT: 'default',
  REFUND: 'destructive',
};

export function CustomerLedgerList({ customerId }: CustomerLedgerListProps): JSX.Element {
  const ledger = useCustomerLedger(customerId);

  if (ledger.isPending) {
    return (
      <div className={`${pageSurface} p-5`} aria-hidden="true">
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (ledger.isError) {
    return (
      <p role="alert" className={pageAlert}>
        {readQueryError(ledger.error, '거래 원장을 불러오지 못했습니다.')}
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
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            등록된 입금 내역이 없습니다.
          </p>
        </div>
      ) : (
        <div className={`${pageSurface} overflow-hidden`}>
          <Table className="table-fixed">
            <caption className="sr-only">거래 원장</caption>
            <TableHeader>
              <TableRow className="border-border hover:bg-card">
                <TableHead className="h-12 w-44 px-4 font-medium text-foreground">거래일</TableHead>
                <TableHead className="h-12 w-20 px-4 font-medium text-foreground">구분</TableHead>
                <TableHead className="h-12 w-36 px-4 text-right font-medium text-foreground">
                  금액
                </TableHead>
                <TableHead className="h-12 w-20 px-4 font-medium text-foreground">수단</TableHead>
                <TableHead className="h-12 px-4 font-medium text-foreground">사유</TableHead>
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
