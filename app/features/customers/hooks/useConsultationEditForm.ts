import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { requestConsultationUpdate } from '~/features/customers/api/customerApi';
import { customerQueryKeys } from '~/features/customers/api/customerQuery';
import { MAX_CONSULTATION_CONTENT_LENGTH } from '~/features/customers/type';

import type { ChangeEvent } from 'react';
import type {
  ConsultationCreateFieldErrors,
  ConsultationCreateSubmission,
  ConsultationListItem,
} from '~/features/customers/type';

type ConsultationEditFormState = {
  content: string;
  nextContactOn: string;
  fieldErrors?: ConsultationCreateFieldErrors;
  formError?: string;
  isSubmitting: boolean;
  canSave: boolean;
  closeDialog: () => void;
  changeContent: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  changeNextContactOn: (value: string) => void;
  submitConsultation: () => void;
};

const transportErrorMessage = '상담 이력을 수정하지 못했습니다. 다시 시도하세요.';

export function useConsultationEditForm(
  customerId: string,
  consultation: ConsultationListItem,
  onClose: () => void,
): ConsultationEditFormState {
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [content, setContent] = useState(consultation.content);
  const [nextContactOn, setNextContactOn] = useState(consultation.nextContactOn ?? '');
  const mutation = useMutation({
    mutationFn: (submission: ConsultationCreateSubmission) =>
      requestConsultationUpdate(customerId, consultation.id, submission),
    onSuccess: (response) => {
      if (response.id === undefined || response.fieldErrors || response.formError) {
        return;
      }
      void queryClient.invalidateQueries({
        queryKey: customerQueryKeys.consultations(customerId),
      });
      void queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() });
      toast('상담 이력을 수정했습니다.');
      onClose();
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });
  const response = mutation.isError ? undefined : mutation.data;
  const nextContact = nextContactOn === '' ? null : nextContactOn;
  const isUnchanged =
    content.trim() === consultation.content && nextContact === consultation.nextContactOn;

  function closeDialog(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    onClose();
  }

  function changeContent(event: ChangeEvent<HTMLTextAreaElement>): void {
    setContent(event.target.value.slice(0, MAX_CONSULTATION_CONTENT_LENGTH));
  }

  function submitConsultation(): void {
    if (submitLock.current || mutation.isPending || isUnchanged) {
      return;
    }
    submitLock.current = true;
    mutation.mutate({
      content: content.trim(),
      nextContactOn: nextContact,
    });
  }

  return {
    content,
    nextContactOn,
    fieldErrors: response?.fieldErrors,
    formError: mutation.isError ? transportErrorMessage : response?.formError,
    isSubmitting: mutation.isPending,
    canSave: !isUnchanged && !mutation.isPending,
    closeDialog,
    changeContent,
    changeNextContactOn: setNextContactOn,
    submitConsultation,
  };
}
