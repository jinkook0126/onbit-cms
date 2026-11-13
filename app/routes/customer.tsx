import { CustomerDetailPage } from '~/features/customers/components/CustomerDetailPage';

import type { JSX } from 'react';
import type { ShellBreadcrumbHandle } from '~/features/shell/breadcrumb';
import type { Route } from './+types/customer';

export const handle: ShellBreadcrumbHandle = {
  breadcrumb(): string {
    return '고객 상세';
  },
};

export function meta(): Route.MetaDescriptors {
  return [{ title: '고객 상세 | 온빛 CMS' }];
}

export default function Customer(): JSX.Element {
  return <CustomerDetailPage />;
}
