import { ReceivableListPage } from '~/features/receivables/components/ReceivableListPage';
import { shellMenuBreadcrumb } from '~/features/shell/breadcrumb';
import { currentShellNavItem } from '~/features/shell/nav';

import type { JSX } from 'react';
import type { Route } from './+types/receivables';

export const handle = shellMenuBreadcrumb;

export function meta({ location }: Route.MetaArgs): Route.MetaDescriptors {
  const label = currentShellNavItem(location.pathname)?.label ?? '분납관리';
  return [{ title: `${label} | 온빛 CMS` }];
}

export default function Receivables(): JSX.Element {
  return <ReceivableListPage />;
}
