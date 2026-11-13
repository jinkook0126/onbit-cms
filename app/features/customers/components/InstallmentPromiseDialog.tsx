import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { CustomerNextContactField } from '~/features/customers/components/CustomerNextContactField';
import { useInstallmentPromiseForm } from '~/features/customers/hooks/useInstallmentPromiseForm';
import { MAX_PROMISE_REASON_LENGTH } from '~/features/customers/type';
import { fieldLabel, sectionDescription } from '~/lib/styles';

import type { JSX, SubmitEvent } from 'react';
import type { InstallmentListItem } from '~/features/customers/type';

type OutsideEvent = {
  preventDefault: () => void;
  target: EventTarget | null;
};

function isDatePickerTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[data-slot="popover-content"]') !== null;
}

type InstallmentPromiseDialogProps = {
  customerId: string;
  installment: InstallmentListItem;
  label: string;
  onClose: () => void;
};

export function InstallmentPromiseDialog({
  customerId,
  installment,
  label,
  onClose,
}: InstallmentPromiseDialogProps): JSX.Element {
  const {
    promisedOn,
    reason,
    fieldErrors,
    formError,
    isSubmitting,
    canSave,
    closeDialog,
    changePromisedOn,
    changeReason,
    submitPromise,
  } = useInstallmentPromiseForm(customerId, installment, onClose);
  const reasonErrorId = 'installment-promise-reason-error';

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      closeDialog();
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    submitPromise();
  }

  function preventOutsideDismiss(event: OutsideEvent): void {
    if (isSubmitting || isDatePickerTarget(event.target)) {
      event.preventDefault();
    }
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!isSubmitting}
        onInteractOutside={preventOutsideDismiss}
        onPointerDownOutside={preventOutsideDismiss}
      >
        <form noValidate className="grid gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>약속일 변경</DialogTitle>
            <DialogDescription className={sectionDescription}>
              {label}의 납부 약속일과 변경 사유를 입력하세요. 저장하면 이 회차의 약속일이 바뀌고 상담
              이력에 남습니다.
            </DialogDescription>
          </DialogHeader>
          <CustomerNextContactField
            id="installment-promised-on"
            label="약속일"
            value={promisedOn}
            invalid={fieldErrors?.promisedOn !== undefined}
            message={fieldErrors?.promisedOn}
            disabled={isSubmitting}
            clearable={false}
            onChange={changePromisedOn}
          />
          <div className="grid gap-2">
            <Label htmlFor="installment-promise-reason" className={fieldLabel}>
              변경 사유
            </Label>
            <Textarea
              id="installment-promise-reason"
              name="reason"
              value={reason}
              rows={3}
              maxLength={MAX_PROMISE_REASON_LENGTH}
              aria-required
              disabled={isSubmitting}
              onChange={changeReason}
              aria-invalid={fieldErrors?.reason ? true : undefined}
              aria-describedby={fieldErrors?.reason ? reasonErrorId : undefined}
            />
            {fieldErrors?.reason ? (
              <p id={reasonErrorId} className="text-sm text-destructive">
                {fieldErrors.reason}
              </p>
            ) : null}
          </div>
          {formError ? (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog} disabled={isSubmitting}>
              취소
            </Button>
            <Button type="submit" disabled={!canSave} aria-busy={isSubmitting}>
              {isSubmitting ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
