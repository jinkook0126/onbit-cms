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
import { useInstallmentPaymentForm } from '~/features/customers/hooks/useInstallmentPaymentForm';
import {
  installmentScheduleLabel,
  isPaymentMethod,
  paymentMethodLabels,
} from '~/features/customers/type';
import { fieldLabel, sectionDescription } from '~/lib/styles';

import type { JSX, SubmitEvent } from 'react';
import type { InstallmentListItem, PaymentMethod } from '~/features/customers/type';

const paymentMethods = Object.keys(paymentMethodLabels) as PaymentMethod[];

type OutsideEvent = {
  preventDefault: () => void;
  target: EventTarget | null;
};

function isDatePickerTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[data-slot="popover-content"]') !== null;
}

type InstallmentPaymentDialogProps = {
  customerId: string;
  installments: InstallmentListItem[];
};

export function InstallmentPaymentDialog({
  customerId,
  installments,
}: InstallmentPaymentDialogProps): JSX.Element {
  const form = useInstallmentPaymentForm(customerId, installments);

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      form.closeDialog();
    }
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
      <Button type="button" onClick={form.openDialog}>
        입금 등록하기
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
                입금액, 입금일, 회차와 수단을 입력하세요.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="installment-payment-amount" className={fieldLabel}>
                입금액
              </Label>
              <Input
                id="installment-payment-amount"
                name="amount"
                inputMode="numeric"
                value={form.amount}
                disabled={form.isSubmitting}
                autoComplete="off"
                aria-invalid={form.fieldErrors?.amount ? true : undefined}
                aria-describedby={
                  form.fieldErrors?.amount ? 'installment-payment-amount-error' : undefined
                }
                onChange={form.changeAmount}
              />
              {form.fieldErrors?.amount ? (
                <p id="installment-payment-amount-error" className="text-sm text-destructive">
                  {form.fieldErrors.amount}
                </p>
              ) : null}
            </div>
            <CustomerNextContactField
              id="installment-payment-date"
              label="입금일"
              value={form.paidOn}
              invalid={form.fieldErrors?.paidOn !== undefined}
              message={form.fieldErrors?.paidOn}
              disabled={form.isSubmitting}
              clearable={false}
              onChange={form.changePaidOn}
            />
            <div className="grid gap-2">
              <Label htmlFor="installment-payment-target" className={fieldLabel}>
                회차
              </Label>
              <Select
                value={form.installmentId === '' ? undefined : form.installmentId}
                disabled={form.isSubmitting}
                onValueChange={handleInstallmentChange}
              >
                <SelectTrigger
                  id="installment-payment-target"
                  className="w-full"
                  aria-invalid={form.fieldErrors?.installmentId ? true : undefined}
                  aria-describedby={
                    form.fieldErrors?.installmentId
                      ? 'installment-payment-target-error'
                      : undefined
                  }
                >
                  <SelectValue placeholder="회차를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {installments.map((installment) => (
                    <SelectItem key={installment.id} value={installment.id}>
                      {installmentScheduleLabel(installment)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.fieldErrors?.installmentId ? (
                <p id="installment-payment-target-error" className="text-sm text-destructive">
                  {form.fieldErrors.installmentId}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="installment-payment-method" className={fieldLabel}>
                수단
              </Label>
              <Select
                value={form.method === '' ? undefined : form.method}
                disabled={form.isSubmitting}
                onValueChange={handleMethodChange}
              >
                <SelectTrigger
                  id="installment-payment-method"
                  className="w-full"
                  aria-invalid={form.fieldErrors?.method ? true : undefined}
                  aria-describedby={
                    form.fieldErrors?.method ? 'installment-payment-method-error' : undefined
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
                <p id="installment-payment-method-error" className="text-sm text-destructive">
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
                onClick={form.closeDialog}
                disabled={form.isSubmitting}
              >
                취소
              </Button>
              <Button type="submit" disabled={form.isSubmitting} aria-busy={form.isSubmitting}>
                {form.isSubmitting ? '등록 중...' : '등록'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
