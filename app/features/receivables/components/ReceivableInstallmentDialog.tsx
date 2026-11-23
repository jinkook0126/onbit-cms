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
import { CustomerNextContactField } from '~/features/customers/components/CustomerNextContactField';
import { installmentScheduleLabel } from '~/features/customers/type';
import { useReceivableInstallmentForm } from '~/features/receivables/hooks/useReceivableInstallmentForm';
import { formatWon } from '~/lib/money';
import { fieldLabel, sectionDescription } from '~/lib/styles';

import type { JSX, SubmitEvent } from 'react';
import type { ReceivablePlanItem } from '~/features/receivables/type';

type ReceivableInstallmentDialogProps = {
  customerId: string;
  plan: ReceivablePlanItem;
  onClose: () => void;
};

type OutsideEvent = {
  preventDefault: () => void;
  target: EventTarget | null;
};

function isDatePickerTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[data-slot="popover-content"]') !== null;
}

export function ReceivableInstallmentDialog({
  customerId,
  plan,
  onClose,
}: ReceivableInstallmentDialogProps): JSX.Element {
  const form = useReceivableInstallmentForm(customerId, plan, onClose);
  const label = installmentScheduleLabel(plan);
  const receivedNote =
    plan.receivedAmount > 0
      ? ` 이미 받은 ${formatWon(plan.receivedAmount)}보다 작은 예정액은 저장할 수 없습니다.`
      : '';

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      form.closeDialog();
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    form.submitInstallment();
  }

  function preventOutsideDismiss(event: OutsideEvent): void {
    if (form.isSubmitting || isDatePickerTarget(event.target)) {
      event.preventDefault();
    }
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!form.isSubmitting}
        onInteractOutside={preventOutsideDismiss}
        onPointerDownOutside={preventOutsideDismiss}
      >
        <form noValidate className="grid gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{label} 변경</DialogTitle>
            <DialogDescription className={sectionDescription}>
              {label}의 예정일과 예정액을 입력하세요.{receivedNote}
            </DialogDescription>
          </DialogHeader>
          <CustomerNextContactField
            id="receivable-installment-date"
            label="예정일"
            value={form.promisedOn}
            invalid={form.fieldErrors?.promisedOn !== undefined}
            message={form.fieldErrors?.promisedOn}
            disabled={form.isSubmitting}
            clearable={false}
            onChange={form.changePromisedOn}
          />
          <div className="grid gap-2">
            <Label htmlFor="receivable-installment-amount" className={fieldLabel}>
              예정액
            </Label>
            <Input
              id="receivable-installment-amount"
              name="scheduledAmount"
              inputMode="numeric"
              value={form.scheduledAmount}
              disabled={form.isSubmitting}
              autoComplete="off"
              aria-invalid={form.fieldErrors?.scheduledAmount ? true : undefined}
              aria-describedby={
                form.fieldErrors?.scheduledAmount
                  ? 'receivable-installment-amount-error'
                  : undefined
              }
              onChange={form.changeScheduledAmount}
            />
            {form.fieldErrors?.scheduledAmount ? (
              <p id="receivable-installment-amount-error" className="text-sm text-destructive">
                {form.fieldErrors.scheduledAmount}
              </p>
            ) : null}
          </div>
          {form.formError ? (
            <p role="alert" className="text-sm text-destructive">
              {form.formError}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={form.isSubmitting}
              onClick={form.closeDialog}
            >
              취소
            </Button>
            <Button type="submit" disabled={form.isSubmitting} aria-busy={form.isSubmitting}>
              {form.isSubmitting ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
