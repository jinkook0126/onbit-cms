import { useQuery } from '@tanstack/react-query';

import { requestCatalogList } from '~/features/catalog/api/catalogApi';
import { catalogQueryKeys } from '~/features/catalog/api/catalogQuery';

import type { UseQueryResult } from '@tanstack/react-query';
import type { CatalogKind, CatalogListResponse } from '~/features/catalog/type';

export function useCatalogList(
  kind: CatalogKind,
  activeOnly = false,
): UseQueryResult<CatalogListResponse> {
  return useQuery({
    queryKey: catalogQueryKeys.list(kind, activeOnly),
    queryFn: ({ signal }) => requestCatalogList(kind, activeOnly, signal),
  });
}
