import { useQuery } from '@tanstack/react-query';

import { requestEmployeeList } from '~/features/employees/api/employeeApi';
import { employeeQueryKeys } from '~/features/employees/api/employeeQuery';

import type { UseQueryResult } from '@tanstack/react-query';
import type { EmployeeListResponse } from '~/features/employees/type';

export function useEmployeeList(companyId: string): UseQueryResult<EmployeeListResponse> {
  return useQuery({
    queryKey: employeeQueryKeys.list(companyId),
    queryFn: ({ signal }) => requestEmployeeList(companyId, signal),
  });
}
