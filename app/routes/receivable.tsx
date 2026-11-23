import { ReceivableDetailPage } from '~/features/receivables/components/ReceivableDetailPage';

import type { JSX } from 'react';
import type { ShellBreadcrumbHandle } from '~/features/shell/breadcrumb';
import type { Route } from './+types/receivable';

export const handle: ShellBreadcrumbHandle = {
  breadcrumb(): string {
    return '분납 상세';
  },
};

export function meta(): Route.MetaDescriptors {
  return [{ title: '분납 상세 | 온빛 CMS' }];
}

export default function Receivable(): JSX.Element {
  return <ReceivableDetailPage />;
}
