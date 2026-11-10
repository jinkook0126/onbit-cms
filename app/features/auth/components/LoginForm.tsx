import { LockIcon, UserIcon } from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';

import type { ChangeEvent, JSX, SubmitEvent } from 'react';
import type { LoginFieldErrors } from '~/features/auth/type';

type LoginFormValues = {
  username: string;
  password: string;
};

type LoginFormProps = {
  username: string;
  password: string;
  fieldErrors?: LoginFieldErrors;
  formError?: string;
  passwordChanged: boolean;
  isSubmitting: boolean;
  onPasswordChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (values: LoginFormValues) => void;
};

export function LoginForm({
  username,
  password,
  fieldErrors,
  formError,
  passwordChanged,
  isSubmitting,
  onPasswordChange,
  onSubmit,
}: LoginFormProps): JSX.Element {
  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const usernameValue = new FormData(event.currentTarget).get('username');
    onSubmit({
      username: typeof usernameValue === 'string' ? usernameValue : '',
      password,
    });
  }

  return (
    <form noValidate className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <Label htmlFor="username">아이디</Label>
        <div className="relative">
          <UserIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="username"
            name="username"
            autoComplete="username"
            aria-required
            className="pl-9"
            defaultValue={username}
            aria-invalid={fieldErrors?.username ? true : undefined}
            aria-describedby={
              fieldErrors?.username ? 'username-help username-error' : 'username-help'
            }
          />
        </div>
        <p id="username-help" className="text-sm text-muted-foreground">
          관리자에게 발급받은 아이디를 입력하세요.
        </p>
        {fieldErrors?.username && (
          <p id="username-error" className="text-sm text-destructive">
            {fieldErrors.username}
          </p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">비밀번호</Label>
        <div className="relative">
          <LockIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            aria-required
            className="pl-9"
            value={password}
            onChange={onPasswordChange}
            aria-invalid={fieldErrors?.password ? true : undefined}
            aria-describedby={fieldErrors?.password ? 'password-error' : undefined}
          />
        </div>
        {fieldErrors?.password && (
          <p id="password-error" className="text-sm text-destructive">
            {fieldErrors.password}
          </p>
        )}
      </div>
      {passwordChanged && (
        <p role="status" className="text-sm text-foreground">
          비밀번호를 변경했습니다. 새 비밀번호로 다시 로그인하세요.
        </p>
      )}
      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}
      <Button type="submit" size="lg" className="mt-2 w-full" disabled={isSubmitting}>
        {isSubmitting ? '로그인 중...' : '로그인'}
      </Button>
    </form>
  );
}
