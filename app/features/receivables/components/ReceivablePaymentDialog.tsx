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
import {
  installmentScheduleLabel,
  isPaymentMethod,
  paymentMethodLabels,
} from '~/features/customers/type';
import { useReceivablePaymentForm } from '~/features/receivables/hooks/useReceivablePaymentForm';
import { formatWon } from '~/lib/money';
import { fieldLabel, sectionDescription } from '~/lib/styles';

import type { JSX, SubmitEvent } from 'react';
import type { PaymentMethod } from '~/features/customers/type';
import type { ReceivablePlanItem } from '~/features/receivables/type';

const paymentMethods = Object.keys(paymentMethodLabels) as PaymentMethod[];

type ReceivablePaymentDialogProps = {
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

function paymentOptionLabel(plan: ReceivablePlanItem): string {
  return `${installmentScheduleLabel(plan)} · 남은 ${formatWon(plan.remainingAmount)}`;
}

export function ReceivablePaymentDialog({
  customerId,
  plans,
}: ReceivablePaymentDialogProps): JSX.Element {
  const form = useReceivablePaymentForm(customerId);

  function handleOpenChange(nextOpen: boolean): void {
    if (nextOpen) {
      form.openDialog();
      return;
    }
    form.closeDialog();
  }

  function handleInstallmentChange(value: string): void {
    form.changeInstallment(value);
  }

  function handleMethodChange(value: string): void {
    if (isPaymentMethod(value)) {
      form.changeMethod(value);
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    form.submitPayment();
  }

  function preventOutsideDismiss(event: OutsideEvent): void {
    if (form.isSubmitting || isDatePickerTarget(event.target)) {
      event.preventDefault();
    }
  }

  return (
    <>
      <Button type="button" size="lg" onClick={form.openDialog}>
        입금 등록
      </Button>
      <Dialog open={form.open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={!form.isSubmitting}
          onInteractOutside={preventOutsideDismiss}
          onPointerDownOutside={preventOutsideDismiss}
        >
          <form noValidate className="grid gap-4" onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>입금 등록</DialogTitle>
              <DialogDescription className={sectionDescription}>
                계약금 또는 회차를 선택하고 입금일과 입금액을 입력하세요. 남은 금액보다 큰 금액은
                등록할 수 없습니다.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="receivable-payment-target" className={fieldLabel}>
                회차
              </Label>
              <Select
                value={form.installmentId === '' ? undefined : form.installmentId}
                disabled={form.isSubmitting || plans.length === 0}
                onValueChange={handleInstallmentChange}
              >
                <SelectTrigger
                  id="receivable-payment-target"
                  className="w-full"
                  aria-invalid={form.fieldErrors?.installmentId ? true : undefined}
                  aria-describedby={
                    form.fieldErrors?.installmentId ? 'receivable-payment-target-error' : undefined
                  }
                >
                  <SelectValue
                    placeholder={plans.length === 0 ? '분납 계획이 없습니다' : '회차를 선택하세요'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem
                      key={plan.id}
                      value={plan.id}
                      disabled={plan.remainingAmount === 0}
                    >
                      {paymentOptionLabel(plan)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.fieldErrors?.installmentId ? (
                <p id="receivable-payment-target-error" className="text-sm text-destructive">
                  {form.fieldErrors.installmentId}
                </p>
              ) : null}
            </div>
            <CustomerNextContactField
              id="receivable-payment-date"
              label="입금일"
              value={form.paidOn}
              invalid={form.fieldErrors?.paidOn !== undefined}
              message={form.fieldErrors?.paidOn}
              disabled={form.isSubmitting}
              onChange={form.changePaidOn}
            />
            <div className="grid gap-2">
              <Label htmlFor="receivable-payment-amount" className={fieldLabel}>
                입금액
              </Label>
              <Input
                id="receivable-payment-amount"
                name="amount"
                inputMode="numeric"
                value={form.amount}
                disabled={form.isSubmitting}
                autoComplete="off"
                aria-invalid={form.fieldErrors?.amount ? true : undefined}
                aria-describedby={
                  form.fieldErrors?.amount ? 'receivable-payment-amount-error' : undefined
                }
                onChange={form.changeAmount}
              />
              {form.fieldErrors?.amount ? (
                <p id="receivable-payment-amount-error" className="text-sm text-destructive">
                  {form.fieldErrors.amount}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="receivable-payment-method" className={fieldLabel}>
                수단
              </Label>
              <Select
                value={form.method === '' ? undefined : form.method}
                disabled={form.isSubmitting}
                onValueChange={handleMethodChange}
              >
                <SelectTrigger
                  id="receivable-payment-method"
                  className="w-full"
                  aria-invalid={form.fieldErrors?.method ? true : undefined}
                  aria-describedby={
                    form.fieldErrors?.method ? 'receivable-payment-method-error' : undefined
                  }
                >
                  <SelectValue placeholder="수단을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((paymentMethod) => (
                    <SelectItem key={paymentMethod} value={paymentMethod}>
                      {paymentMethodLabels[paymentMethod]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.fieldErrors?.method ? (
                <p id="receivable-payment-method-error" className="text-sm text-destructive">
                  {form.fieldErrors.method}
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
                {form.isSubmitting ? '등록 중...' : '저장'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
