import type { CustomerAssigneeOption } from '~/features/customers/type';

export function defaultAssigneeId(
  options: CustomerAssigneeOption[],
  currentUserId: string | undefined,
): string {
  const self =
    currentUserId === undefined
      ? undefined
      : options.find((assignee) => assignee.id === currentUserId);
  if (self) {
    return self.id;
  }
  if (options.length === 0) {
    return '';
  }
  return options[0].id;
}
