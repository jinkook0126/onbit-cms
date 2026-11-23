import { ko } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '~/components/ui/button';
import { Calendar } from '~/components/ui/calendar';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { fieldLabel } from '~/lib/styles';
import { cn } from '~/lib/utils';

import type { JSX } from 'react';

type CustomerNextContactFieldProps = {
  id?: string;
  label?: string;
  value: string;
  invalid: boolean;
  message?: string;
  disabled: boolean;
  clearable?: boolean;
  withTime?: boolean;
  onChange: (value: string) => void;
};

function parseContactDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return undefined;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined;
  }
  return date;
}

function formatContactDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatContactLabel(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}. ${month}. ${day}.`;
}

function readSchedule(value: string): { date: string; time: string } {
  const [date = '', time = ''] = value.split('T');
  return { date, time };
}

function normalizeTime(value: string): string {
  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) {
    return value.slice(0, 5);
  }
  return value;
}

function joinSchedule(date: string, time: string): string {
  if (date === '') {
    return '';
  }
  if (time === '') {
    return date;
  }
  return `${date}T${time}`;
}

export function CustomerNextContactField({
  id = 'customer-next-contact',
  label = '다음 상담일',
  value,
  invalid,
  message,
  disabled,
  clearable = true,
  withTime = false,
  onChange,
}: CustomerNextContactFieldProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const schedule = readSchedule(value);
  const selected = parseContactDate(schedule.date);
  const errorId = `${id}-error`;
  const timeId = `${id}-time`;

  function selectDate(date: Date | undefined): void {
    if (!date) {
      onChange('');
      return;
    }
    const nextDate = formatContactDate(date);
    onChange(withTime ? joinSchedule(nextDate, schedule.time) : nextDate);
    setOpen(false);
  }

  function clearDate(): void {
    onChange('');
    setOpen(false);
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className={fieldLabel}>
        {label}
      </Label>
      <div className={withTime ? 'flex items-center gap-2' : undefined}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              id={id}
              variant="outline"
              disabled={disabled}
              aria-invalid={invalid ? true : undefined}
              aria-describedby={message ? errorId : undefined}
              className={cn(
                'h-9 justify-start px-3 font-normal',
                withTime ? 'min-w-0 flex-1' : 'w-full',
                schedule.date === '' && 'text-muted-foreground',
              )}
            >
              <CalendarIcon />
              {selected ? formatContactLabel(selected) : '날짜를 선택하세요'}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="z-[60] w-auto p-0">
            <Calendar mode="single" locale={ko} selected={selected} onSelect={selectDate} />
            {!clearable || value === '' ? null : (
              <div className="border-t border-border p-2">
                <Button type="button" variant="ghost" className="w-full" onClick={clearDate}>
                  날짜 지우기
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
        {withTime ? (
          <Input
            id={timeId}
            type="time"
            step={60}
            value={schedule.time}
            disabled={disabled || schedule.date === ''}
            aria-label="다음 상담 시간"
            aria-invalid={invalid ? true : undefined}
            aria-describedby={message ? errorId : undefined}
            className="w-32 shrink-0"
            onChange={(event) => {
              onChange(joinSchedule(schedule.date, normalizeTime(event.currentTarget.value)));
            }}
          />
        ) : null}
      </div>
      {message ? (
        <p id={errorId} className="text-sm text-destructive">
          {message}
        </p>
      ) : null}
    </div>
  );
}
