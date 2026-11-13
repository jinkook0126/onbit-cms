import { CaseListPage } from '~/features/cases/components/CaseListPage';
import { shellMenuBreadcrumb } from '~/features/shell/breadcrumb';
import { currentShellNavItem } from '~/features/shell/nav';

import type { JSX } from 'react';
import type { Route } from './+types/cases';

export const handle = shellMenuBreadcrumb;

export function meta({ location }: Route.MetaArgs): Route.MetaDescriptors {
  const label = currentShellNavItem(location.pathname)?.label ?? '사건현황';
  return [{ title: `${label} | 온빛 CMS` }];
}

export default function Cases(): JSX.Element {
  return <CaseListPage />;
}
