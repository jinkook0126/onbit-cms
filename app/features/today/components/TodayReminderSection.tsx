import { Link } from 'react-router';

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
import { useTodayReminders } from '~/features/today/hooks/useTodayReminders';
import { readQueryError } from '~/lib/formError';
import { focusRing, pageAlert, pageSurface, sectionDescription } from '~/lib/styles';
import { cn } from '~/lib/utils';

import type { JSX } from 'react';

function customerPath(customerId: string): string {
  return `/customers?customer=${customerId}`;
}

function formatContactDate(value: string): string {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) {
    return value;
  }
  return `${year}. ${month}. ${day}.`;
}

export function TodayReminderSection(): JSX.Element {
  const reminders = useTodayReminders();

  let body: JSX.Element;
  if (reminders.isPending) {
    body = <Skeleton className="h-24 w-full" />;
  } else if (reminders.isError) {
    body = (
      <p role="alert" className={pageAlert}>
        {readQueryError(reminders.error, '통화 예약 알림을 불러오지 못했습니다.')}
      </p>
    );
  } else if (reminders.data.reminders.length === 0) {
    body = (
      <p className="rounded-lg bg-muted px-4 py-8 text-center text-sm text-muted-foreground">
        3일 이내 통화 예정인 고객이 없습니다.
      </p>
    );
  } else {
    body = (
      <div className="max-h-80 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-card">
              <TableHead className="font-semibold">고객이름</TableHead>
              <TableHead className="font-semibold">상담이력</TableHead>
              <TableHead className="font-semibold">다음 상담일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reminders.data.reminders.map((reminder) => (
              <TableRow key={reminder.id} className="cursor-pointer">
                <TableCell>
                  <Link
                    to={customerPath(reminder.id)}
                    className={cn('rounded-sm text-foreground', focusRing)}
                  >
                    {reminder.name}
                  </Link>
                </TableCell>
                <TableCell className="max-w-md whitespace-normal">
                  {reminder.latestConsultation ? (
                    <span className="line-clamp-2" title={reminder.latestConsultation}>
                      {reminder.latestConsultation}
                    </span>
                  ) : (
                    <Badge variant="outline">미정</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <time dateTime={reminder.nextContactOn}>
                    {formatContactDate(reminder.nextContactOn)}
                  </time>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <section className={`${pageSurface} grid gap-4 p-5`}>
      <div className="grid gap-1">
        <h2 className="text-sm font-medium text-foreground">통화 예약/상담 알림</h2>
        <p className={sectionDescription}>
          내가 담당하는 고객 중 다음 상담일이 오늘부터 3일 이내인 고객입니다.
        </p>
      </div>
      {body}
    </section>
  );
}
