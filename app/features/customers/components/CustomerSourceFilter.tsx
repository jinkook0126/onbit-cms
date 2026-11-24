import { Label } from '~/components/ui/label';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { useCatalogList } from '~/features/catalog/hooks/useCatalogList';
import { fieldLabel } from '~/lib/styles';

import type { JSX } from 'react';

type CustomerSourceFilterProps = {
  sourceId: string | null;
  onSourceChange: (sourceId: string | null) => void;
};

const allSources = 'all';

export function CustomerSourceFilter({
  sourceId,
  onSourceChange,
}: CustomerSourceFilterProps): JSX.Element {
  const sources = useCatalogList('inflow-sources');
  const items = sources.data?.items ?? [];

  function handleChange(value: string): void {
    if (value === allSources) {
      onSourceChange(null);
      return;
    }
    if (items.some((item) => item.id === value)) {
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
        value={sourceId ?? allSources}
        className="flex flex-wrap gap-x-4 gap-y-2"
        onValueChange={handleChange}
      >
        <Label htmlFor="customer-source-all" className="gap-3 font-normal text-foreground">
          <RadioGroupItem id="customer-source-all" value={allSources} />
          전체
        </Label>
        {items.map((item) => (
          <Label
            key={item.id}
            htmlFor={`customer-source-${item.id}`}
            className="gap-3 font-normal text-foreground"
          >
            <RadioGroupItem id={`customer-source-${item.id}`} value={item.id} />
            {item.name}
          </Label>
        ))}
      </RadioGroup>
    </div>
  );
}
