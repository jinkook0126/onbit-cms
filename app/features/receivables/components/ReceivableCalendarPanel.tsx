import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';

import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { MAX_CUSTOMER_KEYWORD_LENGTH } from '~/features/customers/type';
import { ReceivableDaySchedule } from '~/features/receivables/components/ReceivableDaySchedule';
import { useReceivableCalendar } from '~/features/receivables/hooks/useReceivableCalendar';
import { readQueryError } from '~/lib/formError';
import { formatWon } from '~/lib/money';
import { fieldLabel, focusRing, pageSurface, sectionDescription } from '~/lib/styles';
import { cn } from '~/lib/utils';

import type { JSX, SubmitEvent } from 'react';
import type { ReceivableCalendarDay } from '~/features/receivables/type';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

type CalendarCell = {
  key: string;
  date: Date | null;
};

function parseCalendarDate(value: string | null): Date | undefined {
  if (value === null || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined;
  }
  return date;
}

function formatCalendarDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatCalendarMonth(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

function calendarPeopleLabel(day: ReceivableCalendarDay): string {
  if (day.extraCount === 0) {
    return day.customerName;
  }
  return `${day.customerName} 외 ${day.extraCount}명`;
}

function formatScheduleTitle(date: Date): string {
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()} 납부 일정`;
}

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function buildMonthCells(month: Date): CalendarCell[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const leading = new Date(year, monthIndex, 1).getDay();
  const lastDate = new Date(year, monthIndex + 1, 0).getDate();
  const cells: CalendarCell[] = [];
  for (let index = 0; index < leading; index += 1) {
    cells.push({ key: `blank-start-${index}`, date: null });
  }
  for (let day = 1; day <= lastDate; day += 1) {
    const date = new Date(year, monthIndex, day);
    cells.push({ key: formatCalendarDate(date), date });
  }
  const trailing = (7 - (cells.length % 7)) % 7;
  for (let index = 0; index < trailing; index += 1) {
    cells.push({ key: `blank-end-${index}`, date: null });
  }
  return cells;
}

export function ReceivableCalendarPanel(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const keyword = searchParams.get('name') ?? '';
  const selected = parseCalendarDate(searchParams.get('date'));
  const [draftKeyword, setDraftKeyword] = useState(keyword);
  const [month, setMonth] = useState<Date>(selected ?? new Date());
  const today = new Date();
  const cells = buildMonthCells(month);
  const calendar = useReceivableCalendar({ month: formatCalendarMonth(month), name: keyword });
  const days = new Map((calendar.data?.days ?? []).map((day) => [day.date, day]));

  function replaceParams(update: (params: URLSearchParams) => void): void {
    const next = new URLSearchParams(searchParams);
    update(next);
    setSearchParams(next, { replace: true });
  }

  function searchByName(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const nextKeyword = draftKeyword.trim();
    replaceParams((params) => {
      if (nextKeyword === '') {
        params.delete('name');
        return;
      }
      params.set('name', nextKeyword);
    });
  }

  function selectDate(date: Date): void {
    replaceParams((params) => {
      params.set('date', formatCalendarDate(date));
    });
  }

  function shiftMonth(offset: number): void {
    setMonth(new Date(month.getFullYear(), month.getMonth() + offset, 1));
  }

  function showToday(): void {
    const current = new Date();
    setMonth(new Date(current.getFullYear(), current.getMonth(), 1));
    selectDate(current);
  }

  return (
    <div className="grid gap-5">
      <section className={`${pageSurface} w-fit px-4 py-3`}>
        <h2 className="sr-only">고객 이름 검색</h2>
        <form className="flex items-end gap-2" onSubmit={searchByName}>
          <div className="grid w-44 gap-2">
            <Label htmlFor="receivable-calendar-name" className={fieldLabel}>
              고객 이름
            </Label>
            <Input
              id="receivable-calendar-name"
              value={draftKeyword}
              maxLength={MAX_CUSTOMER_KEYWORD_LENGTH}
              placeholder="이름"
              onChange={(event) => {
                setDraftKeyword(event.currentTarget.value.slice(0, MAX_CUSTOMER_KEYWORD_LENGTH));
              }}
            />
          </div>
          <Button type="submit">검색</Button>
        </form>
      </section>
      <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className={`${pageSurface} min-w-0 p-4`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground">
              {month.getFullYear()}년 {month.getMonth() + 1}월
            </h2>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="이전 달"
                onClick={() => {
                  shiftMonth(-1);
                }}
              >
                <ChevronLeftIcon />
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={showToday}>
                오늘
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="다음 달"
                onClick={() => {
                  shiftMonth(1);
                }}
              >
                <ChevronRightIcon />
              </Button>
            </div>
          </div>
          {calendar.isError ? (
            <p role="alert" className="mb-3 text-sm text-destructive">
              {readQueryError(calendar.error, '분납 캘린더를 불러오지 못했습니다.')}
            </p>
          ) : null}
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-7 bg-muted">
              {WEEKDAYS.map((weekday) => (
                <div
                  key={weekday}
                  className="py-2 text-center text-xs font-normal text-muted-foreground"
                >
                  {weekday}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((cell, index) => {
                const edge = index % 7 === 6 ? '' : 'border-r border-border';
                const date = cell.date;
                if (!date) {
                  return (
                    <div key={cell.key} className={cn('min-h-28 border-t border-border', edge)} />
                  );
                }
                const current = isSameDay(date, today);
                const active = selected ? isSameDay(date, selected) : false;
                const summary = days.get(cell.key);
                const dateLabel = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
                return (
                  <button
                    key={cell.key}
                    type="button"
                    aria-pressed={active}
                    aria-label={
                      summary
                        ? `${dateLabel}, ${formatWon(summary.totalAmount)}, ${calendarPeopleLabel(summary)}`
                        : dateLabel
                    }
                    className={cn(
                      'flex min-h-28 min-w-0 flex-col items-start border-t border-border bg-background p-2 text-left',
                      edge,
                      active && 'ring-2 ring-primary ring-inset',
                      focusRing,
                    )}
                    onClick={() => {
                      selectDate(date);
                    }}
                  >
                    <span
                      className={cn(
                        'text-xs',
                        current ? 'font-medium text-primary' : 'text-muted-foreground',
                      )}
                    >
                      {current ? `${date.getDate()} · 오늘` : date.getDate()}
                    </span>
                    {summary ? (
                      <span className="mt-2 grid w-full min-w-0 gap-0.5 rounded-md bg-muted px-1.5 py-1">
                        <span className="truncate text-xs font-medium text-foreground tabular-nums">
                          {formatWon(summary.totalAmount)}
                        </span>
                        <span
                          className="truncate text-xs text-foreground"
                          title={calendarPeopleLabel(summary)}
                        >
                          {calendarPeopleLabel(summary)}
                        </span>
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
        <section className={`${pageSurface} grid min-h-80 content-start gap-3 p-5`}>
          <h2 className="text-base font-semibold text-foreground">
            {selected ? formatScheduleTitle(selected) : '납부 일정'}
          </h2>
          {selected ? (
            <ReceivableDaySchedule date={formatCalendarDate(selected)} name={keyword} />
          ) : (
            <p className={sectionDescription}>날짜를 선택하면 납부 일정이 여기에 표시됩니다.</p>
          )}
        </section>
      </div>
    </div>
  );
}
