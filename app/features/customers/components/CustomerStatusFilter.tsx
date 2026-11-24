import { Label } from '~/components/ui/label';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { useCatalogList } from '~/features/catalog/hooks/useCatalogList';
import { fieldLabel } from '~/lib/styles';

import type { JSX } from 'react';

type CustomerStatusFilterProps = {
  statusId: string | null;
  onStatusChange: (statusId: string | null) => void;
};

const allStatuses = 'all';

export function CustomerStatusFilter({
  statusId,
  onStatusChange,
}: CustomerStatusFilterProps): JSX.Element {
  const statuses = useCatalogList('consultation-statuses');
  const items = statuses.data?.items ?? [];

  function handleChange(value: string): void {
    if (value === allStatuses) {
      onStatusChange(null);
      return;
    }
    if (items.some((item) => item.id === value)) {
      onStatusChange(value);
    }
  }

  return (
    <div className="grid gap-3">
      <p id="customer-status-label" className={fieldLabel}>
        상담 상태
      </p>
      <RadioGroup
        aria-labelledby="customer-status-label"
        value={statusId ?? allStatuses}
        className="flex flex-wrap gap-x-4 gap-y-2"
        onValueChange={handleChange}
      >
        <Label htmlFor="customer-status-all" className="gap-3 font-normal text-foreground">
          <RadioGroupItem id="customer-status-all" value={allStatuses} />
          전체
        </Label>
        {items.map((item) => (
          <Label
            key={item.id}
            htmlFor={`customer-status-${item.id}`}
            className="gap-3 font-normal text-foreground"
          >
            <RadioGroupItem id={`customer-status-${item.id}`} value={item.id} />
            {item.name}
          </Label>
        ))}
      </RadioGroup>
    </div>
  );
}
