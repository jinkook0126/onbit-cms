import { ko } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '~/components/ui/button';
import { Calendar } from '~/components/ui/calendar';
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

export function CustomerNextContactField({
  id = 'customer-next-contact',
  label = '다음 상담일',
  value,
  invalid,
  message,
  disabled,
  onChange,
}: CustomerNextContactFieldProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const selected = parseContactDate(value);
  const errorId = `${id}-error`;

  function selectDate(date: Date | undefined): void {
    if (!date) {
      onChange('');
      return;
    }
    onChange(formatContactDate(date));
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
              'h-9 w-full justify-start px-3 font-normal',
              value === '' && 'text-muted-foreground',
            )}
          >
            <CalendarIcon />
            {selected ? formatContactLabel(selected) : '날짜를 선택하세요'}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="z-[60] w-auto p-0">
          <Calendar mode="single" locale={ko} selected={selected} onSelect={selectDate} />
          {value === '' ? null : (
            <div className="border-t border-border p-2">
              <Button type="button" variant="ghost" className="w-full" onClick={clearDate}>
                날짜 지우기
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {message ? (
        <p id={errorId} className="text-sm text-destructive">
          {message}
        </p>
      ) : null}
    </div>
  );
}
