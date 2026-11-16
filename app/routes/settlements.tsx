import { SettlementPage } from '~/features/settlements/components/SettlementPage';
import { shellMenuBreadcrumb } from '~/features/shell/breadcrumb';
import { currentShellNavItem } from '~/features/shell/nav';

import type { JSX } from 'react';
import type { Route } from './+types/settlements';

export const handle = shellMenuBreadcrumb;

export function meta({ location }: Route.MetaArgs): Route.MetaDescriptors {
  const label = currentShellNavItem(location.pathname)?.label ?? '월별 정산';
  return [{ title: `${label} | 온빛 CMS` }];
}

export default function Settlements(): JSX.Element {
  return <SettlementPage />;
}
