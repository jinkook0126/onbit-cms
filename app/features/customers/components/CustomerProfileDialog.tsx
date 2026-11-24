import { useEffect, useState } from 'react';

import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { CustomerNextContactField } from '~/features/customers/components/CustomerNextContactField';
import { useCustomerProfileForm } from '~/features/customers/hooks/useCustomerProfileForm';
import { MAX_CUSTOMER_NAME_LENGTH, MAX_CUSTOMER_PHONE_LENGTH } from '~/features/customers/type';
import { readQueryError } from '~/lib/formError';
import { fieldLabel } from '~/lib/styles';

import type { JSX, SubmitEvent } from 'react';
import type { CustomerDetail } from '~/features/customers/type';

type OutsideEvent = {
  preventDefault: () => void;
  target: EventTarget | null;
};

function isDatePickerTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[data-slot="popover-content"]') !== null;
}

type CustomerProfileDialogProps = {
  mode: 'create' | 'edit';
  open: boolean;
  customer: CustomerDetail | null;
  onClose: () => void;
};

function FieldError({ id, message }: { id: string; message?: string }): JSX.Element | null {
  if (!message) {
    return null;
  }
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  );
}

function CustomerProfileForm({
  mode,
  customer,
  onClose,
  onSubmittingChange,
}: {
  mode: 'create' | 'edit';
  customer: CustomerDetail | null;
  onClose: () => void;
  onSubmittingChange: (submitting: boolean) => void;
}): JSX.Element {
  const form = useCustomerProfileForm(mode, customer, onClose);
  useEffect(() => {
    onSubmittingChange(form.isSubmitting);
  }, [form.isSubmitting, onSubmittingChange]);
  const idPrefix = mode === 'create' ? 'customer-create' : `customer-edit-${customer?.id ?? 'new'}`;

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    form.submitProfile();
  }

  return (
    <form noValidate className="grid min-h-0 gap-4" onSubmit={handleSubmit}>
      <div className="grid max-h-[min(36.5rem,calc(100dvh-12rem))] gap-4 overflow-y-auto p-1 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-name`} className={fieldLabel}>
            고객명
          </Label>
          <Input
            id={`${idPrefix}-name`}
            name="name"
            value={form.name}
            maxLength={MAX_CUSTOMER_NAME_LENGTH}
            autoComplete="name"
            disabled={form.isSubmitting}
            aria-invalid={form.fieldErrors?.name ? true : undefined}
            aria-describedby={form.fieldErrors?.name ? `${idPrefix}-name-error` : undefined}
            onChange={form.changeName}
          />
          <FieldError id={`${idPrefix}-name-error`} message={form.fieldErrors?.name} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-phone`} className={fieldLabel}>
            연락처
          </Label>
          <Input
            id={`${idPrefix}-phone`}
            name="phone"
            type="tel"
            inputMode="numeric"
            value={form.phone}
            maxLength={MAX_CUSTOMER_PHONE_LENGTH}
            autoComplete="tel"
            placeholder="01012345678"
            disabled={form.isSubmitting}
            aria-invalid={form.fieldErrors?.phone ? true : undefined}
            aria-describedby={form.fieldErrors?.phone ? `${idPrefix}-phone-error` : undefined}
            onChange={form.changePhone}
          />
          <FieldError id={`${idPrefix}-phone-error`} message={form.fieldErrors?.phone} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-source`} className={fieldLabel}>
            유입처
          </Label>
          <Select
            value={form.sourceId === '' ? undefined : form.sourceId}
            disabled={form.isSubmitting}
            onValueChange={form.changeSource}
          >
            <SelectTrigger
              id={`${idPrefix}-source`}
              className="w-full"
              aria-invalid={form.fieldErrors?.sourceId ? true : undefined}
              aria-describedby={form.fieldErrors?.sourceId ? `${idPrefix}-source-error` : undefined}
            >
              <SelectValue placeholder="유입처를 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {form.sourceOptions.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError id={`${idPrefix}-source-error`} message={form.fieldErrors?.sourceId} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-case-type`} className={fieldLabel}>
            사건 유형
          </Label>
          <Select
            value={form.caseTypeId === '' ? undefined : form.caseTypeId}
            disabled={form.isSubmitting}
            onValueChange={form.changeCaseType}
          >
            <SelectTrigger
              id={`${idPrefix}-case-type`}
              className="w-full"
              aria-invalid={form.fieldErrors?.caseTypeId ? true : undefined}
              aria-describedby={
                form.fieldErrors?.caseTypeId ? `${idPrefix}-case-type-error` : undefined
              }
            >
              <SelectValue placeholder="사건 유형을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {form.caseTypeOptions.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError id={`${idPrefix}-case-type-error`} message={form.fieldErrors?.caseTypeId} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-status`} className={fieldLabel}>
            상담상태
          </Label>
          <Select
            value={form.statusId === '' ? undefined : form.statusId}
            disabled={form.isSubmitting || form.statusLocked}
            onValueChange={form.changeStatus}
          >
            <SelectTrigger
              id={`${idPrefix}-status`}
              className="w-full"
              aria-invalid={form.fieldErrors?.statusId ? true : undefined}
              aria-describedby={form.fieldErrors?.statusId ? `${idPrefix}-status-error` : undefined}
            >
              <SelectValue placeholder="상담 상태를 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {form.statusOptions.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError id={`${idPrefix}-status-error`} message={form.fieldErrors?.statusId} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-assignee`} className={fieldLabel}>
            담당자
          </Label>
          <Select
            value={form.assigneeId === '' ? undefined : form.assigneeId}
            disabled={form.assignees.isPending || form.assignees.isError || form.isSubmitting}
            onValueChange={form.changeAssignee}
          >
            <SelectTrigger
              id={`${idPrefix}-assignee`}
              className="w-full"
              aria-invalid={form.fieldErrors?.assigneeId ? true : undefined}
              aria-describedby={
                form.fieldErrors?.assigneeId ? `${idPrefix}-assignee-error` : undefined
              }
            >
              <SelectValue placeholder="담당자를 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {form.assignees.data?.assignees.map((assignee) => (
                <SelectItem key={assignee.id} value={assignee.id}>
                  {assignee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.assignees.isError ? (
            <p className="text-sm text-destructive" role="alert">
              {readQueryError(form.assignees.error, '상담 담당 목록을 불러오지 못했습니다.')}
            </p>
          ) : null}
          <FieldError id={`${idPrefix}-assignee-error`} message={form.fieldErrors?.assigneeId} />
        </div>
        <CustomerNextContactField
          id={`${idPrefix}-first-processed`}
          label="DB 최초 처리일"
          value={form.firstProcessedOn}
          invalid={form.fieldErrors?.firstProcessedOn !== undefined}
          message={form.fieldErrors?.firstProcessedOn}
          disabled={form.isSubmitting}
          onChange={form.changeFirstProcessedOn}
        />
        <CustomerNextContactField
          id={`${idPrefix}-contracted-on`}
          label="수임날짜"
          value={form.contractedOn}
          invalid={form.fieldErrors?.contractedOn !== undefined}
          message={form.fieldErrors?.contractedOn}
          disabled={form.isSubmitting || !form.retainFieldsEnabled}
          onChange={form.changeContractedOn}
        />
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-retainer-fee`} className={fieldLabel}>
            총 수임료(원)
          </Label>
          <Input
            id={`${idPrefix}-retainer-fee`}
            name="retainerFee"
            inputMode="numeric"
            value={form.retainerFee}
            placeholder="0"
            disabled={form.isSubmitting || !form.retainFieldsEnabled}
            aria-invalid={form.fieldErrors?.retainerFee ? true : undefined}
            aria-describedby={
              form.fieldErrors?.retainerFee ? `${idPrefix}-retainer-fee-error` : undefined
            }
            onChange={form.changeRetainerFee}
          />
          <FieldError
            id={`${idPrefix}-retainer-fee-error`}
            message={form.fieldErrors?.retainerFee}
          />
        </div>
        {form.catalogError ? (
          <p className="text-sm text-destructive sm:col-span-2" role="alert">
            유입처, 사건 유형, 상담 상태 목록을 불러오지 못했습니다. 다시 시도하세요.
          </p>
        ) : null}
        {form.formError ? (
          <p className="text-sm text-destructive sm:col-span-2" role="alert">
            {form.formError}
          </p>
        ) : null}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={form.isSubmitting}>
          취소
        </Button>
        <Button
          type="submit"
          disabled={form.isSubmitting || form.assignees.isError}
          aria-busy={form.isSubmitting}
        >
          {form.isSubmitting ? '저장 중...' : '저장'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CustomerProfileDialog({
  mode,
  open,
  customer,
  onClose,
}: CustomerProfileDialogProps): JSX.Element {
  const [submitting, setSubmitting] = useState(false);

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen && !submitting) {
      onClose();
    }
  }

  function preventOutsideDismiss(event: OutsideEvent): void {
    if (submitting || isDatePickerTarget(event.target)) {
      event.preventDefault();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-3xl"
        showCloseButton={!submitting}
        onInteractOutside={preventOutsideDismiss}
        onPointerDownOutside={preventOutsideDismiss}
      >
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? '고객 등록' : '고객 수정'}</DialogTitle>
          <DialogDescription className="sr-only">
            고객 정보를 입력하고 저장하거나 취소합니다. 상담 상태가 수임일 때 수임날짜와 총 수임료를
            입력할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <CustomerProfileForm
            key={mode === 'edit' ? customer?.id : 'create'}
            mode={mode}
            customer={customer}
            onClose={onClose}
            onSubmittingChange={setSubmitting}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
