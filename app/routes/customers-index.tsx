import { CustomerListPage } from '~/features/customers/components/CustomerListPage';
import { currentShellNavItem } from '~/features/shell/nav';

import type { JSX } from 'react';
import type { Route } from './+types/customers-index';

export function meta({ location }: Route.MetaArgs): Route.MetaDescriptors {
  const label = currentShellNavItem(location.pathname)?.label ?? '상담고객';
  return [{ title: `${label} | 온빛 CMS` }];
}

export default function CustomersIndex(): JSX.Element {
  return <CustomerListPage />;
}
