import { LogOutIcon, SunIcon } from 'lucide-react';
import { NavLink, useLocation } from 'react-router';

import { Button } from '~/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '~/components/ui/sidebar';
import { useLogout } from '~/features/shell/hooks/useLogout';
import { shellNavItems, isShellNavActive } from '~/features/shell/nav';
import { focusRing } from '~/lib/styles';
import { cn } from '~/lib/utils';

import type { JSX } from 'react';
import type { ShellAccount } from '~/features/shell/type';

type AppSidebarProps = {
  account: ShellAccount;
};

function ShellLogo(): JSX.Element {
  return (
    <SidebarHeader>
      <NavLink
        to="/"
        end
        aria-label="온빛 CMS"
        className={cn(
          'flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-sidebar-foreground',
          'group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0',
          focusRing,
        )}
      >
        <SunIcon aria-hidden="true" className="size-5 shrink-0" />
        <span className="truncate group-data-[collapsible=icon]:hidden">온빛 CMS</span>
      </NavLink>
    </SidebarHeader>
  );
}

function ShellNav(): JSX.Element {
  const { pathname } = useLocation();

  return (
    <SidebarContent>
      <SidebarGroup>
        <nav aria-label="주 메뉴">
          <SidebarMenu>
            {shellNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    asChild
                    isActive={isShellNavActive(pathname, item)}
                    tooltip={item.label}
                  >
                    <NavLink to={item.to} end={item.to === '/'}>
                      <Icon />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </nav>
      </SidebarGroup>
    </SidebarContent>
  );
}

function accountInitial(loginId: string): string {
  const initial = loginId.trim().charAt(0);
  return initial === '' ? '?' : initial.toLocaleUpperCase('ko-KR');
}

function ShellAccount({ account }: AppSidebarProps): JSX.Element {
  const { isLoggingOut, logout, logoutError } = useLogout();
  const { isMobile, state } = useSidebar();
  const compact = state === 'collapsed' && !isMobile;

  return (
    <SidebarFooter className="border-t border-sidebar-border">
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg bg-sidebar-accent p-2',
          compact && 'justify-center bg-transparent p-0',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground',
            compact && 'hidden',
          )}
        >
          {accountInitial(account.loginId)}
        </span>
        <div className={cn('min-w-0 flex-1', compact && 'sr-only')}>
          <p className="truncate text-sm font-medium text-sidebar-accent-foreground">
            {account.loginId}
          </p>
          {account.companyName ? (
            <p className="truncate text-sm text-sidebar-accent-foreground">{account.companyName}</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="로그아웃"
          aria-busy={isLoggingOut}
          disabled={isLoggingOut}
          onClick={logout}
        >
          <LogOutIcon />
        </Button>
      </div>
      {logoutError ? (
        <p className="px-2 text-sm text-destructive" role="alert">
          로그아웃하지 못했습니다. 다시 시도하세요.
        </p>
      ) : null}
    </SidebarFooter>
  );
}

export function AppSidebar({ account }: AppSidebarProps): JSX.Element {
  return (
    <Sidebar collapsible="icon">
      <ShellLogo />
      <ShellNav />
      <ShellAccount account={account} />
    </Sidebar>
  );
}
