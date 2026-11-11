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
import { PASSWORD_POLICY_PLACEHOLDER } from '~/features/auth/type';
import { useAccountPasswordForm } from '~/features/settings/hooks/useAccountPasswordForm';
import { fieldLabel, sectionDescription } from '~/lib/styles';

import type { JSX, SubmitEvent } from 'react';

function preventDialogDismiss(event: { preventDefault: () => void }): void {
  event.preventDefault();
}

export function AccountPasswordForm(): JSX.Element {
  const {
    open,
    currentPassword,
    newPassword,
    confirmPassword,
    fieldErrors,
    formError,
    isSubmitting,
    openDialog,
    closeDialog,
    changePasswordField,
    submitPassword,
  } = useAccountPasswordForm();

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      closeDialog();
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    submitPassword();
  }

  return (
    <section
      className="grid gap-4 border-t border-border pt-8"
      aria-labelledby="account-password-heading"
    >
      <div className="grid gap-1">
        <h2 id="account-password-heading" className="text-base font-semibold text-foreground">
          비밀번호
        </h2>
        <p className={sectionDescription}>현재 비밀번호를 확인한 뒤 새 비밀번호로 바꿉니다.</p>
      </div>
      <div>
        <Button type="button" size="lg" onClick={openDialog}>
          비밀번호 변경
        </Button>
      </div>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={!isSubmitting}
          onInteractOutside={isSubmitting ? preventDialogDismiss : undefined}
          onPointerDownOutside={isSubmitting ? preventDialogDismiss : undefined}
        >
          <form noValidate className="grid gap-4" onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>비밀번호 변경</DialogTitle>
              <DialogDescription className={sectionDescription}>
                현재 비밀번호를 확인한 뒤 새 비밀번호로 바꿉니다.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="account-current-password" className={fieldLabel}>
                현재 비밀번호
              </Label>
              <Input
                id="account-current-password"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                className="font-medium"
                value={currentPassword}
                aria-required
                disabled={isSubmitting}
                onChange={(event) => {
                  changePasswordField('currentPassword', event);
                }}
                aria-invalid={fieldErrors?.currentPassword ? true : undefined}
                aria-describedby={
                  fieldErrors?.currentPassword ? 'account-current-password-error' : undefined
                }
              />
              {fieldErrors?.currentPassword ? (
                <p id="account-current-password-error" className="text-sm text-destructive">
                  {fieldErrors.currentPassword}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="account-new-password" className={fieldLabel}>
                새 비밀번호
              </Label>
              <Input
                id="account-new-password"
                name="newPassword"
                type="password"
                placeholder={PASSWORD_POLICY_PLACEHOLDER}
                autoComplete="new-password"
                className="font-medium"
                maxLength={16}
                value={newPassword}
                aria-required
                disabled={isSubmitting}
                onChange={(event) => {
                  changePasswordField('newPassword', event);
                }}
                aria-invalid={fieldErrors?.newPassword ? true : undefined}
                aria-describedby={fieldErrors?.newPassword ? 'account-new-password-error' : undefined}
              />
              {fieldErrors?.newPassword ? (
                <p id="account-new-password-error" className="text-sm text-destructive">
                  {fieldErrors.newPassword}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="account-confirm-password" className={fieldLabel}>
                새 비밀번호 확인
              </Label>
              <Input
                id="account-confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                className="font-medium"
                maxLength={16}
                value={confirmPassword}
                aria-required
                disabled={isSubmitting}
                onChange={(event) => {
                  changePasswordField('confirmPassword', event);
                }}
                aria-invalid={fieldErrors?.confirmPassword ? true : undefined}
                aria-describedby={
                  fieldErrors?.confirmPassword ? 'account-confirm-password-error' : undefined
                }
              />
              {fieldErrors?.confirmPassword ? (
                <p id="account-confirm-password-error" className="text-sm text-destructive">
                  {fieldErrors.confirmPassword}
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
                {isSubmitting ? '변경 중...' : '비밀번호 변경'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
