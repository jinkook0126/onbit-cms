import { Outlet } from 'react-router';

import { SidebarInset, SidebarProvider } from '~/components/ui/sidebar';
import { AppHeader } from '~/features/shell/components/AppHeader';
import { AppSidebar } from '~/features/shell/components/AppSidebar';

import type { JSX } from 'react';
import type { ShellAccount } from '~/features/shell/type';

type AppShellProps = {
  account: ShellAccount;
};

export function AppShell({ account }: AppShellProps): JSX.Element {
  return (
    <SidebarProvider>
      <AppSidebar account={account} />
      <SidebarInset>
        <AppHeader />
        <div className="flex-1 px-6 py-6 xl:px-8">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
