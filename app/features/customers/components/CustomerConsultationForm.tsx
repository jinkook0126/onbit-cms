import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { CustomerNextContactField } from '~/features/customers/components/CustomerNextContactField';
import { useConsultationCreateForm } from '~/features/customers/hooks/useConsultationCreateForm';
import { MAX_CONSULTATION_CONTENT_LENGTH } from '~/features/customers/type';
import { fieldLabel } from '~/lib/styles';

import type { JSX, SubmitEvent } from 'react';

type CustomerConsultationFormProps = {
  customerId: string;
};

export function CustomerConsultationForm({
  customerId,
}: CustomerConsultationFormProps): JSX.Element {
  const {
    content,
    nextContactOn,
    fieldErrors,
    formError,
    isSubmitting,
    changeContent,
    changeNextContactOn,
    submitConsultation,
  } = useConsultationCreateForm(customerId);
  const contentErrorId = 'customer-consultation-content-error';

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    submitConsultation();
  }

  return (
    <form noValidate className="grid gap-4" onSubmit={handleSubmit}>
      <h3 className="text-sm font-medium text-foreground">상담 입력</h3>
      <CustomerNextContactField
        id={`customer-consultation-next-contact-${customerId}`}
        label="다음 연락일"
        value={nextContactOn}
        invalid={Boolean(fieldErrors?.nextContactOn)}
        message={fieldErrors?.nextContactOn}
        disabled={isSubmitting}
        withTime
        onChange={changeNextContactOn}
      />
      <div className="grid gap-2">
        <Label htmlFor={`customer-consultation-content-${customerId}`} className={fieldLabel}>
          상담 내용
        </Label>
        <Textarea
          id={`customer-consultation-content-${customerId}`}
          name="content"
          value={content}
          maxLength={MAX_CONSULTATION_CONTENT_LENGTH}
          aria-required
          disabled={isSubmitting}
          onChange={changeContent}
          aria-invalid={fieldErrors?.content ? true : undefined}
          aria-describedby={fieldErrors?.content ? contentErrorId : undefined}
        />
        {fieldErrors?.content ? (
          <p id={contentErrorId} className="text-sm text-destructive">
            {fieldErrors.content}
          </p>
        ) : null}
      </div>
      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? '저장 중...' : '저장'}
        </Button>
      </div>
    </form>
  );
}
