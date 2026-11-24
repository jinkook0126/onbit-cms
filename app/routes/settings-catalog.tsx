import { useLocation } from 'react-router';

import { CatalogListPage } from '~/features/catalog/components/CatalogListPage';
import { catalogKindFromPathname } from '~/features/catalog/path';
import { catalogKindLabels } from '~/features/catalog/type';

import type { JSX } from 'react';
import type { ShellBreadcrumbHandle } from '~/features/shell/breadcrumb';
import type { Route } from './+types/settings-catalog';

export const handle: ShellBreadcrumbHandle = {
  breadcrumb(match): string | undefined {
    const kind = catalogKindFromPathname(match.pathname);
    return kind ? catalogKindLabels[kind] : undefined;
  },
};

export function meta({ location }: Route.MetaArgs): Route.MetaDescriptors {
  const kind = catalogKindFromPathname(location.pathname);
  const title = kind ? catalogKindLabels[kind] : '마스터 관리';
  return [{ title: `${title} | 온빛 CMS` }];
}

export default function SettingsCatalog(): JSX.Element {
  const { pathname } = useLocation();
  const kind = catalogKindFromPathname(pathname);
  if (!kind) {
    return <p role="alert">잘못된 경로입니다.</p>;
  }
  return <CatalogListPage kind={kind} />;
}
