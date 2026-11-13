import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { useConsultationStatusForm } from '~/features/customers/hooks/useConsultationStatusForm';
import { consultationStatusLabels } from '~/features/customers/type';
import { fieldLabel } from '~/lib/styles';

import type { JSX, SubmitEvent } from 'react';
import type { ConsultationStatus } from '~/features/customers/type';

type ConsultationStatusFormProps = {
  customerId: string;
  status: ConsultationStatus;
};

const editableStatuses = (Object.keys(consultationStatusLabels) as ConsultationStatus[]).filter(
  (item) => item !== 'RETAINED',
);

function isEditableStatus(value: string): value is ConsultationStatus {
  return editableStatuses.some((item) => item === value);
}

export function ConsultationStatusForm({
  customerId,
  status,
}: ConsultationStatusFormProps): JSX.Element {
  const form = useConsultationStatusForm(customerId, status);
  const retained = status === 'RETAINED';
  const errorId = 'consultation-tab-status-error';

  function handleStatusChange(value: string): void {
    if (isEditableStatus(value)) {
      form.changeStatus(value);
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    form.saveStatus();
  }

  return (
    <form noValidate className="grid gap-2" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-center gap-3">
        <Label htmlFor="consultation-tab-status" className={fieldLabel}>
          상담 상태
        </Label>
        <Select
          value={form.status}
          disabled={retained || form.isSubmitting}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger
            id="consultation-tab-status"
            className="w-40"
            aria-invalid={form.formError ? true : undefined}
            aria-describedby={form.formError ? errorId : undefined}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {editableStatuses.map((item) => (
              <SelectItem key={item} value={item}>
                {consultationStatusLabels[item]}
              </SelectItem>
            ))}
            {status === 'RETAINED' ? (
              <SelectItem value="RETAINED" disabled>
                {consultationStatusLabels.RETAINED}
              </SelectItem>
            ) : null}
          </SelectContent>
        </Select>
        {retained ? null : (
          <Button
            type="submit"
            disabled={!form.isDirty || form.isSubmitting}
            aria-busy={form.isSubmitting}
          >
            {form.isSubmitting ? '저장 중...' : '저장'}
          </Button>
        )}
      </div>
      {form.formError ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {form.formError}
        </p>
      ) : null}
    </form>
  );
}
