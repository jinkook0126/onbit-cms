import { useState } from 'react';
import { useNavigate } from 'react-router';

import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Skeleton } from '~/components/ui/skeleton';
import { CustomerConsultationForm } from '~/features/customers/components/CustomerConsultationForm';
import { CustomerConsultationList } from '~/features/customers/components/CustomerConsultationList';
import { CustomerProfileDialog } from '~/features/customers/components/CustomerProfileDialog';
import { useCustomerConsultations } from '~/features/customers/hooks/useCustomerConsultations';
import { useCustomerDetail } from '~/features/customers/hooks/useCustomerDetail';
import {
  caseTypeLabels,
  consultationStatusBadgeVariants,
  consultationStatusLabels,
  formatCustomerPhone,
  inflowSourceLabels,
} from '~/features/customers/type';
import { receivableDetailPath } from '~/features/receivables/type';
import { readQueryError } from '~/lib/formError';
import { formatWon } from '~/lib/money';
import { fieldLabel, fieldValue } from '~/lib/styles';

import type { JSX } from 'react';
import type { CustomerDetail } from '~/features/customers/type';

type CustomerDetailDialogProps = {
  customerId: string;
  onClose: () => void;
};

type OutsideEvent = {
  preventDefault: () => void;
  target: EventTarget | null;
};

const missingValue = '미정';

function formatCalendarDay(value: string): string {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) {
    return value;
  }
  return `${year}. ${month}. ${day}.`;
}

function isDatePickerTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[data-slot="popover-content"]') !== null;
}

function DetailValue({ value }: { value: string | null }): JSX.Element {
  if (!value) {
    return <Badge variant="outline">{missingValue}</Badge>;
  }
  return <p className={fieldValue}>{value}</p>;
}

function DetailField({ label, children }: { label: string; children: JSX.Element }): JSX.Element {
  return (
    <div className="grid content-start gap-2">
      <p className={fieldLabel}>{label}</p>
      {children}
    </div>
  );
}

function CustomerDetailFields({ customer }: { customer: CustomerDetail }): JSX.Element {
  const remaining =
    customer.remainingRetainer === null ? null : formatWon(customer.remainingRetainer);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <DetailField label="상담상태">
        <Badge variant={consultationStatusBadgeVariants[customer.status]}>
          {consultationStatusLabels[customer.status]}
        </Badge>
      </DetailField>
      <DetailField label="사건유형">
        <DetailValue value={customer.caseType ? caseTypeLabels[customer.caseType] : null} />
      </DetailField>
      <DetailField label="담당자">
        <DetailValue value={customer.assigneeName} />
      </DetailField>
      <DetailField label="연락처">
        <p className={fieldValue}>{formatCustomerPhone(customer.phone)}</p>
      </DetailField>
      <DetailField label="유입처">
        <p className={fieldValue}>{inflowSourceLabels[customer.source]}</p>
      </DetailField>
      <DetailField label="등록날짜">
        <p className={fieldValue}>{formatCalendarDay(customer.registeredOn)}</p>
      </DetailField>
      <DetailField label="수임날짜">
        <DetailValue
          value={customer.contractedOn ? formatCalendarDay(customer.contractedOn) : null}
        />
      </DetailField>
      <DetailField label="남은 수임료">
        <DetailValue value={remaining} />
      </DetailField>
    </div>
  );
}

export function CustomerDetailDialog({
  customerId,
  onClose,
}: CustomerDetailDialogProps): JSX.Element {
  const navigate = useNavigate();
  const open = customerId !== '';
  const [editing, setEditing] = useState(false);
  const customer = useCustomerDetail(customerId);
  const consultations = useCustomerConsultations(customerId, open && customer.isSuccess);

  function preventOutsideDismiss(event: OutsideEvent): void {
    if (isDatePickerTarget(event.target)) {
      event.preventDefault();
    }
  }

  let body: JSX.Element;
  if (!open || customer.isPending) {
    body = <Skeleton className="h-40 w-full" />;
  } else if (customer.isError) {
    body = (
      <p role="alert" className="text-sm text-destructive">
        {readQueryError(customer.error, '상담 고객을 불러오지 못했습니다.')}
      </p>
    );
  } else {
    body = (
      <div className="grid gap-6">
        <CustomerDetailFields customer={customer.data} />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setEditing(true);
            }}
          >
            수정
          </Button>
          {customer.data.status === 'RETAINED' ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void navigate(receivableDetailPath(customer.data.id));
              }}
            >
              분납/입금 내역
            </Button>
          ) : null}
        </div>
        <CustomerConsultationList
          customerId={customer.data.id}
          consultations={consultations}
        />
        <CustomerConsultationForm key={customer.data.id} customerId={customer.data.id} />
      </div>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="sm:max-w-3xl"
        onInteractOutside={preventOutsideDismiss}
        onPointerDownOutside={preventOutsideDismiss}
      >
        <DialogHeader>
          <DialogTitle>{customer.data?.name ?? '고객 상세'}</DialogTitle>
          <DialogDescription className="sr-only">
            상담 상태와 상담 이력을 확인합니다.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[min(40rem,calc(100dvh-8rem))] overflow-y-auto p-1">{body}</div>
      </DialogContent>
      {customer.isSuccess ? (
        <CustomerProfileDialog
          mode="edit"
          open={editing}
          customer={customer.data}
          onClose={() => {
            setEditing(false);
          }}
        />
      ) : null}
    </Dialog>
  );
}
