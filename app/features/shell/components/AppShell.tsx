import { Outlet } from 'react-router';

import { SidebarInset, SidebarProvider } from '~/components/ui/sidebar';
import { AppHeader } from '~/features/shell/components/AppHeader';
import { AppSidebar } from '~/features/shell/components/AppSidebar';
import { pageCanvas } from '~/lib/styles';

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
        <div className={pageCanvas}>
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
