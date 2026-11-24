import {
  defaultCaseTypes,
  defaultConsultationStatuses,
  defaultInflowSources,
} from '~/features/catalog/defaults';

import type { Prisma } from '../../../../generated/prisma/client';

export async function seedCompanyCatalog(
  tx: Prisma.TransactionClient,
  companyId: string,
): Promise<void> {
  await tx.consultationStatusOption.createMany({
    data: defaultConsultationStatuses.map((item) => ({
      companyId,
      name: item.name,
      code: item.code,
      sortOrder: item.sortOrder,
    })),
  });
  await tx.inflowSourceOption.createMany({
    data: defaultInflowSources.map((item) => ({
      companyId,
      name: item.name,
      code: item.code,
      sortOrder: item.sortOrder,
    })),
  });
  await tx.caseTypeOption.createMany({
    data: defaultCaseTypes.map((item) => ({
      companyId,
      name: item.name,
      code: item.code,
      sortOrder: item.sortOrder,
    })),
  });
}
