import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { formatSettlementMonth } from '~/features/settlements/type';
import { fieldLabel } from '~/lib/styles';

import type { JSX } from 'react';

type SettlementMonthFieldProps = {
  month: string;
  onMonthChange: (month: string) => void;
};

const monthNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const minYear = 2000;
const maxYear = 2100;

function readYear(month: string): number {
  return Number(month.slice(0, 4));
}

function readMonthNumber(month: string): number {
  return Number(month.slice(5, 7));
}

function toMonth(year: number, monthNumber: number): string {
  return `${String(year).padStart(4, '0')}-${String(monthNumber).padStart(2, '0')}`;
}

export function SettlementMonthField({
  month,
  onMonthChange,
}: SettlementMonthFieldProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => readYear(month));
  const selectedYear = readYear(month);
  const selectedMonth = readMonthNumber(month);

  function handleOpenChange(nextOpen: boolean): void {
    if (nextOpen) {
      setViewYear(readYear(month));
    }
    setOpen(nextOpen);
  }

  function selectMonth(monthNumber: number): void {
    onMonthChange(toMonth(viewYear, monthNumber));
    setOpen(false);
  }

  return (
    <div className="flex items-center gap-3">
      <Label htmlFor="settlement-month" className={fieldLabel}>
        정산월
      </Label>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            id="settlement-month"
            variant="outline"
            className="w-44 justify-start px-3 font-normal"
          >
            <CalendarIcon />
            {formatSettlementMonth(month)}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="이전 해"
              disabled={viewYear <= minYear}
              onClick={() => {
                setViewYear((year) => Math.max(minYear, year - 1));
              }}
            >
              <ChevronLeftIcon />
            </Button>
            <p className="text-sm font-medium text-foreground">{viewYear}년</p>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="다음 해"
              disabled={viewYear >= maxYear}
              onClick={() => {
                setViewYear((year) => Math.min(maxYear, year + 1));
              }}
            >
              <ChevronRightIcon />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-1" role="group" aria-label={`${viewYear}년`}>
            {monthNumbers.map((monthNumber) => {
              const selected = viewYear === selectedYear && monthNumber === selectedMonth;
              return (
                <Button
                  key={monthNumber}
                  type="button"
                  variant={selected ? 'default' : 'ghost'}
                  size="sm"
                  aria-pressed={selected}
                  onClick={() => {
                    selectMonth(monthNumber);
                  }}
                >
                  {monthNumber}월
                </Button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
