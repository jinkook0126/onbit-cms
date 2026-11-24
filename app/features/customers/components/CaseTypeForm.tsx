import { PencilIcon } from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { useCaseTypeForm } from '~/features/customers/hooks/useCaseTypeForm';
import { fieldLabel, fieldValue } from '~/lib/styles';

import type { JSX, SubmitEvent } from 'react';
import type { CatalogOptionRef } from '~/features/catalog/type';

type CaseTypeFormProps = {
  customerId: string;
  caseType: CatalogOptionRef;
};

export function CaseTypeForm({ customerId, caseType }: CaseTypeFormProps): JSX.Element {
  const form = useCaseTypeForm(customerId, caseType);
  const errorId = 'customer-case-type-error';

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    form.saveCaseType();
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor="customer-case-type" className={fieldLabel}>
        사건 유형
      </Label>
      {form.editing ? (
        <form noValidate className="grid gap-2" onSubmit={handleSubmit}>
          <Select
            value={form.caseTypeId}
            disabled={form.isSubmitting}
            onValueChange={form.changeCaseType}
          >
            <SelectTrigger
              id="customer-case-type"
              size="sm"
              aria-invalid={form.formError ? true : undefined}
              aria-describedby={form.formError ? errorId : undefined}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {form.caseTypeOptions.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={form.isSubmitting}
              onClick={form.cancelEditing}
            >
              취소
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!form.isDirty || form.isSubmitting}
              aria-busy={form.isSubmitting}
            >
              {form.isSubmitting ? '저장 중...' : '저장'}
            </Button>
          </div>
          {form.formError ? (
            <p id={errorId} role="alert" className="text-sm text-destructive">
              {form.formError}
            </p>
          ) : null}
        </form>
      ) : (
        <div className="flex h-5 items-center gap-1">
          <p className={fieldValue}>{caseType.name}</p>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="size-5 text-muted-foreground"
            aria-label="사건 유형 수정"
            onClick={form.beginEditing}
          >
            <PencilIcon />
          </Button>
        </div>
      )}
    </div>
  );
}
