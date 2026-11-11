import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { requestTeamLeaderUpdate } from '~/features/teams/api/teamApi';
import { replaceListedTeam, replaceTeamDetail } from '~/features/teams/api/teamQuery';

type TeamLeaderFormState = {
  leaderId: string | null;
  formError?: string;
  isSubmitting: boolean;
  changeLeader: (leaderId: string | null) => void;
  submitLeader: () => void;
};

const transportErrorMessage = '팀장을 변경하지 못했습니다. 다시 시도하세요.';

export function useTeamLeaderForm(
  teamId: string,
  savedLeaderId: string | null,
): TeamLeaderFormState {
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [draft, setDraft] = useState<string | null | undefined>(undefined);
  const mutation = useMutation({
    mutationFn: (leaderId: string | null) => requestTeamLeaderUpdate(teamId, { leaderId }),
    onSuccess: (response) => {
      if (response.formError || !Object.hasOwn(response, 'leaderId')) {
        return;
      }
      const leaderId = response.leaderId ?? null;
      const leaderName = response.leaderName ?? null;
      replaceTeamDetail(queryClient, teamId, { leaderId, leaderName });
      replaceListedTeam(queryClient, teamId, { leaderName });
      setDraft(undefined);
      toast('팀장을 변경했습니다.');
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });
  const response = mutation.isError ? undefined : mutation.data;

  function changeLeader(leaderId: string | null): void {
    setDraft(leaderId);
  }

  function submitLeader(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    submitLock.current = true;
    mutation.mutate(draft === undefined ? savedLeaderId : draft);
  }

  function resolveFormError(): string | undefined {
    if (mutation.isError) {
      return transportErrorMessage;
    }
    return response?.formError;
  }

  return {
    leaderId: draft === undefined ? savedLeaderId : draft,
    formError: resolveFormError(),
    isSubmitting: mutation.isPending,
    changeLeader,
    submitLeader,
  };
}
