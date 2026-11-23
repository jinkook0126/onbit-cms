import { ChevronDownIcon, LogOutIcon, SunIcon } from 'lucide-react';
import { Fragment } from 'react';
import { Link, NavLink, useMatches } from 'react-router';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { shellBreadcrumbItems } from '~/features/shell/breadcrumb';
import { useLogout } from '~/features/shell/hooks/useLogout';
import { shellHomePath, shellNavItems, visibleShellNavItems } from '~/features/shell/nav';
import { focusRing } from '~/lib/styles';
import { cn } from '~/lib/utils';

import type { JSX } from 'react';
import type { ShellBreadcrumbItem } from '~/features/shell/breadcrumb';
import type { ShellAccount, ShellRole } from '~/features/shell/type';

const shellDateLabel = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
});

const shellDateValue = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

type AppHeaderProps = {
  account: ShellAccount;
};

type ShellBreadcrumbProps = {
  items: readonly ShellBreadcrumbItem[];
};

function ShellDivider(): JSX.Element {
  return <span aria-hidden="true" className="h-5 w-px shrink-0 bg-border" />;
}

function ShellLogo({ role }: { role: ShellRole }): JSX.Element {
  const home = shellHomePath(role);

  return (
    <NavLink
      to={home}
      end={home === '/'}
      aria-label="온빛 CMS"
      className={cn(
        'flex h-9 shrink-0 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-foreground',
        focusRing,
      )}
    >
      <SunIcon aria-hidden="true" className="size-5 shrink-0" />
      <span>온빛 CMS</span>
    </NavLink>
  );
}

function ShellNav({ role }: { role: ShellRole }): JSX.Element {
  return (
    <nav aria-label="주 메뉴" className="flex shrink-0 items-center gap-1">
      {visibleShellNavItems(role).map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm',
                focusRing,
                isActive
                  ? 'bg-muted font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

function accountInitial(loginId: string): string {
  const initial = loginId.trim().charAt(0);
  return initial === '' ? '?' : initial.toLocaleUpperCase('ko-KR');
}

type ShellAccountMenuProps = AppHeaderProps & {
  isLoggingOut: boolean;
  logout: () => void;
};

function ShellAccountMenu({ account, isLoggingOut, logout }: ShellAccountMenuProps): JSX.Element {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span
        aria-hidden="true"
        className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground"
      >
        {accountInitial(account.loginId)}
      </span>
      <div className="max-w-40 min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{account.loginId}</p>
        {account.companyName ? (
          <p className="truncate text-sm text-muted-foreground">{account.companyName}</p>
        ) : null}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="계정 메뉴">
            <ChevronDownIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={isLoggingOut} onSelect={logout}>
            <LogOutIcon />
            로그아웃
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ShellBreadcrumb({ items }: ShellBreadcrumbProps): JSX.Element {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <Fragment key={item.id}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem>
                {isCurrent ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={item.to}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function AppHeader({ account }: AppHeaderProps): JSX.Element {
  const matches = useMatches();
  const { isLoggingOut, logout, logoutError } = useLogout();
  const today = new Date();
  const fromRoutes = shellBreadcrumbItems(matches);
  const items =
    fromRoutes.length > 0
      ? fromRoutes
      : [{ id: 'home', label: shellNavItems[0].label, to: shellNavItems[0].to }];
  const currentLabel = items[items.length - 1]?.label ?? shellNavItems[0].label;

  return (
    <header className="shrink-0 border-b border-border bg-background">
      <div className="flex h-14 items-center gap-4 px-6 xl:px-8">
        <div className="flex min-w-0 items-center gap-4 overflow-x-auto">
          <ShellLogo role={account.role} />
          <ShellDivider />
          <ShellNav role={account.role} />
        </div>
        <div className="ml-auto">
          <ShellAccountMenu account={account} isLoggingOut={isLoggingOut} logout={logout} />
        </div>
      </div>
      <div className="flex h-10 items-center gap-4 px-6 xl:px-8">
        <h1 className="sr-only">{currentLabel}</h1>
        <div className="min-w-0 flex-1">
          <ShellBreadcrumb items={items} />
        </div>
        <time
          dateTime={shellDateValue.format(today)}
          className="shrink-0 text-sm text-muted-foreground"
          suppressHydrationWarning
        >
          {shellDateLabel.format(today)}
        </time>
      </div>
      {logoutError ? (
        <p
          role="alert"
          className="border-t border-border px-6 py-2 text-sm text-destructive xl:px-8"
        >
          로그아웃하지 못했습니다. 다시 시도하세요.
        </p>
      ) : null}
    </header>
  );
}
