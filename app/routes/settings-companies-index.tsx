import { CompanyListPage } from '~/features/companies/components/CompanyListPage';
import { currentSettingsNavItem } from '~/features/settings/nav';

import type { JSX } from 'react';
import type { Route } from './+types/settings-companies-index';

export function meta({ location }: Route.MetaArgs): Route.MetaDescriptors {
  const label = currentSettingsNavItem(location.pathname)?.label ?? '회사 관리';
  return [{ title: `${label} | 온빛 CMS` }];
}

export default function SettingsCompaniesIndex(): JSX.Element {
  return <CompanyListPage />;
}
