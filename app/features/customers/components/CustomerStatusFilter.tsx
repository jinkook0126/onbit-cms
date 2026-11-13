import { Label } from '~/components/ui/label';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { consultationStatusLabels } from '~/features/customers/type';
import { fieldLabel } from '~/lib/styles';

import type { JSX } from 'react';
import type { ConsultationStatus } from '~/features/customers/type';

type CustomerStatusFilterProps = {
  status: ConsultationStatus | null;
  onStatusChange: (status: ConsultationStatus | null) => void;
};

const statuses = Object.keys(consultationStatusLabels) as ConsultationStatus[];
const allStatuses = 'all';

function isListedStatus(value: string): value is ConsultationStatus {
  return statuses.some((item) => item === value);
}

export function CustomerStatusFilter({
  status,
  onStatusChange,
}: CustomerStatusFilterProps): JSX.Element {
  function handleChange(value: string): void {
    if (value === allStatuses) {
      onStatusChange(null);
      return;
    }
    if (isListedStatus(value)) {
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
        value={status ?? allStatuses}
        className="flex flex-wrap gap-x-4 gap-y-2"
        onValueChange={handleChange}
      >
        <Label htmlFor="customer-status-all" className="gap-3 font-normal text-foreground">
          <RadioGroupItem id="customer-status-all" value={allStatuses} />
          전체
        </Label>
        {statuses.map((item) => (
          <Label
            key={item}
            htmlFor={`customer-status-${item}`}
            className="gap-3 font-normal text-foreground"
          >
            <RadioGroupItem id={`customer-status-${item}`} value={item} />
            {consultationStatusLabels[item]}
          </Label>
        ))}
      </RadioGroup>
    </div>
  );
}
