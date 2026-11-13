import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { ConsultationFields } from '~/features/customers/components/ConsultationFields';
import { useConsultationEditForm } from '~/features/customers/hooks/useConsultationEditForm';
import { sectionDescription } from '~/lib/styles';

import type { JSX, SubmitEvent } from 'react';
import type { ConsultationListItem } from '~/features/customers/type';

type OutsideEvent = {
  preventDefault: () => void;
  target: EventTarget | null;
};

function isDatePickerTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[data-slot="popover-content"]') !== null;
}

type ConsultationEditDialogProps = {
  customerId: string;
  consultation: ConsultationListItem;
  onClose: () => void;
};

export function ConsultationEditDialog({
  customerId,
  consultation,
  onClose,
}: ConsultationEditDialogProps): JSX.Element {
  const {
    content,
    nextContactOn,
    fieldErrors,
    formError,
    isSubmitting,
    canSave,
    closeDialog,
    changeContent,
    changeNextContactOn,
    submitConsultation,
  } = useConsultationEditForm(customerId, consultation, onClose);

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
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!isSubmitting}
        onInteractOutside={preventOutsideDismiss}
        onPointerDownOutside={preventOutsideDismiss}
      >
        <form noValidate className="grid gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>상담 수정</DialogTitle>
            <DialogDescription className={sectionDescription}>
              상담 내용과 다음 상담일정을 수정하세요. 다음 상담일정은 비워 둘 수 있고, 상담일자는
              바꾸지 않습니다.
            </DialogDescription>
          </DialogHeader>
          <ConsultationFields
            contentId="consultation-edit-content"
            nextContactId="consultation-edit-next-contact"
            content={content}
            nextContactOn={nextContactOn}
            fieldErrors={fieldErrors}
            disabled={isSubmitting}
            onContentChange={changeContent}
            onNextContactChange={changeNextContactOn}
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
            <Button type="submit" disabled={!canSave} aria-busy={isSubmitting}>
              {isSubmitting ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
