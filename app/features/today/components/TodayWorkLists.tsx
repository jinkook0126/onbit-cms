import { Link, useNavigate } from 'react-router';

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
import { caseTypeLabels, installmentScheduleLabel } from '~/features/customers/type';
import { todayDepositCategoryLabels } from '~/features/today/type';
import { formatWon } from '~/lib/money';
import { focusRing } from '~/lib/styles';
import { cn } from '~/lib/utils';

import type { JSX, MouseEvent } from 'react';
import type {
  TodayDeposit,
  TodayOverdueCustomer,
  TodayUpcomingPayment,
} from '~/features/today/type';

type TodayWorkListsProps = {
  deposits: TodayDeposit[];
  overdueCustomers: TodayOverdueCustomer[];
  upcomingPayments: TodayUpcomingPayment[];
};

const workListCard = 'h-168 max-h-168 min-h-0 gap-0 py-0 shadow-none';
const labelCell = 'h-auto px-4 py-3 text-left text-sm font-medium text-foreground';
const valueCell = 'truncate px-4 py-3 text-left align-middle';
const amountCell = 'px-4 py-3 text-right align-middle whitespace-nowrap tabular-nums';

function customerPath(customerId: string): string {
  return `/customers?customer=${customerId}`;
}

export function CustomerLink({
  customerId,
  name,
  className,
}: {
  customerId: string;
  name: string;
  className?: string;
}): JSX.Element {
  return (
    <Link
      to={customerPath(customerId)}
      className={cn('rounded-sm font-medium text-foreground', focusRing, className)}
    >
      {name}
    </Link>
  );
}

function formatCalendarDay(value: string): string {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) {
    return value;
  }
  return `${year}. ${month}. ${day}.`;
}

function formatDday(dayOffset: number): string {
  if (dayOffset === 0) {
    return 'D-day';
  }
  return `D-${dayOffset}`;
}

function openCustomer(
  navigate: ReturnType<typeof useNavigate>,
  customerId: string,
  event: MouseEvent<HTMLTableRowElement>,
): void {
  if (event.target instanceof Element && event.target.closest('a, button')) {
    return;
  }
  void navigate(customerPath(customerId));
}

function EmptyMessage({ message }: { message: string }): JSX.Element {
  return <p className="px-5 py-8 text-center text-sm text-muted-foreground">{message}</p>;
}

function DepositList({ deposits }: { deposits: TodayDeposit[] }): JSX.Element {
  const navigate = useNavigate();
  let body = <EmptyMessage message="기간 내 입금 내역이 없습니다." />;
  if (deposits.length > 0) {
    body = (
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-card">
            <TableHead className={labelCell}>입금일</TableHead>
            <TableHead className={labelCell}>고객이름</TableHead>
            <TableHead className={labelCell}>구분</TableHead>
            <TableHead className={cn(labelCell, 'text-right')}>입금액</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deposits.map((deposit) => (
            <TableRow
              key={deposit.id}
              className="cursor-pointer"
              onClick={(event) => {
                openCustomer(navigate, deposit.customerId, event);
              }}
            >
              <TableCell className={valueCell}>
                <time dateTime={deposit.paidOn}>{formatCalendarDay(deposit.paidOn)}</time>
              </TableCell>
              <TableCell className={valueCell}>
                <CustomerLink customerId={deposit.customerId} name={deposit.customerName} />
              </TableCell>
              <TableCell className={valueCell}>
                {todayDepositCategoryLabels[deposit.category]}
              </TableCell>
              <TableCell className={amountCell}>{formatWon(deposit.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <Card className={workListCard}>
      <CardHeader className="shrink-0 px-5 pt-5 pb-1">
        <CardTitle>기간 내 입금내역</CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto px-0 pb-2">{body}</CardContent>
    </Card>
  );
}

function OverdueTable({ customers }: { customers: TodayOverdueCustomer[] }): JSX.Element {
  const navigate = useNavigate();
  if (customers.length === 0) {
    return <EmptyMessage message="미납 고객이 없습니다." />;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border hover:bg-card">
          <TableHead className={labelCell}>이름</TableHead>
          <TableHead className={cn(labelCell, 'text-right')}>금액</TableHead>
          <TableHead className={labelCell}>제도이름</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((customer) => (
          <TableRow
            key={customer.customerId}
            className="cursor-pointer"
            onClick={(event) => {
              openCustomer(navigate, customer.customerId, event);
            }}
          >
            <TableCell className={valueCell}>
              <CustomerLink customerId={customer.customerId} name={customer.customerName} />
            </TableCell>
            <TableCell className={cn(amountCell, 'text-destructive')}>
              {formatWon(customer.amount)}
            </TableCell>
            <TableCell className={valueCell}>{caseTypeLabels[customer.caseType]}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function UpcomingTable({ payments }: { payments: TodayUpcomingPayment[] }): JSX.Element {
  const navigate = useNavigate();
  if (payments.length === 0) {
    return <EmptyMessage message="납부 예정 고객이 없습니다." />;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border hover:bg-card">
          <TableHead className={labelCell}>이름</TableHead>
          <TableHead className={cn(labelCell, 'text-right')}>금액</TableHead>
          <TableHead className={labelCell}>납부예정일</TableHead>
          <TableHead className={labelCell}>납부유형</TableHead>
          <TableHead className={labelCell}>D-day</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((payment) => (
          <TableRow
            key={payment.id}
            className="cursor-pointer"
            onClick={(event) => {
              openCustomer(navigate, payment.customerId, event);
            }}
          >
            <TableCell className={valueCell}>
              <CustomerLink customerId={payment.customerId} name={payment.customerName} />
            </TableCell>
            <TableCell className={amountCell}>{formatWon(payment.amount)}</TableCell>
            <TableCell className={valueCell}>
              <time dateTime={payment.promisedOn}>{formatCalendarDay(payment.promisedOn)}</time>
            </TableCell>
            <TableCell className={valueCell}>{installmentScheduleLabel(payment)}</TableCell>
            <TableCell className={valueCell}>{formatDday(payment.dayOffset)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ScheduleList({
  overdueCustomers,
  upcomingPayments,
}: {
  overdueCustomers: TodayOverdueCustomer[];
  upcomingPayments: TodayUpcomingPayment[];
}): JSX.Element {
  return (
    <Card className={workListCard}>
      <CardHeader className="shrink-0 px-5 pt-5 pb-1">
        <CardTitle>미납/납부 예정</CardTitle>
      </CardHeader>
      <CardContent className="grid min-h-0 flex-1 grid-rows-2 gap-4 px-0 pb-4">
        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2">
          <div className="px-5">
            <Badge variant="destructive">미납</Badge>
          </div>
          <div className="min-h-0 overflow-y-auto">
            <OverdueTable customers={overdueCustomers} />
          </div>
        </div>
        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2">
          <div className="px-5">
            <Badge variant="secondary">납부예정</Badge>
          </div>
          <div className="min-h-0 overflow-y-auto">
            <UpcomingTable payments={upcomingPayments} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TodayWorkLists({
  deposits,
  overdueCustomers,
  upcomingPayments,
}: TodayWorkListsProps): JSX.Element {
  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <h2 className="sr-only">입금과 납부 일정</h2>
      <DepositList deposits={deposits} />
      <ScheduleList overdueCustomers={overdueCustomers} upcomingPayments={upcomingPayments} />
    </section>
  );
}
