import { Badge } from '~/components/ui/badge';
import { receivableStatusLabels } from '~/features/receivables/type';

import type { JSX } from 'react';
import type { ReceivableStatus } from '~/features/receivables/type';

const statusVariants: Record<ReceivableStatus, 'default' | 'destructive' | 'secondary'> = {
  PAID: 'default',
  OVERDUE: 'destructive',
  SCHEDULED: 'secondary',
};

type ReceivableStatusBadgeProps = {
  status: ReceivableStatus;
};

export function ReceivableStatusBadge({ status }: ReceivableStatusBadgeProps): JSX.Element {
  return <Badge variant={statusVariants[status]}>{receivableStatusLabels[status]}</Badge>;
}
