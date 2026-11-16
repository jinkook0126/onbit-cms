import { Label } from '~/components/ui/label';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { caseStageOptions } from '~/features/cases/type';
import { caseProgressStageLabels } from '~/features/customers/type';
import { fieldLabel } from '~/lib/styles';

import type { JSX } from 'react';
import type { CaseProgressStage } from '~/features/customers/type';

type CaseStageFilterProps = {
  stage: CaseProgressStage | null;
  onStageChange: (stage: CaseProgressStage | null) => void;
};

const allStages = 'all';

function isListedStage(value: string): value is CaseProgressStage {
  return caseStageOptions.some((item) => item === value);
}

export function CaseStageFilter({ stage, onStageChange }: CaseStageFilterProps): JSX.Element {
  function handleChange(value: string): void {
    if (value === allStages) {
      onStageChange(null);
      return;
    }
    if (isListedStage(value)) {
      onStageChange(value);
    }
  }

  return (
    <div className="grid gap-3">
      <p id="case-stage-label" className={fieldLabel}>
        진행단계
      </p>
      <RadioGroup
        aria-labelledby="case-stage-label"
        value={stage ?? allStages}
        className="flex flex-wrap gap-x-4 gap-y-2"
        onValueChange={handleChange}
      >
        <Label htmlFor="case-stage-all" className="gap-3 font-normal text-foreground">
          <RadioGroupItem id="case-stage-all" value={allStages} />
          전체
        </Label>
        {caseStageOptions.map((item) => (
          <Label
            key={item}
            htmlFor={`case-stage-${item}`}
            className="gap-3 font-normal text-foreground"
          >
            <RadioGroupItem id={`case-stage-${item}`} value={item} />
            {caseProgressStageLabels[item]}
          </Label>
        ))}
      </RadioGroup>
    </div>
  );
}
