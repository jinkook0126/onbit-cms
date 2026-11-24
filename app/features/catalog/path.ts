import { isCatalogKind } from '~/features/catalog/type';

import type { CatalogKind } from '~/features/catalog/type';

const settingsCatalogPaths: Record<CatalogKind, string> = {
  'consultation-statuses': '/settings/consultation-statuses',
  'inflow-sources': '/settings/inflow-sources',
  'case-types': '/settings/case-types',
};

export function catalogKindFromPathname(pathname: string): CatalogKind | null {
  for (const [kind, path] of Object.entries(settingsCatalogPaths)) {
    if (pathname === path || pathname.startsWith(`${path}/`)) {
      return isCatalogKind(kind) ? kind : null;
    }
  }
  return null;
}
