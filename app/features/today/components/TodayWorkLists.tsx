import { Link } from 'react-router';

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
import { customerCaseProgressTab, customerConsultationTab } from '~/features/customers/type';
import { focusRing } from '~/lib/styles';
import { cn } from '~/lib/utils';

import type { JSX } from 'react';
import type { TodayCaseTask, TodayContact } from '~/features/today/type';

type TodayWorkListsProps = {
  contacts: TodayContact[];
  cases: TodayCaseTask[];
};

function customerPath(customerId: string, tab: string): string {
  return `/customers/${customerId}?tab=${tab}`;
}

export function CustomerLink({
  customerId,
  tab,
  name,
}: {
  customerId: string;
  tab: string;
  name: string;
}): JSX.Element {
  return (
    <Link
      to={customerPath(customerId, tab)}
      className={cn('rounded-sm text-foreground', focusRing)}
    >
      {name}
    </Link>
  );
}

function TodayContactCard({ contacts }: { contacts: TodayContact[] }): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>오늘 연락할 고객</CardTitle>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">오늘 연락할 고객이 없습니다.</p>
        ) : (
          <Table>
            <caption className="sr-only">오늘 연락할 고객</caption>
            <TableHeader>
              <TableRow>
                <TableHead className="h-10 px-0 font-medium text-muted-foreground">고객</TableHead>
                <TableHead className="h-10 px-4 font-medium text-muted-foreground">담당</TableHead>
                <TableHead className="h-10 px-0 font-medium text-muted-foreground">
                  상담내용
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact.customerId}>
                  <TableCell className="px-0 py-3 align-top">
                    <CustomerLink
                      customerId={contact.customerId}
                      tab={customerConsultationTab}
                      name={contact.customerName}
                    />
                  </TableCell>
                  <TableCell className="px-4 py-3 align-top">
                    {contact.assigneeName ?? <Badge variant="outline">미정</Badge>}
                  </TableCell>
                  <TableCell className="px-0 py-3 align-top break-words whitespace-pre-wrap">
                    {contact.content}
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

function TodayCaseCard({ cases }: { cases: TodayCaseTask[] }): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>확인할 사건</CardTitle>
      </CardHeader>
      <CardContent>
        {cases.length === 0 ? (
          <p className="text-sm text-muted-foreground">확인할 사건이 없습니다.</p>
        ) : (
          <Table>
            <caption className="sr-only">확인할 사건</caption>
            <TableHeader>
              <TableRow>
                <TableHead className="h-10 px-0 font-medium text-muted-foreground">고객</TableHead>
                <TableHead className="h-10 px-0 font-medium text-muted-foreground">업무</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((item) => (
                <TableRow key={item.customerId}>
                  <TableCell className="px-0 py-3 align-top">
                    <CustomerLink
                      customerId={item.customerId}
                      tab={customerCaseProgressTab}
                      name={item.customerName}
                    />
                  </TableCell>
                  <TableCell className="px-0 py-3 align-top break-words whitespace-pre-wrap">
                    {item.task}
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

export function TodayWorkLists({ contacts, cases }: TodayWorkListsProps): JSX.Element {
  return (
    <section className="grid items-start gap-4 lg:grid-cols-2">
      <h2 className="sr-only">오늘의 목록</h2>
      <TodayContactCard contacts={contacts} />
      <TodayCaseCard cases={cases} />
    </section>
  );
}
