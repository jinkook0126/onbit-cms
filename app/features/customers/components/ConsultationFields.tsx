import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { CustomerNextContactField } from '~/features/customers/components/CustomerNextContactField';
import { MAX_CONSULTATION_CONTENT_LENGTH } from '~/features/customers/type';
import { fieldLabel } from '~/lib/styles';

import type { ChangeEvent, JSX } from 'react';
import type { ConsultationCreateFieldErrors } from '~/features/customers/type';

type ConsultationFieldsProps = {
  contentId: string;
  nextContactId: string;
  content: string;
  nextContactOn: string;
  fieldErrors?: ConsultationCreateFieldErrors;
  disabled: boolean;
  onContentChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onNextContactChange: (value: string) => void;
};

export function ConsultationFields({
  contentId,
  nextContactId,
  content,
  nextContactOn,
  fieldErrors,
  disabled,
  onContentChange,
  onNextContactChange,
}: ConsultationFieldsProps): JSX.Element {
  const contentErrorId = `${contentId}-error`;

  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor={contentId} className={fieldLabel}>
          상담 내용
        </Label>
        <Textarea
          id={contentId}
          name="content"
          value={content}
          maxLength={MAX_CONSULTATION_CONTENT_LENGTH}
          aria-required
          disabled={disabled}
          onChange={onContentChange}
          aria-invalid={fieldErrors?.content ? true : undefined}
          aria-describedby={fieldErrors?.content ? contentErrorId : undefined}
        />
        {fieldErrors?.content ? (
          <p id={contentErrorId} className="text-sm text-destructive">
            {fieldErrors.content}
          </p>
        ) : null}
      </div>
      <CustomerNextContactField
        id={nextContactId}
        label="다음 상담일정"
        value={nextContactOn}
        invalid={Boolean(fieldErrors?.nextContactOn)}
        message={fieldErrors?.nextContactOn}
        disabled={disabled}
        onChange={onNextContactChange}
      />
    </>
  );
}
