import { AccountSettingsPage } from '~/features/settings/components/AccountSettingsPage';
import { currentSettingsNavItem } from '~/features/settings/nav';

import type { JSX } from 'react';
import type { ShellBreadcrumbHandle } from '~/features/shell/breadcrumb';
import type { Route } from './+types/settings-account';

export const handle: ShellBreadcrumbHandle = {
  breadcrumb(match): string | undefined {
    return currentSettingsNavItem(match.pathname)?.label;
  },
};

export function meta({ location }: Route.MetaArgs): Route.MetaDescriptors {
  const label = currentSettingsNavItem(location.pathname)?.label ?? '계정 설정';
  return [{ title: `${label} | 온빛 CMS` }];
}

export default function SettingsAccount(): JSX.Element {
  return <AccountSettingsPage />;
}
