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
import { useReceivablePlanForm } from '~/features/receivables/hooks/useReceivablePlanForm';
import { fieldLabel, sectionDescription } from '~/lib/styles';

import type { JSX, SubmitEvent } from 'react';
import type { ReceivablePlanItem } from '~/features/receivables/type';

type ReceivablePlanDialogProps = {
  customerId: string;
  plans: ReceivablePlanItem[];
};

type OutsideEvent = {
  preventDefault: () => void;
  target: EventTarget | null;
};

function isDatePickerTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[data-slot="popover-content"]') !== null;
}

function planDefaults(plans: ReceivablePlanItem[]): {
  deposit: string;
  installmentCount: string;
  paidOn: string;
  amount: string;
} {
  const deposit = plans.find((plan) => plan.kind === 'DEPOSIT');
  const rounds = plans.filter((plan) => plan.kind === 'INSTALLMENT');
  const depositAmount = deposit ? String(deposit.scheduledAmount) : '';
  if (rounds.length === 0) {
    return { deposit: depositAmount, installmentCount: '', paidOn: '', amount: '' };
  }
  const first = rounds[0];
  const sameAmount = rounds.every((round) => round.scheduledAmount === first.scheduledAmount);
  return {
    deposit: depositAmount,
    installmentCount: String(rounds.length),
    paidOn: first.promisedOn,
    amount: sameAmount ? String(first.scheduledAmount) : '',
  };
}

export function ReceivablePlanDialog({
  customerId,
  plans,
}: ReceivablePlanDialogProps): JSX.Element {
  const form = useReceivablePlanForm(customerId, planDefaults(plans));

  function handleOpenChange(nextOpen: boolean): void {
    if (nextOpen) {
      form.openDialog();
      return;
    }
    form.closeDialog();
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    form.submitPlan();
  }

  function preventOutsideDismiss(event: OutsideEvent): void {
    if (form.isSubmitting || isDatePickerTarget(event.target)) {
      event.preventDefault();
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="lg" onClick={form.openDialog}>
        분납계획 수정
      </Button>
      <Dialog open={form.open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={!form.isSubmitting}
          onInteractOutside={preventOutsideDismiss}
          onPointerDownOutside={preventOutsideDismiss}
        >
          <form noValidate className="grid gap-4" onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>분납계획 수정</DialogTitle>
              <DialogDescription className={sectionDescription}>
                계약금 예정일은 수임날짜입니다. 수납일은 1회차이고, 다음 회차는 한 달씩 뒤로
                잡습니다. 수납액은 회차마다 같은 예정액입니다.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="receivable-plan-deposit" className={fieldLabel}>
                계약금
              </Label>
              <Input
                id="receivable-plan-deposit"
                name="deposit"
                inputMode="numeric"
                value={form.deposit}
                disabled={form.isSubmitting}
                autoComplete="off"
                aria-invalid={form.fieldErrors?.deposit ? true : undefined}
                aria-describedby={
                  form.fieldErrors?.deposit ? 'receivable-plan-deposit-error' : undefined
                }
                onChange={form.changeDeposit}
              />
              {form.fieldErrors?.deposit ? (
                <p id="receivable-plan-deposit-error" className="text-sm text-destructive">
                  {form.fieldErrors.deposit}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="receivable-plan-count" className={fieldLabel}>
                회차
              </Label>
              <Input
                id="receivable-plan-count"
                name="installmentCount"
                inputMode="numeric"
                value={form.installmentCount}
                disabled={form.isSubmitting}
                autoComplete="off"
                aria-invalid={form.fieldErrors?.installmentCount ? true : undefined}
                aria-describedby={
                  form.fieldErrors?.installmentCount ? 'receivable-plan-count-error' : undefined
                }
                onChange={form.changeInstallmentCount}
              />
              {form.fieldErrors?.installmentCount ? (
                <p id="receivable-plan-count-error" className="text-sm text-destructive">
                  {form.fieldErrors.installmentCount}
                </p>
              ) : null}
            </div>
            <CustomerNextContactField
              id="receivable-plan-paid-on"
              label="수납일"
              value={form.paidOn}
              invalid={form.fieldErrors?.paidOn !== undefined}
              message={form.fieldErrors?.paidOn}
              disabled={form.isSubmitting}
              onChange={form.changePaidOn}
            />
            <div className="grid gap-2">
              <Label htmlFor="receivable-plan-amount" className={fieldLabel}>
                수납액
              </Label>
              <Input
                id="receivable-plan-amount"
                name="amount"
                inputMode="numeric"
                value={form.amount}
                disabled={form.isSubmitting}
                autoComplete="off"
                aria-invalid={form.fieldErrors?.amount ? true : undefined}
                aria-describedby={
                  form.fieldErrors?.amount ? 'receivable-plan-amount-error' : undefined
                }
                onChange={form.changeAmount}
              />
              {form.fieldErrors?.amount ? (
                <p id="receivable-plan-amount-error" className="text-sm text-destructive">
                  {form.fieldErrors.amount}
                </p>
              ) : null}
            </div>
            {form.formError ? (
              <p className="text-sm text-destructive" role="alert">
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
    </>
  );
}
