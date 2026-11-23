import type {
  ReceivableCalendarParams,
  ReceivableListParams,
  ReceivableScheduleParams,
} from '~/features/receivables/type';

export const receivableQueryKeys = {
  all: ['receivables'] as const,
  lists: () => [...receivableQueryKeys.all, 'list'] as const,
  list: (params: ReceivableListParams) => [...receivableQueryKeys.lists(), params] as const,
  details: () => [...receivableQueryKeys.all, 'detail'] as const,
  detail: (customerId: string) => [...receivableQueryKeys.details(), customerId] as const,
  schedules: () => [...receivableQueryKeys.all, 'schedule'] as const,
  schedule: (params: ReceivableScheduleParams) =>
    [...receivableQueryKeys.schedules(), params] as const,
  calendars: () => [...receivableQueryKeys.all, 'calendar'] as const,
  calendar: (params: ReceivableCalendarParams) =>
    [...receivableQueryKeys.calendars(), params] as const,
};
