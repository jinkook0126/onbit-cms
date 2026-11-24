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
import { isRetainedStatus } from '~/features/customers/type';
import { fieldLabel } from '~/lib/styles';

import type { JSX, SubmitEvent } from 'react';
import type { CatalogOptionRef } from '~/features/catalog/type';

type ConsultationStatusFormProps = {
  customerId: string;
  status: CatalogOptionRef;
};

export function ConsultationStatusForm({
  customerId,
  status,
}: ConsultationStatusFormProps): JSX.Element {
  const form = useConsultationStatusForm(customerId, status);
  const retained = isRetainedStatus(status.code);
  const editableStatuses = form.statusOptions.filter((item) => !isRetainedStatus(item.code));
  const errorId = 'consultation-tab-status-error';

  function handleStatusChange(value: string): void {
    if (editableStatuses.some((item) => item.id === value)) {
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
          value={form.statusId}
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
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
            {retained ? (
              <SelectItem value={status.id} disabled>
                {status.name}
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
