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

import type { JSX, SubmitEvent } from 'react';
import type { LoginFieldErrors } from '~/features/auth/type';

type PasswordChangeValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type PasswordChangeDialogProps = {
  open: boolean;
  currentPassword: string;
  fieldErrors?: LoginFieldErrors;
  formError?: string;
  isSubmitting: boolean;
  onDismiss: () => void;
  onSubmit: (values: PasswordChangeValues) => void;
};

function readFormString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

function preventDialogDismiss(event: { preventDefault: () => void }): void {
  event.preventDefault();
}

export function PasswordChangeDialog({
  open,
  currentPassword,
  fieldErrors,
  formError,
  isSubmitting,
  onDismiss,
  onSubmit,
}: PasswordChangeDialogProps): JSX.Element {
  const showCurrentPassword = currentPassword.length === 0;

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen && !isSubmitting) {
      onDismiss();
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    onSubmit({
      currentPassword: readFormString(formData, 'currentPassword'),
      newPassword: readFormString(formData, 'newPassword'),
      confirmPassword: readFormString(formData, 'confirmPassword'),
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={preventDialogDismiss}
        onPointerDownOutside={preventDialogDismiss}
      >
        <form noValidate className="grid gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>비밀번호 변경</DialogTitle>
            <DialogDescription>
              계속하려면 새 비밀번호를 만들어야 합니다. 변경한 뒤 다시 로그인하세요.
            </DialogDescription>
          </DialogHeader>
          {showCurrentPassword ? (
            <div className="grid gap-2">
              <Label htmlFor="current-password">현재 비밀번호</Label>
              <Input
                id="current-password"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                aria-required
                disabled={isSubmitting}
              />
            </div>
          ) : (
            <input type="hidden" name="currentPassword" value={currentPassword} />
          )}
          <div className="grid gap-2">
            <Label htmlFor="new-password">새 비밀번호</Label>
            <Input
              id="new-password"
              name="newPassword"
              type="password"
              placeholder={PASSWORD_POLICY_PLACEHOLDER}
              autoComplete="new-password"
              maxLength={16}
              aria-required
              disabled={isSubmitting}
              aria-invalid={fieldErrors?.newPassword ? true : undefined}
              aria-describedby={fieldErrors?.newPassword ? 'new-password-error' : undefined}
            />
            {fieldErrors?.newPassword && (
              <p id="new-password-error" className="text-sm text-destructive">
                {fieldErrors.newPassword}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm-password">새 비밀번호 확인</Label>
            <Input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              maxLength={16}
              aria-required
              disabled={isSubmitting}
              aria-invalid={fieldErrors?.confirmPassword ? true : undefined}
              aria-describedby={fieldErrors?.confirmPassword ? 'confirm-password-error' : undefined}
            />
            {fieldErrors?.confirmPassword && (
              <p id="confirm-password-error" className="text-sm text-destructive">
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>
          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onDismiss} disabled={isSubmitting}>
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '변경 중...' : '비밀번호 변경'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
