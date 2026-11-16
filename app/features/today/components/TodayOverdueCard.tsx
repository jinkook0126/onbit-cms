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
import { CustomerLink } from '~/features/today/components/TodayWorkLists';

import type { JSX } from 'react';
import type { TodayOverdueInstallment } from '~/features/today/type';

type TodayOverdueCardProps = {
  installments: TodayOverdueInstallment[];
};

const wonFormat = new Intl.NumberFormat('ko-KR');

function formatWon(amount: number): string {
  return `${wonFormat.format(amount)}원`;
}

export function TodayOverdueCard({ installments }: TodayOverdueCardProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>분납 확인</CardTitle>
      </CardHeader>
      <CardContent>
        {installments.length === 0 ? (
          <p className="text-sm text-muted-foreground">연체된 분납이 없습니다.</p>
        ) : (
          <Table>
            <caption className="sr-only">분납 확인</caption>
            <TableHeader>
              <TableRow>
                <TableHead className="h-10 px-0 font-medium text-muted-foreground">고객</TableHead>
                <TableHead className="h-10 px-4 font-medium text-muted-foreground">회차</TableHead>
                <TableHead className="h-10 px-4 font-medium text-muted-foreground">담당</TableHead>
                <TableHead className="h-10 px-4 font-medium text-muted-foreground">
                  약속일
                </TableHead>
                <TableHead className="h-10 px-4 text-right font-medium text-muted-foreground">
                  예정금액
                </TableHead>
                <TableHead className="h-10 px-0 text-right font-medium text-muted-foreground">
                  남은금액
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {installments.map((installment) => (
                <TableRow key={installment.id}>
                  <TableCell className="px-0 py-3">
                    <CustomerLink
                      customerId={installment.customerId}
                      tab={customerInstallmentTab}
                      name={installment.customerName}
                    />
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {installmentScheduleLabel(installment)}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {installment.assigneeName ?? <Badge variant="outline">미정</Badge>}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <time dateTime={installment.promisedOn}>{installment.promisedOn}</time>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    {formatWon(installment.scheduledAmount)}
                  </TableCell>
                  <TableCell className="px-0 py-3 text-right text-destructive">
                    {formatWon(installment.remainingAmount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
