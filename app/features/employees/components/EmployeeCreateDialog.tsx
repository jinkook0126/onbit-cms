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
import { useEmployeeCreateForm } from '~/features/employees/hooks/useEmployeeCreateForm';
import { EMPLOYEE_LOGIN_ID_PLACEHOLDER, MAX_EMPLOYEE_LOGIN_ID_LENGTH } from '~/features/employees/type';
import { MAX_ACCOUNT_NAME_LENGTH } from '~/features/settings/type';
import { fieldLabel, sectionDescription } from '~/lib/styles';

import type { JSX, SubmitEvent } from 'react';

type EmployeeCreateDialogProps = {
  companyId: string;
};

function preventDialogDismiss(event: { preventDefault: () => void }): void {
  event.preventDefault();
}

export function EmployeeCreateDialog({ companyId }: EmployeeCreateDialogProps): JSX.Element {
  const {
    open,
    loginId,
    name,
    fieldErrors,
    formError,
    isSubmitting,
    openDialog,
    closeDialog,
    changeLoginId,
    changeName,
    submitEmployee,
  } = useEmployeeCreateForm(companyId);

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      closeDialog();
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    submitEmployee();
  }

  return (
    <>
      <Button type="button" size="lg" onClick={openDialog}>
        직원 등록
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={!isSubmitting}
          onInteractOutside={isSubmitting ? preventDialogDismiss : undefined}
          onPointerDownOutside={isSubmitting ? preventDialogDismiss : undefined}
        >
          <form noValidate className="grid gap-4" onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>직원 등록</DialogTitle>
              <DialogDescription className={sectionDescription}>
                아이디와 이름을 입력하세요. 초기 비밀번호는 아이디와 같습니다.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="employee-login-id" className={fieldLabel}>
                아이디
              </Label>
              <Input
                id="employee-login-id"
                name="loginId"
                value={loginId}
                placeholder={EMPLOYEE_LOGIN_ID_PLACEHOLDER}
                autoComplete="off"
                className="font-medium"
                maxLength={MAX_EMPLOYEE_LOGIN_ID_LENGTH}
                aria-required
                disabled={isSubmitting}
                onChange={changeLoginId}
                aria-invalid={fieldErrors?.loginId ? true : undefined}
                aria-describedby={fieldErrors?.loginId ? 'employee-login-id-error' : undefined}
              />
              {fieldErrors?.loginId ? (
                <p id="employee-login-id-error" className="text-sm text-destructive">
                  {fieldErrors.loginId}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="employee-name" className={fieldLabel}>
                이름
              </Label>
              <Input
                id="employee-name"
                name="name"
                value={name}
                autoComplete="name"
                className="font-medium"
                maxLength={MAX_ACCOUNT_NAME_LENGTH}
                aria-required
                disabled={isSubmitting}
                onChange={changeName}
                aria-invalid={fieldErrors?.name ? true : undefined}
                aria-describedby={fieldErrors?.name ? 'employee-name-error' : undefined}
              />
              {fieldErrors?.name ? (
                <p id="employee-name-error" className="text-sm text-destructive">
                  {fieldErrors.name}
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
