import { Outlet } from 'react-router';

import { currentSettingsNavItem } from '~/features/settings/nav';

import type { JSX } from 'react';
import type { ShellBreadcrumbHandle } from '~/features/shell/breadcrumb';

export const handle: ShellBreadcrumbHandle = {
  breadcrumb(match): string | undefined {
    return currentSettingsNavItem(match.pathname)?.label;
  },
};

export default function SettingsTeams(): JSX.Element {
  return <Outlet />;
}
