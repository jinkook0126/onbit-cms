import { useNavigate } from 'react-router';

import { Badge } from '~/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { customerInstallmentTab, installmentScheduleLabel } from '~/features/customers/type';
import { CustomerLink, TodayEmptyState } from '~/features/today/components/TodayWorkLists';
import { formatWon } from '~/lib/money';
import { cn } from '~/lib/utils';

import type { JSX, MouseEvent } from 'react';
import type { TodayOverdueInstallment } from '~/features/today/type';

type TodayOverdueCardProps = {
  installments: TodayOverdueInstallment[];
};

const labelCell = 'h-auto px-5 py-3 text-left text-sm font-medium text-foreground';
const valueCell = 'truncate px-5 py-3.5 text-left align-middle';
const amountCell = 'px-5 py-3.5 text-right align-middle whitespace-nowrap tabular-nums';

function installmentPath(customerId: string): string {
  return `/customers/${customerId}?tab=${customerInstallmentTab}`;
}

export function TodayOverdueCard({ installments }: TodayOverdueCardProps): JSX.Element {
  const navigate = useNavigate();

  function openInstallments(customerId: string, event: MouseEvent<HTMLTableRowElement>): void {
    if (event.target instanceof Element && event.target.closest('a, button')) {
      return;
    }
    void navigate(installmentPath(customerId));
  }
  let body = (
    <div className="px-5 pt-2 pb-5">
      <TodayEmptyState message="연체된 분납이 없습니다." />
    </div>
  );
  if (installments.length > 0) {
    body = (
      <Table className="table-fixed">
        <caption className="sr-only">분납 확인</caption>
        <colgroup>
          <col className="w-[22%]" />
          <col className="w-[12%]" />
          <col className="w-[16%]" />
          <col className="w-[16%]" />
          <col className="w-[17%]" />
          <col className="w-[17%]" />
        </colgroup>
        <TableHeader>
          <TableRow className="border-border hover:bg-card">
            <TableHead className={labelCell}>고객</TableHead>
            <TableHead className={labelCell}>회차</TableHead>
            <TableHead className={labelCell}>담당</TableHead>
            <TableHead className={labelCell}>약속일</TableHead>
            <TableHead className={cn(labelCell, 'text-right')}>예정금액</TableHead>
            <TableHead className={cn(labelCell, 'text-right')}>남은금액</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {installments.map((installment) => (
            <TableRow
              key={installment.id}
              className="cursor-pointer border-border/70"
              onClick={(event) => {
                openInstallments(installment.customerId, event);
              }}
            >
              <TableCell className="px-5 py-3.5 text-left align-middle">
                <CustomerLink
                  customerId={installment.customerId}
                  tab={customerInstallmentTab}
                  name={installment.customerName}
                  className="block truncate"
                />
              </TableCell>
              <TableCell className={valueCell}>{installmentScheduleLabel(installment)}</TableCell>
              <TableCell className={valueCell}>
                {installment.assigneeName ?? <Badge variant="outline">미정</Badge>}
              </TableCell>
              <TableCell className={valueCell}>
                <time dateTime={installment.promisedOn}>{installment.promisedOn}</time>
              </TableCell>
              <TableCell className={amountCell}>{formatWon(installment.scheduledAmount)}</TableCell>
              <TableCell className={cn(amountCell, 'font-medium text-destructive')}>
                {formatWon(installment.remainingAmount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <Card className="gap-0 py-0 shadow-none">
      <CardHeader className="px-5 pt-5 pb-1">
        <CardTitle>분납 확인</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-2">{body}</CardContent>
    </Card>
  );
}
