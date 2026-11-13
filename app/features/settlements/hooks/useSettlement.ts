import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { requestSettlement } from '~/features/settlements/api/settlementApi';
import { settlementQueryKeys } from '~/features/settlements/api/settlementQuery';

import type { UseQueryResult } from '@tanstack/react-query';
import type { SettlementResponse } from '~/features/settlements/type';

export function useSettlement(month: string): UseQueryResult<SettlementResponse> {
  return useQuery({
    queryKey: settlementQueryKeys.detail(month),
    queryFn: ({ signal }) => requestSettlement(month, signal),
    placeholderData: keepPreviousData,
  });
}
