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
import { Textarea } from '~/components/ui/textarea';
import { CustomerNextContactField } from '~/features/customers/components/CustomerNextContactField';
import { useRefundForm } from '~/features/customers/hooks/useRefundForm';
import { MAX_REFUND_REASON_LENGTH } from '~/features/customers/type';
import { fieldLabel, sectionDescription } from '~/lib/styles';

import type { JSX, SubmitEvent } from 'react';
import type { RefundSource } from '~/features/customers/type';

const wonFormat = new Intl.NumberFormat('ko-KR');

type OutsideEvent = {
  preventDefault: () => void;
  target: EventTarget | null;
};

function isDatePickerTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[data-slot="popover-content"]') !== null;
}

function refundSourceLabel(source: RefundSource): string {
  return `${source.paidOn} · ${wonFormat.format(source.refundableAmount)}원`;
}

type RefundDialogProps = {
  customerId: string;
  refundSources: RefundSource[];
};

export function RefundDialog({ customerId, refundSources }: RefundDialogProps): JSX.Element {
  const form = useRefundForm(customerId);
  const reasonErrorId = 'refund-reason-error';

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      form.closeDialog();
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    form.submitRefund();
  }

  function preventOutsideDismiss(event: OutsideEvent): void {
    if (form.isSubmitting || isDatePickerTarget(event.target)) {
      event.preventDefault();
    }
  }

  return (
    <>
      <Button type="button" onClick={form.openDialog}>
        환불등록
      </Button>
      <Dialog open={form.open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={!form.isSubmitting}
          onInteractOutside={preventOutsideDismiss}
          onPointerDownOutside={preventOutsideDismiss}
        >
          <form noValidate className="grid gap-4" onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>환불 등록</DialogTitle>
              <DialogDescription className={sectionDescription}>
                원입금, 환불금액, 환불일과 환불 사유를 입력하세요.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="refund-payment" className={fieldLabel}>
                원입금
              </Label>
              <Select
                value={form.paymentId === '' ? undefined : form.paymentId}
                disabled={form.isSubmitting}
                onValueChange={form.changePayment}
              >
                <SelectTrigger
                  id="refund-payment"
                  className="w-full"
                  aria-invalid={form.fieldErrors?.paymentId ? true : undefined}
                  aria-describedby={form.fieldErrors?.paymentId ? 'refund-payment-error' : undefined}
                >
                  <SelectValue placeholder="원입금을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {refundSources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {refundSourceLabel(source)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.fieldErrors?.paymentId ? (
                <p id="refund-payment-error" className="text-sm text-destructive">
                  {form.fieldErrors.paymentId}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="refund-amount" className={fieldLabel}>
                환불금액
              </Label>
              <Input
                id="refund-amount"
                name="amount"
                inputMode="numeric"
                value={form.amount}
                disabled={form.isSubmitting}
                autoComplete="off"
                aria-invalid={form.fieldErrors?.amount ? true : undefined}
                aria-describedby={form.fieldErrors?.amount ? 'refund-amount-error' : undefined}
                onChange={form.changeAmount}
              />
              {form.fieldErrors?.amount ? (
                <p id="refund-amount-error" className="text-sm text-destructive">
                  {form.fieldErrors.amount}
                </p>
              ) : null}
            </div>
            <CustomerNextContactField
              id="refund-date"
              label="환불일"
              value={form.refundedOn}
              invalid={form.fieldErrors?.refundedOn !== undefined}
              message={form.fieldErrors?.refundedOn}
              disabled={form.isSubmitting}
              clearable={false}
              onChange={form.changeRefundedOn}
            />
            <div className="grid gap-2">
              <Label htmlFor="refund-reason" className={fieldLabel}>
                환불 사유
              </Label>
              <Textarea
                id="refund-reason"
                name="reason"
                value={form.reason}
                rows={3}
                maxLength={MAX_REFUND_REASON_LENGTH}
                aria-required
                disabled={form.isSubmitting}
                onChange={form.changeReason}
                aria-invalid={form.fieldErrors?.reason ? true : undefined}
                aria-describedby={form.fieldErrors?.reason ? reasonErrorId : undefined}
              />
              {form.fieldErrors?.reason ? (
                <p id={reasonErrorId} className="text-sm text-destructive">
                  {form.fieldErrors.reason}
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
