import { cn } from '~/lib/utils';

import type { JSX } from 'react';

type LoginBrandMarkProps = {
  className?: string;
};

export function LoginBrandMark({ className }: LoginBrandMarkProps): JSX.Element {
  return (
    <div className={cn('flex items-center gap-2 font-semibold', className)}>
      <span>온빛 CMS</span>
    </div>
  );
}

export function LoginBrandPanel(): JSX.Element {
  return (
    <aside className="hidden flex-col justify-between bg-primary p-8 text-primary-foreground lg:flex">
      <LoginBrandMark />
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
