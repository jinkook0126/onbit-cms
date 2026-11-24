import type { CatalogOption, CatalogOptionRef } from '~/features/catalog/type';

/** 선택 목록용 옵션. 고객에 이미 지정된 옵션이 비활성이어도 목록에 남긴다. */
export function toOptionRefs(
  items: CatalogOption[] | undefined,
  current: CatalogOptionRef | null | undefined,
): CatalogOptionRef[] {
  const refs = (items ?? []).map(({ id, name, code }) => ({ id, name, code }));
  if (current && !refs.some((ref) => ref.id === current.id)) {
    refs.push(current);
  }
  return refs;
}
