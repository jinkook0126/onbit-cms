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
import { useCustomerCreateForm } from '~/features/customers/hooks/useCustomerCreateForm';
import {
  MAX_CUSTOMER_NAME_LENGTH,
  MAX_CUSTOMER_PHONE_LENGTH,
  customerFormError,
  inflowSourceLabels,
} from '~/features/customers/type';
import { ApiError } from '~/lib/apiClient';
import { fieldLabel, sectionDescription } from '~/lib/styles';

import type { JSX, SubmitEvent } from 'react';
import type { InflowSource } from '~/features/customers/type';

const sources = Object.keys(inflowSourceLabels) as InflowSource[];

function isInflowSource(value: string): value is InflowSource {
  return sources.some((source) => source === value);
}

function assigneeErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return customerFormError(error.body) ?? '상담 담당 목록을 불러오지 못했습니다.';
  }
  return '상담 담당 목록을 불러오지 못했습니다.';
}

type OutsideEvent = {
  preventDefault: () => void;
  target: EventTarget | null;
};

function isDatePickerTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[data-slot="popover-content"]') !== null;
}

export function CustomerCreateDrawer(): JSX.Element {
  const {
    open,
    name,
    phone,
    source,
    assigneeId,
    nextContactOn,
    assignees,
    fieldErrors,
    formError,
    isSubmitting,
    openDrawer,
    closeDrawer,
    changeName,
    changePhone,
    changeSource,
    changeAssignee,
    changeNextContactOn,
    submitCustomer,
  } = useCustomerCreateForm();

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      closeDrawer();
    }
  }

  function handleSourceChange(value: string): void {
    if (isInflowSource(value)) {
      changeSource(value);
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    submitCustomer();
  }

  function preventOutsideDismiss(event: OutsideEvent): void {
    if (isSubmitting || isDatePickerTarget(event.target)) {
      event.preventDefault();
    }
  }

  return (
    <>
      <Button type="button" size="lg" onClick={openDrawer}>
        상담등록
      </Button>
      <Drawer open={open} direction="right" onOpenChange={handleOpenChange}>
        <DrawerContent
          className="data-[vaul-drawer-direction=right]:sm:max-w-md"
          onInteractOutside={preventOutsideDismiss}
          onPointerDownOutside={preventOutsideDismiss}
        >
          <form noValidate className="flex h-full flex-col" onSubmit={handleSubmit}>
            <DrawerHeader>
              <DrawerTitle>상담 등록</DrawerTitle>
              <DrawerDescription className={sectionDescription}>
                고객명, 연락처, 유입처, 담당, 다음 상담일을 입력하세요.
              </DrawerDescription>
            </DrawerHeader>
            <div className="grid gap-4 overflow-y-auto px-4 pb-4">
              <div className="grid gap-2">
                <Label htmlFor="customer-name" className={fieldLabel}>
                  고객명
                </Label>
                <Input
                  id="customer-name"
                  name="name"
                  value={name}
                  maxLength={MAX_CUSTOMER_NAME_LENGTH}
                  autoComplete="name"
                  aria-invalid={fieldErrors?.name ? true : undefined}
                  aria-describedby={fieldErrors?.name ? 'customer-name-error' : undefined}
                  onChange={changeName}
                />
                {fieldErrors?.name ? (
                  <p id="customer-name-error" className="text-sm text-destructive">
                    {fieldErrors.name}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="customer-phone" className={fieldLabel}>
                  연락처
                </Label>
                <Input
                  id="customer-phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  maxLength={MAX_CUSTOMER_PHONE_LENGTH}
                  autoComplete="tel"
                  placeholder="01012345678"
                  aria-invalid={fieldErrors?.phone ? true : undefined}
                  aria-describedby={fieldErrors?.phone ? 'customer-phone-error' : undefined}
                  onChange={changePhone}
                />
                {fieldErrors?.phone ? (
                  <p id="customer-phone-error" className="text-sm text-destructive">
                    {fieldErrors.phone}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="customer-source" className={fieldLabel}>
                  유입처
                </Label>
                <Select
                  value={source === '' ? undefined : source}
                  onValueChange={handleSourceChange}
                >
                  <SelectTrigger
                    id="customer-source"
                    className="w-full"
                    aria-invalid={fieldErrors?.source ? true : undefined}
                    aria-describedby={fieldErrors?.source ? 'customer-source-error' : undefined}
                  >
                    <SelectValue placeholder="유입처를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map((item) => (
                      <SelectItem key={item} value={item}>
                        {inflowSourceLabels[item]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors?.source ? (
                  <p id="customer-source-error" className="text-sm text-destructive">
                    {fieldErrors.source}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="customer-assignee" className={fieldLabel}>
                  담당
                </Label>
                <Select
                  value={assigneeId === '' ? undefined : assigneeId}
                  disabled={assignees.isPending || assignees.isError || isSubmitting}
                  onValueChange={changeAssignee}
                >
                  <SelectTrigger
                    id="customer-assignee"
                    className="w-full"
                    aria-invalid={fieldErrors?.assigneeId ? true : undefined}
                    aria-describedby={
                      fieldErrors?.assigneeId ? 'customer-assignee-error' : undefined
                    }
                  >
                    <SelectValue placeholder="담당을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignees.data?.assignees.map((assignee) => (
                      <SelectItem key={assignee.id} value={assignee.id}>
                        {assignee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {assignees.isError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {assigneeErrorMessage(assignees.error)}
                  </p>
                ) : null}
                {fieldErrors?.assigneeId ? (
                  <p id="customer-assignee-error" className="text-sm text-destructive">
                    {fieldErrors.assigneeId}
                  </p>
                ) : null}
              </div>
              <CustomerNextContactField
                value={nextContactOn}
                invalid={fieldErrors?.nextContactOn !== undefined}
                message={fieldErrors?.nextContactOn}
                disabled={isSubmitting}
                onChange={changeNextContactOn}
              />
              {formError ? (
                <p className="text-sm text-destructive" role="alert">
                  {formError}
                </p>
              ) : null}
            </div>
            <DrawerFooter>
              <Button type="submit" size="lg" disabled={isSubmitting || assignees.isError}>
                저장
              </Button>
              <DrawerClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
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
