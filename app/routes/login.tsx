import { LockIcon, UserIcon } from 'lucide-react';
import { data, Form, useNavigation } from 'react-router';

import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { cn } from '~/lib/utils';

import type { JSX } from 'react';
import type { Route } from './+types/login';

type LoginFieldErrors = {
  username?: string;
  password?: string;
};

type LoginActionData = {
  fieldErrors?: LoginFieldErrors;
  formError?: string;
  values: { username: string };
};

function getFormText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

export function meta(): Route.MetaDescriptors {
  return [{ title: '로그인 | 온빛 CMS' }];
}

export async function action({
  request,
}: Route.ActionArgs): Promise<ReturnType<typeof data<LoginActionData>>> {
  const formData = await request.formData();
  const username = getFormText(formData, 'username');
  const password = getFormText(formData, 'password');

  const fieldErrors: LoginFieldErrors = {};
  if (!username) {
    fieldErrors.username = '아이디를 입력하세요.';
  }
  if (!password) {
    fieldErrors.password = '비밀번호를 입력하세요.';
  }

  if (fieldErrors.username ?? fieldErrors.password) {
    return data<LoginActionData>({ fieldErrors, values: { username } }, { status: 400 });
  }

  // TODO: 인증 API 연결 후 성공 시 세션 생성 및 redirect 처리
  return data<LoginActionData>(
    {
      formError: '로그인 기능이 아직 연결되지 않았습니다. 관리자에게 문의하세요.',
      values: { username },
    },
    { status: 501 },
  );
}

export default function Login({ actionData }: Route.ComponentProps): JSX.Element {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const fieldErrors = actionData?.fieldErrors;

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <BrandPanel />
      <main className="flex flex-col items-center justify-center bg-background px-6 py-8 md:px-8">
        <div className="grid w-full max-w-180 gap-8">
          <BrandMark className="text-foreground lg:hidden" iconClassName="text-primary" />
          <div className="grid gap-2">
            <h1 className="text-2xl leading-9 font-semibold text-foreground">로그인</h1>
            <p className="text-sm text-muted-foreground">관리자 계정으로 로그인하세요.</p>
          </div>
          <Form method="post" noValidate className="grid gap-4">
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
                  defaultValue={actionData?.values.username}
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
            {actionData?.formError && (
              <p role="alert" className="text-sm text-destructive">
                {actionData.formError}
              </p>
            )}
            <Button type="submit" size="lg" className="mt-2 w-full" disabled={isSubmitting}>
              {isSubmitting ? '로그인 중...' : '로그인'}
            </Button>
          </Form>
          <p className="text-center text-sm text-muted-foreground">
            고객 개인정보 보호를 위해 승인된 직원만 접근할 수 있습니다.
          </p>
        </div>
      </main>
    </div>
  );
}

type BrandMarkProps = {
  className?: string;
  iconClassName?: string;
};

function BrandMark({ className }: BrandMarkProps): JSX.Element {
  return (
    <div className={cn('flex items-center gap-2 font-semibold', className)}>
      <span>온빛 CMS</span>
    </div>
  );
}

function BrandPanel(): JSX.Element {
  return (
    <aside className="hidden flex-col justify-between bg-primary p-8 text-primary-foreground lg:flex">
      <BrandMark />
      <div className="grid gap-4">
        <p className="text-3xl leading-11.25 font-semibold">
          다시 시작하는 삶에,
          <br />
          따뜻한 빛을 더합니다.
        </p>
        <p className="text-base">
          개인회생 고객의 접수부터 인가, 변제까지 모든 과정을 한곳에서 관리하세요.
        </p>
      </div>
      <p className="text-sm">© {new Date().getFullYear()} 온빛. All rights reserved.</p>
    </aside>
  );
}
