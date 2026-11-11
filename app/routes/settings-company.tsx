import { CompanyDetailPage } from '~/features/companies/components/CompanyDetailPage';

import type { JSX } from 'react';
import type { ShellBreadcrumbHandle } from '~/features/shell/breadcrumb';
import type { Route } from './+types/settings-company';

export const handle: ShellBreadcrumbHandle = {
  breadcrumb(): string {
    return '회사 상세';
  },
};

export function meta(): Route.MetaDescriptors {
  return [{ title: '회사 상세 | 온빛 CMS' }];
}

export default function SettingsCompany(): JSX.Element {
  return <CompanyDetailPage />;
}
