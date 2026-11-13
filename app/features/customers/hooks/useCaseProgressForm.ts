import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { requestCaseProgressUpdate } from '~/features/customers/api/customerApi';
import { customerQueryKeys } from '~/features/customers/api/customerQuery';
import { MAX_CASE_NEXT_TASK_LENGTH } from '~/features/customers/type';

import type { ChangeEvent } from 'react';
import type {
  CaseProgress,
  CaseProgressStage,
  CaseProgressUpdateFieldErrors,
  CaseProgressUpdateSubmission,
} from '~/features/customers/type';

type CaseProgressFormState = {
  open: boolean;
  stage: CaseProgressStage;
  nextTask: string;
  taskDueOn: string;
  fieldErrors?: CaseProgressUpdateFieldErrors;
  formError?: string;
  isSubmitting: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  changeStage: (stage: CaseProgressStage) => void;
  changeNextTask: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  changeTaskDueOn: (value: string) => void;
  submitProgress: () => void;
};

const transportErrorMessage = '사건 진행을 변경하지 못했습니다. 다시 시도하세요.';

export function useCaseProgressForm(
  customerId: string,
  progress: CaseProgress,
): CaseProgressFormState {
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<CaseProgressStage>(progress.stage);
  const [nextTask, setNextTask] = useState(progress.nextTask);
  const [taskDueOn, setTaskDueOn] = useState(progress.taskDueOn ?? '');
  const mutation = useMutation({
    mutationFn: (submission: CaseProgressUpdateSubmission) =>
      requestCaseProgressUpdate(customerId, submission),
    onSuccess: (response) => {
      if (response.id === undefined || response.fieldErrors || response.formError) {
        return;
      }
      void queryClient.invalidateQueries({
        queryKey: customerQueryKeys.caseProgress(customerId),
      });
      void queryClient.invalidateQueries({
        queryKey: customerQueryKeys.consultations(customerId),
      });
      void queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() });
      setOpen(false);
      toast('진행을 업데이트했습니다.');
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });
  const response = mutation.isError ? undefined : mutation.data;

  function openDialog(): void {
    setStage(progress.stage);
    setNextTask(progress.nextTask);
    setTaskDueOn(progress.taskDueOn ?? '');
    mutation.reset();
    setOpen(true);
  }

  function closeDialog(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    setOpen(false);
  }

  function submitProgress(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    submitLock.current = true;
    mutation.mutate({
      stage,
      nextTask: nextTask.trim(),
      taskDueOn: taskDueOn === '' ? null : taskDueOn,
    });
  }

  return {
    open,
    stage,
    nextTask,
    taskDueOn,
    fieldErrors: response?.fieldErrors,
    formError: mutation.isError ? transportErrorMessage : response?.formError,
    isSubmitting: mutation.isPending,
    openDialog,
    closeDialog,
    changeStage: setStage,
    changeNextTask: (event) => {
      setNextTask(event.target.value.slice(0, MAX_CASE_NEXT_TASK_LENGTH));
    },
    changeTaskDueOn: setTaskDueOn,
    submitProgress,
  };
}
