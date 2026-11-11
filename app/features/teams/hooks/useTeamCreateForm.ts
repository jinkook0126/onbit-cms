import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { requestTeamCreate } from '~/features/teams/api/teamApi';
import { teamQueryKeys } from '~/features/teams/api/teamQuery';
import { MAX_TEAM_NAME_LENGTH } from '~/features/teams/type';

import type { ChangeEvent } from 'react';
import type { TeamFieldErrors } from '~/features/teams/type';

type TeamCreateFormState = {
  open: boolean;
  name: string;
  fieldErrors?: TeamFieldErrors;
  formError?: string;
  isSubmitting: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  changeName: (event: ChangeEvent<HTMLInputElement>) => void;
  submitTeam: () => void;
};

const transportErrorMessage = '팀을 등록하지 못했습니다. 다시 시도하세요.';

export function useTeamCreateForm(companyId: string): TeamCreateFormState {
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const mutation = useMutation({
    mutationFn: (teamName: string) => requestTeamCreate({ name: teamName, companyId }),
    onSuccess: (response) => {
      if (response.team === undefined || response.fieldErrors || response.formError) {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: teamQueryKeys.all });
      setName('');
      setOpen(false);
      toast('팀을 등록했습니다.');
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });
  const response = mutation.isError ? undefined : mutation.data;

  function resetFields(): void {
    setName('');
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

  function changeName(event: ChangeEvent<HTMLInputElement>): void {
    setName(event.currentTarget.value.slice(0, MAX_TEAM_NAME_LENGTH));
  }

  function submitTeam(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    submitLock.current = true;
    mutation.mutate(name);
  }

  function resolveFormError(): string | undefined {
    if (mutation.isError) {
      return transportErrorMessage;
    }
    return response?.formError;
  }

  return {
    open,
    name,
    fieldErrors: open ? response?.fieldErrors : undefined,
    formError: open ? resolveFormError() : undefined,
    isSubmitting: mutation.isPending,
    openDialog,
    closeDialog,
    changeName,
    submitTeam,
  };
}
