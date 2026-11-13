import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { requestConsultationCreate } from '~/features/customers/api/customerApi';
import { customerQueryKeys } from '~/features/customers/api/customerQuery';
import { MAX_CONSULTATION_CONTENT_LENGTH } from '~/features/customers/type';

import type { ChangeEvent } from 'react';
import type {
  ConsultationCreateFieldErrors,
  ConsultationCreateSubmission,
} from '~/features/customers/type';

type ConsultationCreateFormState = {
  open: boolean;
  content: string;
  nextContactOn: string;
  fieldErrors?: ConsultationCreateFieldErrors;
  formError?: string;
  isSubmitting: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  changeContent: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  changeNextContactOn: (value: string) => void;
  submitConsultation: () => void;
};

const transportErrorMessage = '상담 이력을 등록하지 못했습니다. 다시 시도하세요.';

export function useConsultationCreateForm(customerId: string): ConsultationCreateFormState {
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [nextContactOn, setNextContactOn] = useState('');
  const mutation = useMutation({
    mutationFn: (submission: ConsultationCreateSubmission) =>
      requestConsultationCreate(customerId, submission),
    onSuccess: (response) => {
      if (response.id === undefined || response.fieldErrors || response.formError) {
        return;
      }
      void queryClient.invalidateQueries({
        queryKey: customerQueryKeys.consultations(customerId),
      });
      void queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() });
      setOpen(false);
      resetFields();
      toast('상담 이력을 등록했습니다.');
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });
  const response = mutation.isError ? undefined : mutation.data;

  function resetFields(): void {
    setContent('');
    setNextContactOn('');
    mutation.reset();
  }

  function openDialog(): void {
    resetFields();
    setOpen(true);
  }

  function closeDialog(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    setOpen(false);
    resetFields();
  }

  function changeContent(event: ChangeEvent<HTMLTextAreaElement>): void {
    setContent(event.target.value.slice(0, MAX_CONSULTATION_CONTENT_LENGTH));
  }

  function submitConsultation(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    submitLock.current = true;
    mutation.mutate({
      content: content.trim(),
      nextContactOn: nextContactOn === '' ? null : nextContactOn,
    });
  }

  return {
    open,
    content,
    nextContactOn,
    fieldErrors: response?.fieldErrors,
    formError: mutation.isError ? transportErrorMessage : response?.formError,
    isSubmitting: mutation.isPending,
    openDialog,
    closeDialog,
    changeContent,
    changeNextContactOn: setNextContactOn,
    submitConsultation,
  };
}
