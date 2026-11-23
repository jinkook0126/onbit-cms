export function seoulToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function formatContactDate(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const contactTimePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseContactTime(value: string): string | null {
  const match = contactTimePattern.exec(value);
  if (!match) {
    return null;
  }
  return `${match[1]}:${match[2]}`;
}

export function formatNextContactSchedule(date: Date, time: string | null): string {
  const day = formatContactDate(date);
  if (time === null) {
    return day;
  }
  return `${day}T${time}`;
}

export type NextContactSchedule = {
  date: Date;
  time: string;
};

export function parseNextContactSchedule(value: string): NextContactSchedule | 'date-only' | null {
  const dateOnly = parseContactDate(value);
  if (dateOnly) {
    return 'date-only';
  }
  const match = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) {
    return null;
  }
  const date = parseContactDate(match[1]);
  const time = parseContactTime(`${match[2]}:${match[3]}`);
  if (date === null || time === null) {
    return null;
  }
  return { date, time };
}

export function parseContactDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}
