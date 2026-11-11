import { EmployeeListPage } from '~/features/employees/components/EmployeeListPage';
import { currentSettingsNavItem } from '~/features/settings/nav';

import type { JSX } from 'react';
import type { ShellBreadcrumbHandle } from '~/features/shell/breadcrumb';
import type { Route } from './+types/settings-employees';

export const handle: ShellBreadcrumbHandle = {
  breadcrumb(match): string | undefined {
    return currentSettingsNavItem(match.pathname)?.label;
  },
};

export function meta({ location }: Route.MetaArgs): Route.MetaDescriptors {
  const label = currentSettingsNavItem(location.pathname)?.label ?? '직원 관리';
  return [{ title: `${label} | 온빛 CMS` }];
}

export default function SettingsEmployees(): JSX.Element {
  return <EmployeeListPage />;
}
