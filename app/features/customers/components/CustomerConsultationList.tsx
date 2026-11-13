import { useState } from 'react';

import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { ConsultationCreateDialog } from '~/features/customers/components/ConsultationCreateDialog';
import { ConsultationEditDialog } from '~/features/customers/components/ConsultationEditDialog';
import { ConsultationStatusForm } from '~/features/customers/components/ConsultationStatusForm';
import { customerFormError } from '~/features/customers/type';
import { ApiError } from '~/lib/apiClient';
import { fieldLabel, fieldValue } from '~/lib/styles';

import type { UseQueryResult } from '@tanstack/react-query';
import type { JSX } from 'react';
import type {
  ConsultationListItem,
  ConsultationListResponse,
  ConsultationStatus,
} from '~/features/customers/type';

type CustomerConsultationListProps = {
  customerId: string;
  status: ConsultationStatus;
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

function ConsultationCard({
  consultation,
  onEdit,
}: {
  consultation: ConsultationListItem;
  onEdit: (consultation: ConsultationListItem) => void;
}): JSX.Element {
  const nextContact = consultation.nextContactOn
    ? formatCalendarDay(consultation.nextContactOn)
    : missingNextContact;
  const consultedOn = formatConsultationCreatedAt(consultation.createdAt);

  return (
    <article className="grid gap-3 rounded-xl bg-card p-4 ring-1 ring-border">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <p className="flex items-center gap-2">
            <span className={fieldLabel}>상담일자</span>
            <time className={fieldValue} dateTime={consultation.createdAt}>
              {consultedOn}
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`${consultedOn} 상담 이력 수정`}
          onClick={() => {
            onEdit(consultation);
          }}
        >
          수정
        </Button>
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
  status,
  consultations,
}: CustomerConsultationListProps): JSX.Element {
  const [editing, setEditing] = useState<ConsultationListItem | null>(null);
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
        <p className="mt-2 max-w-md text-sm text-muted-foreground">등록된 상담 이력이 없습니다.</p>
      </div>
    );
  } else {
    body = (
      <div className="grid gap-3">
        {consultations.data.consultations.map((consultation) => (
          <ConsultationCard key={consultation.id} consultation={consultation} onEdit={setEditing} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-border sm:flex-row sm:items-center sm:justify-between">
        <h3 className="sr-only">상담 이력</h3>
        <ConsultationStatusForm key={customerId} customerId={customerId} status={status} />
        <ConsultationCreateDialog customerId={customerId} />
      </div>
      {body}
      {editing ? (
        <ConsultationEditDialog
          key={editing.id}
          customerId={customerId}
          consultation={editing}
          onClose={() => {
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}
