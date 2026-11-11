export const employeeQueryKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeQueryKeys.all, 'list'] as const,
  list: (companyId: string) => [...employeeQueryKeys.lists(), companyId] as const,
};
