import { Skeleton } from '~/components/ui/skeleton';
import { ConsultationCreateDialog } from '~/features/customers/components/ConsultationCreateDialog';
import { customerFormError } from '~/features/customers/type';
import { ApiError } from '~/lib/apiClient';
import { fieldLabel, fieldValue } from '~/lib/styles';

import type { UseQueryResult } from '@tanstack/react-query';
import type { JSX } from 'react';
import type { ConsultationListItem, ConsultationListResponse } from '~/features/customers/type';

type CustomerConsultationListProps = {
  customerId: string;
  consultations: UseQueryResult<ConsultationListResponse>;
};

const missingNextContact = '없음';

function formatCalendarDay(value: string): string {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) {
    return value;
  }
  return `${year}. ${month}. ${day}.`;
}

export function formatConsultationCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  return formatCalendarDay(formatted);
}

function consultationListErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return customerFormError(error.body) ?? '상담 이력을 불러오지 못했습니다.';
  }
  return '상담 이력을 불러오지 못했습니다.';
}

function ConsultationCard({ consultation }: { consultation: ConsultationListItem }): JSX.Element {
  const nextContact = consultation.nextContactOn
    ? formatCalendarDay(consultation.nextContactOn)
    : missingNextContact;

  return (
    <article className="grid gap-3 rounded-xl bg-card p-4 ring-1 ring-border">
      <div className="flex flex-wrap gap-x-8 gap-y-2">
        <p className="flex items-center gap-2">
          <span className={fieldLabel}>상담일자</span>
          <time className={fieldValue} dateTime={consultation.createdAt}>
            {formatConsultationCreatedAt(consultation.createdAt)}
          </time>
        </p>
        <p className="flex items-center gap-2">
          <span className={fieldLabel}>다음 상담 일자</span>
          {consultation.nextContactOn ? (
            <time className={fieldValue} dateTime={consultation.nextContactOn}>
              {nextContact}
            </time>
          ) : (
            <span className={fieldValue}>{missingNextContact}</span>
          )}
        </p>
      </div>
      <div className="grid gap-2">
        <p className={fieldLabel}>상담 내용</p>
        <p className="text-sm whitespace-pre-wrap text-foreground">{consultation.content}</p>
      </div>
    </article>
  );
}

export function CustomerConsultationList({
  customerId,
  consultations,
}: CustomerConsultationListProps): JSX.Element {
  let body: JSX.Element;
  if (consultations.isPending) {
    body = <Skeleton className="h-40 w-full" aria-hidden="true" />;
  } else if (consultations.isError) {
    body = (
      <p role="alert" className="text-sm text-destructive">
        {consultationListErrorMessage(consultations.error)}
      </p>
    );
  } else if (consultations.data.consultations.length === 0) {
    body = (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
        <p className="text-sm font-medium text-foreground">상담 이력 영역</p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          등록된 상담 이력이 없습니다.
        </p>
      </div>
    );
  } else {
    body = (
      <div className="grid gap-3">
        {consultations.data.consultations.map((consultation) => (
          <ConsultationCard key={consultation.id} consultation={consultation} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-end">
        <h3 className="sr-only">상담 이력</h3>
        <ConsultationCreateDialog customerId={customerId} />
      </div>
      {body}
    </div>
  );
}
