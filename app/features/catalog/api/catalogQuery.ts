import type { CatalogKind } from '~/features/catalog/type';

export const catalogQueryKeys = {
  all: ['catalog'] as const,
  kind: (kind: CatalogKind) => [...catalogQueryKeys.all, kind] as const,
  list: (kind: CatalogKind, activeOnly = false) =>
    [...catalogQueryKeys.kind(kind), 'list', { activeOnly }] as const,
};
