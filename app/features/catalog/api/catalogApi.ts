import {
  isCatalogCreateResponse,
  isCatalogDeleteResponse,
  isCatalogListResponse,
  isCatalogNameResponse,
  isCatalogStatusResponse,
} from '~/features/catalog/type';
import { ApiError, apiClient } from '~/lib/apiClient';

import type {
  CatalogCreateResponse,
  CatalogCreateSubmission,
  CatalogDeleteResponse,
  CatalogKind,
  CatalogListResponse,
  CatalogNameResponse,
  CatalogNameSubmission,
  CatalogStatusResponse,
  CatalogStatusSubmission,
} from '~/features/catalog/type';

function catalogPath(kind: CatalogKind): string {
  return `/api/catalog/${kind}`;
}

function catalogItemPath(kind: CatalogKind, id: string): string {
  return `${catalogPath(kind)}/${encodeURIComponent(id)}`;
}

export async function requestCatalogList(
  kind: CatalogKind,
  activeOnly = false,
  signal?: AbortSignal,
): Promise<CatalogListResponse> {
  const search = activeOnly ? '?active=1' : '';
  const result = await apiClient(`${catalogPath(kind)}${search}`, { signal });
  if (!result.ok || !isCatalogListResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestCatalogCreate(
  kind: CatalogKind,
  submission: CatalogCreateSubmission,
): Promise<CatalogCreateResponse> {
  const result = await apiClient(catalogPath(kind), { method: 'POST', body: submission });
  if (!isCatalogCreateResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestCatalogNameUpdate(
  kind: CatalogKind,
  id: string,
  submission: CatalogNameSubmission,
): Promise<CatalogNameResponse> {
  const result = await apiClient(catalogItemPath(kind, id), { method: 'PATCH', body: submission });
  if (!isCatalogNameResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestCatalogStatusUpdate(
  kind: CatalogKind,
  id: string,
  submission: CatalogStatusSubmission,
): Promise<CatalogStatusResponse> {
  const result = await apiClient(`${catalogItemPath(kind, id)}/status`, {
    method: 'PATCH',
    body: submission,
  });
  if (!isCatalogStatusResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestCatalogDelete(
  kind: CatalogKind,
  id: string,
): Promise<CatalogDeleteResponse> {
  const result = await apiClient(catalogItemPath(kind, id), { method: 'DELETE' });
  if (!isCatalogDeleteResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}
