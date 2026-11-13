import { Handshake } from 'lucide-react';

import { Button } from '~/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '~/components/ui/drawer';
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
import { useRetainCustomer } from '~/features/customers/hooks/useRetainCustomer';
import { caseTypeLabels } from '~/features/customers/type';
import { fieldLabel, sectionDescription } from '~/lib/styles';

import type { JSX, SubmitEvent } from 'react';
import type { CaseType } from '~/features/customers/type';

const caseTypes = Object.keys(caseTypeLabels) as CaseType[];

function isCaseType(value: string): value is CaseType {
  return caseTypes.some((caseType) => caseType === value);
}

type OutsideEvent = {
  preventDefault: () => void;
  target: EventTarget | null;
};

function isDatePickerTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[data-slot="popover-content"]') !== null;
}

type RetainCustomerButtonProps = {
  customerId: string;
};

export function RetainCustomerButton({ customerId }: RetainCustomerButtonProps): JSX.Element {
  const form = useRetainCustomer(customerId);

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      form.closeDrawer();
    }
  }

  function handleCaseTypeChange(value: string): void {
    if (isCaseType(value)) {
      form.changeCaseType(value);
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    form.submitRetain();
  }

  function preventOutsideDismiss(event: OutsideEvent): void {
    if (form.isSubmitting || isDatePickerTarget(event.target)) {
      event.preventDefault();
    }
  }

  return (
    <>
      <Button type="button" size="lg" onClick={form.openDrawer}>
        <Handshake />
        수임 전환
      </Button>
      <Drawer open={form.open} direction="right" onOpenChange={handleOpenChange}>
        <DrawerContent
          className="data-[vaul-drawer-direction=right]:sm:max-w-md"
          onInteractOutside={preventOutsideDismiss}
          onPointerDownOutside={preventOutsideDismiss}
        >
          <form noValidate className="flex h-full flex-col" onSubmit={handleSubmit}>
            <DrawerHeader>
              <DrawerTitle>수임 전환</DrawerTitle>
              <DrawerDescription className={sectionDescription}>
                계약 정보를 입력하면 상담 상태가 수임으로 바뀝니다.
              </DrawerDescription>
            </DrawerHeader>
            <div className="grid gap-4 overflow-y-auto px-4 pb-4">
              <CustomerNextContactField
                id="retain-contracted-on"
                label="계약일"
                value={form.contractedOn}
                invalid={form.fieldErrors?.contractedOn !== undefined}
                message={form.fieldErrors?.contractedOn}
                disabled={form.isSubmitting}
                onChange={form.changeContractedOn}
              />
              <div className="grid gap-2">
                <Label htmlFor="retain-case-type" className={fieldLabel}>
                  사건유형
                </Label>
                <Select
                  value={form.caseType === '' ? undefined : form.caseType}
                  disabled={form.isSubmitting}
                  onValueChange={handleCaseTypeChange}
                >
                  <SelectTrigger
                    id="retain-case-type"
                    className="w-full"
                    aria-invalid={form.fieldErrors?.caseType ? true : undefined}
                    aria-describedby={
                      form.fieldErrors?.caseType ? 'retain-case-type-error' : undefined
                    }
                  >
                    <SelectValue placeholder="사건유형을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {caseTypes.map((caseType) => (
                      <SelectItem key={caseType} value={caseType}>
                        {caseTypeLabels[caseType]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.fieldErrors?.caseType ? (
                  <p id="retain-case-type-error" className="text-sm text-destructive">
                    {form.fieldErrors.caseType}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="retain-fee" className={fieldLabel}>
                  수임료
                </Label>
                <Input
                  id="retain-fee"
                  name="retainerFee"
                  inputMode="numeric"
                  value={form.retainerFee}
                  disabled={form.isSubmitting}
                  autoComplete="off"
                  aria-invalid={form.fieldErrors?.retainerFee ? true : undefined}
                  aria-describedby={form.fieldErrors?.retainerFee ? 'retain-fee-error' : undefined}
                  onChange={form.changeRetainerFee}
                />
                {form.fieldErrors?.retainerFee ? (
                  <p id="retain-fee-error" className="text-sm text-destructive">
                    {form.fieldErrors.retainerFee}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="retain-deposit" className={fieldLabel}>
                  계약금
                </Label>
                <Input
                  id="retain-deposit"
                  name="deposit"
                  inputMode="numeric"
                  value={form.deposit}
                  disabled={form.isSubmitting}
                  autoComplete="off"
                  aria-invalid={form.fieldErrors?.deposit ? true : undefined}
                  aria-describedby={form.fieldErrors?.deposit ? 'retain-deposit-error' : undefined}
                  onChange={form.changeDeposit}
                />
                {form.fieldErrors?.deposit ? (
                  <p id="retain-deposit-error" className="text-sm text-destructive">
                    {form.fieldErrors.deposit}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="retain-installment-count" className={fieldLabel}>
                  분납회수
                </Label>
                <Input
                  id="retain-installment-count"
                  name="installmentCount"
                  inputMode="numeric"
                  value={form.installmentCount}
                  disabled={form.isSubmitting}
                  autoComplete="off"
                  aria-invalid={form.fieldErrors?.installmentCount ? true : undefined}
                  aria-describedby={
                    form.fieldErrors?.installmentCount
                      ? 'retain-installment-count-error'
                      : undefined
                  }
                  onChange={form.changeInstallmentCount}
                />
                {form.fieldErrors?.installmentCount ? (
                  <p id="retain-installment-count-error" className="text-sm text-destructive">
                    {form.fieldErrors.installmentCount}
                  </p>
                ) : null}
              </div>
              <CustomerNextContactField
                id="retain-first-payment"
                label="첫 회차 납부일"
                value={form.firstPaymentOn}
                invalid={form.fieldErrors?.firstPaymentOn !== undefined}
                message={form.fieldErrors?.firstPaymentOn}
                disabled={form.isSubmitting}
                onChange={form.changeFirstPaymentOn}
              />
              {form.formError ? (
                <p className="text-sm text-destructive" role="alert">
                  {form.formError}
                </p>
              ) : null}
            </div>
            <DrawerFooter>
              <Button
                type="submit"
                size="lg"
                disabled={form.isSubmitting}
                aria-busy={form.isSubmitting}
              >
                {form.isSubmitting ? '전환 중...' : '수임 전환'}
              </Button>
              <DrawerClose asChild>
                <Button type="button" variant="outline" disabled={form.isSubmitting}>
                  취소
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </>
  );
}
