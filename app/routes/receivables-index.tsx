import { ReceivableListPage } from '~/features/receivables/components/ReceivableListPage';
import { currentShellNavItem } from '~/features/shell/nav';

import type { JSX } from 'react';
import type { Route } from './+types/receivables-index';

export function meta({ location }: Route.MetaArgs): Route.MetaDescriptors {
  const label = currentShellNavItem(location.pathname)?.label ?? '분납관리';
  return [{ title: `${label} | 온빛 CMS` }];
}

export default function ReceivablesIndex(): JSX.Element {
  return <ReceivableListPage />;
}
