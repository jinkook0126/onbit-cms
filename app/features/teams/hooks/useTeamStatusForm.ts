import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { requestTeamStatusUpdate } from '~/features/teams/api/teamApi';
import { replaceListedTeam, replaceTeamDetail } from '~/features/teams/api/teamQuery';

type TeamStatusFormState = {
  isActive: boolean;
  formError?: string;
  isSubmitting: boolean;
  changeStatus: (checked: boolean) => void;
};

const transportErrorMessage = '팀 상태를 변경하지 못했습니다. 다시 시도하세요.';

export function useTeamStatusForm(teamId: string, savedIsActive: boolean): TeamStatusFormState {
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [draft, setDraft] = useState<boolean | null>(null);
  const mutation = useMutation({
    mutationFn: (isActive: boolean) => requestTeamStatusUpdate(teamId, { isActive }),
    onSuccess: (response) => {
      if (response.isActive === undefined || response.formError) {
        setDraft(null);
        return;
      }
      const saved = response.isActive;
      replaceTeamDetail(queryClient, teamId, { isActive: saved });
      replaceListedTeam(queryClient, teamId, { isActive: saved });
      setDraft(null);
      toast(saved ? '팀을 활성화했습니다.' : '팀을 비활성화했습니다.');
    },
    onError: () => {
      setDraft(null);
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });
  const response = mutation.isError ? undefined : mutation.data;

  function changeStatus(checked: boolean): void {
    if (submitLock.current || mutation.isPending || checked === (draft ?? savedIsActive)) {
      return;
    }
    submitLock.current = true;
    setDraft(checked);
    mutation.mutate(checked);
  }

  return {
    isActive: draft ?? savedIsActive,
    formError: mutation.isError ? transportErrorMessage : response?.formError,
    isSubmitting: mutation.isPending,
    changeStatus,
  };
}
