import { Badge } from '~/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { ledgerEntryKindLabels, paymentMethodLabels } from '~/features/customers/type';

import type { JSX } from 'react';
import type { LedgerEntryKind } from '~/features/customers/type';
import type { SettlementEntry } from '~/features/settlements/type';

type SettlementEntryListProps = {
  entries: SettlementEntry[];
};

const wonFormat = new Intl.NumberFormat('ko-KR');

const ledgerKindVariants: Record<LedgerEntryKind, 'default' | 'destructive'> = {
  PAYMENT: 'default',
  REFUND: 'destructive',
};

function formatWon(amount: number): string {
  return `${wonFormat.format(amount)}원`;
}

export function SettlementEntryList({ entries }: SettlementEntryListProps): JSX.Element {
  if (entries.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
        <p className="text-sm font-medium text-foreground">거래 내역</p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">이 달에 거래가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-border">
      <Table>
        <caption className="sr-only">월별 정산 목록</caption>
        <TableHeader className="bg-muted">
          <TableRow className="border-border hover:bg-muted">
            <TableHead className="h-12 px-4 font-medium text-muted-foreground">거래일</TableHead>
            <TableHead className="h-12 px-4 font-medium text-muted-foreground">고객</TableHead>
            <TableHead className="h-12 px-4 font-medium text-muted-foreground">구분</TableHead>
            <TableHead className="h-12 px-4 text-right font-medium text-muted-foreground">
              금액
            </TableHead>
            <TableHead className="h-12 px-4 font-medium text-muted-foreground">담당</TableHead>
            <TableHead className="h-12 px-4 font-medium text-muted-foreground">수단</TableHead>
            <TableHead className="h-12 px-4 font-medium text-muted-foreground">사유</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="px-4 py-3">
                <time dateTime={entry.transactedOn}>{entry.transactedOn}</time>
              </TableCell>
              <TableCell className="px-4 py-3">{entry.customerName}</TableCell>
              <TableCell className="px-4 py-3">
                <Badge variant={ledgerKindVariants[entry.kind]}>
                  {ledgerEntryKindLabels[entry.kind]}
                </Badge>
              </TableCell>
              <TableCell className="px-4 py-3 text-right">{formatWon(entry.amount)}</TableCell>
              <TableCell className="px-4 py-3">
                {entry.assigneeName ?? <Badge variant="outline">미정</Badge>}
              </TableCell>
              <TableCell className="px-4 py-3">{paymentMethodLabels[entry.method]}</TableCell>
              <TableCell className="px-4 py-3">{entry.reason ?? ''}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
