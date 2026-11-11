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
import { MAX_LOGIN_ID_LENGTH } from '~/features/auth/type';
import { useCompanyCreateForm } from '~/features/companies/hooks/useCompanyCreateForm';
import { MAX_COMPANY_NAME_LENGTH } from '~/features/companies/type';

import type { JSX, SubmitEvent } from 'react';

function preventDialogDismiss(event: { preventDefault: () => void }): void {
  event.preventDefault();
}

export function CompanyCreateDialog(): JSX.Element {
  const {
    open,
    name,
    loginId,
    fieldErrors,
    formError,
    isSubmitting,
    openDialog,
    closeDialog,
    changeName,
    changeLoginId,
    submitCompany,
  } = useCompanyCreateForm();

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      closeDialog();
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    submitCompany();
  }

  return (
    <>
      <Button type="button" size="lg" onClick={openDialog}>
        회사 추가
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={!isSubmitting}
          onInteractOutside={isSubmitting ? preventDialogDismiss : undefined}
          onPointerDownOutside={isSubmitting ? preventDialogDismiss : undefined}
        >
          <form noValidate className="grid gap-4" onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>회사 추가</DialogTitle>
              <DialogDescription>회사 이름과 아이디를 입력하세요.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="company-name">회사 이름</Label>
              <Input
                id="company-name"
                name="name"
                value={name}
                autoComplete="organization"
                maxLength={MAX_COMPANY_NAME_LENGTH}
                aria-required
                disabled={isSubmitting}
                onChange={changeName}
                aria-invalid={fieldErrors?.name ? true : undefined}
                aria-describedby={fieldErrors?.name ? 'company-name-error' : undefined}
              />
              {fieldErrors?.name ? (
                <p id="company-name-error" className="text-sm text-destructive">
                  {fieldErrors.name}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company-login-id">아이디</Label>
              <Input
                id="company-login-id"
                name="loginId"
                value={loginId}
                autoComplete="off"
                maxLength={MAX_LOGIN_ID_LENGTH}
                aria-required
                disabled={isSubmitting}
                onChange={changeLoginId}
                aria-invalid={fieldErrors?.loginId ? true : undefined}
                aria-describedby={fieldErrors?.loginId ? 'company-login-id-error' : undefined}
              />
              {fieldErrors?.loginId ? (
                <p id="company-login-id-error" className="text-sm text-destructive">
                  {fieldErrors.loginId}
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
              <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
                {isSubmitting ? '저장 중...' : '저장'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
