import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { requestTeamNameUpdate } from '~/features/teams/api/teamApi';
import { replaceListedTeam, replaceTeamDetail } from '~/features/teams/api/teamQuery';
import { MAX_TEAM_NAME_LENGTH } from '~/features/teams/type';

import type { ChangeEvent } from 'react';
import type { TeamNameFieldErrors } from '~/features/teams/type';

type TeamNameFormState = {
  name: string;
  fieldErrors?: TeamNameFieldErrors;
  formError?: string;
  isSubmitting: boolean;
  changeName: (event: ChangeEvent<HTMLInputElement>) => void;
  submitName: () => void;
};

const transportErrorMessage = '팀 이름을 변경하지 못했습니다. 다시 시도하세요.';

export function useTeamNameForm(teamId: string, savedName: string): TeamNameFormState {
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [draft, setDraft] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (name: string) => requestTeamNameUpdate(teamId, { name }),
    onSuccess: (response) => {
      if (response.name === undefined || response.fieldErrors || response.formError) {
        return;
      }
      const saved = response.name;
      replaceTeamDetail(queryClient, teamId, { name: saved });
      replaceListedTeam(queryClient, teamId, { name: saved });
      setDraft(null);
      toast('팀 이름을 변경했습니다.');
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });
  const response = mutation.isError ? undefined : mutation.data;

  function changeName(event: ChangeEvent<HTMLInputElement>): void {
    setDraft(event.currentTarget.value.slice(0, MAX_TEAM_NAME_LENGTH));
  }

  function submitName(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    submitLock.current = true;
    mutation.mutate(draft ?? savedName);
  }

  function resolveFormError(): string | undefined {
    if (mutation.isError) {
      return transportErrorMessage;
    }
    return response?.formError;
  }

  return {
    name: draft ?? savedName,
    fieldErrors: response?.fieldErrors,
    formError: resolveFormError(),
    isSubmitting: mutation.isPending,
    changeName,
    submitName,
  };
}
