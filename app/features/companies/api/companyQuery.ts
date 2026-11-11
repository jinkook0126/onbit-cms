import type { QueryClient } from '@tanstack/react-query';
import type {
  CompanyDetail,
  CompanyListItem,
  CompanyListResponse,
} from '~/features/companies/type';

export const companyQueryKeys = {
  all: ['companies'] as const,
  list: () => [...companyQueryKeys.all, 'list'] as const,
  details: () => [...companyQueryKeys.all, 'detail'] as const,
  detail: (companyId: string) => [...companyQueryKeys.details(), companyId] as const,
};

export function replaceListedCompany(
  queryClient: QueryClient,
  companyId: string,
  patch: Partial<Pick<CompanyListItem, 'name' | 'isActive'>>,
): void {
  queryClient.setQueryData<CompanyListResponse>(companyQueryKeys.list(), (current) => {
    if (!current) {
      return current;
    }
    return {
      ...current,
      companies: current.companies.map((company) =>
        company.id === companyId ? { ...company, ...patch } : company,
      ),
    };
  });
}

export function replaceCompanyDetail(
  queryClient: QueryClient,
  companyId: string,
  patch: Partial<CompanyDetail>,
): void {
  queryClient.setQueryData<CompanyDetail>(companyQueryKeys.detail(companyId), (current) => {
    if (!current) {
      return current;
    }
    return { ...current, ...patch };
  });
}
