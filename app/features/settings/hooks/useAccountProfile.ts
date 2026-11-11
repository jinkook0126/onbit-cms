import { useQuery } from '@tanstack/react-query';

import { requestAccountProfile } from '~/features/settings/api/accountApi';
import { accountQueryKeys } from '~/features/settings/api/accountQuery';

import type { UseQueryResult } from '@tanstack/react-query';
import type { AccountProfile } from '~/features/settings/type';

export function useAccountProfile(): UseQueryResult<AccountProfile> {
  return useQuery({
    queryKey: accountQueryKeys.profile(),
    queryFn: ({ signal }) => requestAccountProfile(signal),
  });
}
