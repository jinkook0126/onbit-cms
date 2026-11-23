import {
  formatContactDate,
  parseContactDate,
  seoulToday,
} from '~/features/customers/api/customerDates.server';
import { resolveCustomerActor } from '~/features/customers/api/customerScope.server';
import { prisma } from '~/lib/db.server';
import { errorCodeLabel } from '~/lib/error.server';

import type { CustomerReminder } from '~/features/customers/type';

const reminderDaySpan = 3;

export type CustomerReminderResult =
  | { status: 'ok'; reminders: CustomerReminder[] }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'failed' };

function addUtcDays(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

function isWithinWindow(value: Date | null, start: string, end: string): value is Date {
  if (value === null) {
    return false;
  }
  const day = formatContactDate(value);
  return day >= start && day <= end;
}

export async function readCustomerReminders(
  request: Request,
): Promise<{ result: CustomerReminderResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  const today = seoulToday();
  const todayDate = parseContactDate(today);
  if (todayDate === null) {
    return { result: { status: 'failed' }, headers };
  }
  const endDate = addUtcDays(todayDate, reminderDaySpan);
  const end = formatContactDate(endDate);

  try {
    const rows = await prisma.customer.findMany({
      where: {
        companyId: actor.companyId,
        assigneeId: actor.userId,
        OR: [
          {
            consultations: { some: { nextContactOn: { gte: todayDate, lte: endDate } } },
          },
          {
            consultations: { none: {} },
            nextContactOn: { gte: todayDate, lte: endDate },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        nextContactOn: true,
        consultations: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 1,
          select: { content: true, nextContactOn: true },
        },
      },
    });
    const reminders: CustomerReminder[] = [];
    for (const row of rows) {
      const latest = row.consultations.at(0);
      const nextContactOn = latest ? latest.nextContactOn : row.nextContactOn;
      if (!isWithinWindow(nextContactOn, today, end)) {
        continue;
      }
      reminders.push({
        id: row.id,
        name: row.name,
        nextContactOn: formatContactDate(nextContactOn),
        latestConsultation: latest?.content ?? null,
      });
    }
    reminders.sort((left, right) => {
      if (left.nextContactOn !== right.nextContactOn) {
        return left.nextContactOn < right.nextContactOn ? -1 : 1;
      }
      return left.name.localeCompare(right.name, 'ko');
    });
    return { result: { status: 'ok', reminders }, headers };
  } catch (error) {
    console.error('통화 예약 알림을 불러오지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}
