import { Outlet } from 'react-router';

import { AppHeader } from '~/features/shell/components/AppHeader';
import { pageCanvas } from '~/lib/styles';

import type { JSX } from 'react';
import type { ShellAccount } from '~/features/shell/type';

type AppShellProps = {
  account: ShellAccount;
};

export function AppShell({ account }: AppShellProps): JSX.Element {
  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader account={account} />
      <div className={pageCanvas}>
        <Outlet />
      </div>
    </div>
  );
}
