import { prisma } from '~/lib/db.server';
import { isUuid } from '~/lib/uuid.server';

import type { CatalogOptionRef } from '~/features/catalog/type';

export const catalogOptionRefSelect = { id: true, name: true, code: true } as const;

export type CustomerOptionKind = 'status' | 'source' | 'caseType';

export function toOptionRef(option: CatalogOptionRef): CatalogOptionRef {
  return { id: option.id, name: option.name, code: option.code };
}

function optionWhere(optionId: string, companyId: string, keepIds: readonly (string | null)[]) {
  return {
    id: optionId,
    companyId,
    ...(keepIds.includes(optionId) ? {} : { isActive: true }),
  };
}

/**
 * 회사의 활성 옵션 하나를 읽는다.
 * 고객에 이미 지정된 옵션(keepIds)은 비활성이어도 허용한다.
 */
export async function findCompanyOption(
  kind: CustomerOptionKind,
  companyId: string,
  optionId: string,
  keepIds: readonly (string | null)[] = [],
): Promise<CatalogOptionRef | null> {
  if (!isUuid(optionId)) {
    return null;
  }
  const where = optionWhere(optionId, companyId, keepIds);
  switch (kind) {
    case 'status':
      return prisma.consultationStatusOption.findFirst({ where, select: catalogOptionRefSelect });
    case 'source':
      return prisma.inflowSourceOption.findFirst({ where, select: catalogOptionRefSelect });
    case 'caseType':
      return prisma.caseTypeOption.findFirst({ where, select: catalogOptionRefSelect });
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

/** 회사의 상담 상태 옵션을 code로 읽는다. */
export async function findCompanyStatusByCode(
  companyId: string,
  code: string,
): Promise<CatalogOptionRef | null> {
  return prisma.consultationStatusOption.findFirst({
    where: { companyId, code },
    select: catalogOptionRefSelect,
  });
}
