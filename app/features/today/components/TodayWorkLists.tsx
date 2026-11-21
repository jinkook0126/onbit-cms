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
import { customerConsultationTab } from '~/features/customers/type';
import { focusRing } from '~/lib/styles';
import { cn } from '~/lib/utils';

import type { JSX, MouseEvent } from 'react';
import type { TodayContact } from '~/features/today/type';

type TodayWorkListsProps = {
  contacts: TodayContact[];
};

const labelCell = 'h-auto px-5 py-3 text-left text-sm font-medium text-foreground';
const nameCell = 'px-5 py-3.5 text-left align-top';
const textCell = 'px-5 py-3.5 text-left align-top whitespace-normal break-words';

function customerPath(customerId: string, tab: string): string {
  return `/customers/${customerId}?tab=${tab}`;
}

export function CustomerLink({
  customerId,
  tab,
  name,
  className,
}: {
  customerId: string;
  tab: string;
  name: string;
  className?: string;
}): JSX.Element {
  return (
    <Link
      to={customerPath(customerId, tab)}
      className={cn('rounded-sm font-medium text-foreground', focusRing, className)}
    >
      {name}
    </Link>
  );
}

export function TodayEmptyState({ message }: { message: string }): JSX.Element {
  return (
    <div className="flex min-h-52 flex-1 items-center justify-center rounded-lg bg-muted px-6 py-10 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function TodayPanel({ title, children }: { title: string; children: JSX.Element }): JSX.Element {
  return (
    <Card className="h-full gap-0 py-0 shadow-none">
      <CardHeader className="px-5 pt-5 pb-1">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-2">{children}</CardContent>
    </Card>
  );
}

function AssigneeName({ name }: { name: string | null }): JSX.Element {
  if (!name) {
    return <Badge variant="outline">미정</Badge>;
  }
  return <span className="block truncate">{name}</span>;
}

function openCustomer(
  navigate: ReturnType<typeof useNavigate>,
  customerId: string,
  tab: string,
  event: MouseEvent<HTMLTableRowElement>,
): void {
  if (event.target instanceof Element && event.target.closest('a, button')) {
    return;
  }
  void navigate(customerPath(customerId, tab));
}

function TodayContactCard({ contacts }: { contacts: TodayContact[] }): JSX.Element {
  const navigate = useNavigate();
  let body = (
    <div className="px-5 pt-2 pb-5">
      <TodayEmptyState message="오늘 연락할 고객이 없습니다." />
    </div>
  );
  if (contacts.length > 0) {
    body = (
      <Table className="table-fixed">
        <caption className="sr-only">오늘 연락할 고객</caption>
        <colgroup>
          <col className="w-[26%]" />
          <col className="w-[22%]" />
          <col className="w-[52%]" />
        </colgroup>
        <TableHeader>
          <TableRow className="border-border hover:bg-card">
            <TableHead className={labelCell}>고객</TableHead>
            <TableHead className={labelCell}>담당</TableHead>
            <TableHead className={labelCell}>상담 내용</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow
              key={contact.customerId}
              className="cursor-pointer border-border/70"
              onClick={(event) => {
                openCustomer(navigate, contact.customerId, customerConsultationTab, event);
              }}
            >
              <TableCell className={nameCell}>
                <CustomerLink
                  customerId={contact.customerId}
                  tab={customerConsultationTab}
                  name={contact.customerName}
                  className="block truncate"
                />
              </TableCell>
              <TableCell className={nameCell}>
                <AssigneeName name={contact.assigneeName} />
              </TableCell>
              <TableCell className={textCell}>{contact.content}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return <TodayPanel title="오늘 연락할 고객">{body}</TodayPanel>;
}

export function TodayWorkLists({ contacts }: TodayWorkListsProps): JSX.Element {
  return (
    <section>
      <h2 className="sr-only">오늘의 목록</h2>
      <TodayContactCard contacts={contacts} />
    </section>
  );
}
