import { LoginBrandMark, LoginBrandPanel } from '~/features/auth/components/LoginBrand';
import { LoginForm } from '~/features/auth/components/LoginForm';
import { PasswordChangeDialog } from '~/features/auth/components/PasswordChangeDialog';
import { useLoginForm } from '~/features/auth/hooks/useLoginForm';

import type { JSX } from 'react';

export default function LoginPage(): JSX.Element {
  const loginForm = useLoginForm();

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <LoginBrandPanel />
      <main className="flex flex-col items-center justify-center bg-background px-6 py-8 md:px-8">
        <div className="grid w-full max-w-180 gap-8">
          <LoginBrandMark className="text-foreground lg:hidden" />
          <div className="grid gap-2">
            <h1 className="text-2xl leading-9 font-semibold text-foreground">로그인</h1>
            <p className="text-sm text-muted-foreground">관리자 계정으로 로그인하세요.</p>
          </div>
          <LoginForm
            username={loginForm.username}
            password={loginForm.password}
            fieldErrors={loginForm.fieldErrors}
            formError={loginForm.formError}
            passwordChanged={loginForm.passwordChanged}
            isSubmitting={loginForm.isLoggingIn}
            onPasswordChange={loginForm.changePassword}
            onSubmit={loginForm.submitLogin}
          />
          <p className="text-center text-sm text-muted-foreground">
            고객 개인정보 보호를 위해 승인된 직원만 접근할 수 있습니다.
          </p>
        </div>
      </main>
      <PasswordChangeDialog
        open={loginForm.showPasswordChange}
        currentPassword={loginForm.password}
        fieldErrors={loginForm.fieldErrors}
        formError={loginForm.dialogFormError}
        isSubmitting={loginForm.isChangingPassword}
        onDismiss={loginForm.dismissPasswordChange}
        onSubmit={loginForm.submitPasswordChange}
      />
    </div>
  );
}
