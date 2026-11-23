import { useState } from 'react';

import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { ConsultationEditDialog } from '~/features/customers/components/ConsultationEditDialog';
import { readQueryError } from '~/lib/formError';
import { fieldLabel, fieldValue, pageSurface } from '~/lib/styles';

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
    <article className={`${pageSurface} grid gap-3 p-4`}>
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
  consultations,
}: CustomerConsultationListProps): JSX.Element {
  const [editing, setEditing] = useState<ConsultationListItem | null>(null);
  let body: JSX.Element;
  if (consultations.isPending) {
    body = (
      <div className={`${pageSurface} p-4`} aria-hidden="true">
        <Skeleton className="h-24 w-full" />
      </div>
    );
  } else if (consultations.isError) {
    body = (
      <p role="alert" className="text-sm text-destructive">
        {readQueryError(consultations.error, '상담 이력을 불러오지 못했습니다.')}
      </p>
    );
  } else if (consultations.data.consultations.length === 0) {
    body = (
      <div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-8 text-center">
        <p className="text-sm text-muted-foreground">등록된 상담 이력이 없습니다.</p>
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
      <h3 className="text-sm font-medium text-foreground">상담 이력</h3>
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
