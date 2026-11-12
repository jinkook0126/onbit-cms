import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { CustomerNextContactField } from '~/features/customers/components/CustomerNextContactField';
import { useConsultationCreateForm } from '~/features/customers/hooks/useConsultationCreateForm';
import { MAX_CONSULTATION_CONTENT_LENGTH } from '~/features/customers/type';
import { fieldLabel, sectionDescription } from '~/lib/styles';

import type { JSX, SubmitEvent } from 'react';

type OutsideEvent = {
  preventDefault: () => void;
  target: EventTarget | null;
};

function isDatePickerTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[data-slot="popover-content"]') !== null;
}

type ConsultationCreateDialogProps = {
  customerId: string;
};

export function ConsultationCreateDialog({
  customerId,
}: ConsultationCreateDialogProps): JSX.Element {
  const {
    open,
    content,
    nextContactOn,
    fieldErrors,
    formError,
    isSubmitting,
    openDialog,
    closeDialog,
    changeContent,
    changeNextContactOn,
    submitConsultation,
  } = useConsultationCreateForm(customerId);

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      closeDialog();
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    submitConsultation();
  }

  function preventOutsideDismiss(event: OutsideEvent): void {
    if (isSubmitting || isDatePickerTarget(event.target)) {
      event.preventDefault();
    }
  }

  return (
    <>
      <Button type="button" size="lg" onClick={openDialog}>
        상담입력
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={!isSubmitting}
          onInteractOutside={preventOutsideDismiss}
          onPointerDownOutside={preventOutsideDismiss}
        >
          <form noValidate className="grid gap-4" onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>상담 입력</DialogTitle>
              <DialogDescription className={sectionDescription}>
                상담 내용과 다음 상담일정을 입력하세요. 다음 상담일정은 비워 둘 수 있습니다.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="consultation-content" className={fieldLabel}>
                상담 내용
              </Label>
              <Textarea
                id="consultation-content"
                name="content"
                value={content}
                maxLength={MAX_CONSULTATION_CONTENT_LENGTH}
                aria-required
                disabled={isSubmitting}
                onChange={changeContent}
                aria-invalid={fieldErrors?.content ? true : undefined}
                aria-describedby={fieldErrors?.content ? 'consultation-content-error' : undefined}
              />
              {fieldErrors?.content ? (
                <p id="consultation-content-error" className="text-sm text-destructive">
                  {fieldErrors.content}
                </p>
              ) : null}
            </div>
            <CustomerNextContactField
              id="consultation-next-contact"
              label="다음 상담일정"
              value={nextContactOn}
              invalid={Boolean(fieldErrors?.nextContactOn)}
              message={fieldErrors?.nextContactOn}
              disabled={isSubmitting}
              onChange={changeNextContactOn}
            />
            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog} disabled={isSubmitting}>
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
                {isSubmitting ? '저장 중...' : '저장'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
