import { Label } from '~/components/ui/label';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { inflowSourceLabels } from '~/features/customers/type';
import { fieldLabel } from '~/lib/styles';

import type { JSX } from 'react';
import type { InflowSource } from '~/features/customers/type';

type CustomerSourceFilterProps = {
  source: InflowSource | null;
  onSourceChange: (source: InflowSource | null) => void;
};

const sources = Object.keys(inflowSourceLabels) as InflowSource[];
const allSources = 'all';

function isListedSource(value: string): value is InflowSource {
  return sources.some((item) => item === value);
}

export function CustomerSourceFilter({
  source,
  onSourceChange,
}: CustomerSourceFilterProps): JSX.Element {
  function handleChange(value: string): void {
    if (value === allSources) {
      onSourceChange(null);
      return;
    }
    if (isListedSource(value)) {
      onSourceChange(value);
    }
  }

  return (
    <div className="grid gap-3">
      <p id="customer-source-label" className={fieldLabel}>
        유입처
      </p>
      <RadioGroup
        aria-labelledby="customer-source-label"
        value={source ?? allSources}
        className="flex flex-wrap gap-x-4 gap-y-2"
        onValueChange={handleChange}
      >
        <Label htmlFor="customer-source-all" className="gap-3 font-normal text-foreground">
          <RadioGroupItem id="customer-source-all" value={allSources} />
          전체
        </Label>
        {sources.map((item) => (
          <Label
            key={item}
            htmlFor={`customer-source-${item}`}
            className="gap-3 font-normal text-foreground"
          >
            <RadioGroupItem id={`customer-source-${item}`} value={item} />
            {inflowSourceLabels[item]}
          </Label>
        ))}
      </RadioGroup>
    </div>
  );
}
