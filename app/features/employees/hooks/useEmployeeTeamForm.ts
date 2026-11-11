import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { requestEmployeeTeamUpdate } from '~/features/employees/api/employeeApi';
import { employeeQueryKeys } from '~/features/employees/api/employeeQuery';
import { requestTeamList } from '~/features/teams/api/teamApi';
import { teamQueryKeys } from '~/features/teams/api/teamQuery';

import type { EmployeeListResponse } from '~/features/employees/type';
import type { TeamListItem } from '~/features/teams/type';

type EmployeeTeamFormState = {
  teamId: string | null;
  teams: TeamListItem[];
  isLoadingTeams: boolean;
  formError?: string;
  isSubmitting: boolean;
  changeTeam: (teamId: string | null) => void;
  submitTeam: () => void;
};

const transportErrorMessage = '직원 팀을 변경하지 못했습니다. 다시 시도하세요.';

export function useEmployeeTeamForm(
  employeeId: string,
  savedTeamId: string | null,
  companyId: string,
  open: boolean,
  onSaved: () => void,
): EmployeeTeamFormState {
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [draft, setDraft] = useState<string | null | undefined>(undefined);
  const teams = useQuery({
    queryKey: teamQueryKeys.list(companyId),
    queryFn: ({ signal }) => requestTeamList(companyId, signal),
    enabled: open && companyId !== '',
  });
  const mutation = useMutation({
    mutationFn: (teamId: string | null) => requestEmployeeTeamUpdate(employeeId, { teamId }),
    onSuccess: (response) => {
      if (response.formError || !Object.hasOwn(response, 'teamId')) {
        return;
      }
      const teamId = response.teamId ?? null;
      const teamName = response.teamName ?? null;
      queryClient.setQueriesData<EmployeeListResponse>(
        { queryKey: employeeQueryKeys.lists() },
        (current) => {
          if (!current) {
            return current;
          }
          return {
            ...current,
            employees: current.employees.map((employee) =>
              employee.id === employeeId ? { ...employee, teamId, teamName } : employee,
            ),
          };
        },
      );
      void queryClient.invalidateQueries({ queryKey: teamQueryKeys.all });
      setDraft(undefined);
      toast('팀을 변경했습니다.');
      onSaved();
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });
  const response = mutation.isError ? undefined : mutation.data;
  const teamId = draft === undefined ? savedTeamId : draft;
  const teamOptions = (teams.data?.teams ?? []).filter(
    (team) => team.isActive || team.id === savedTeamId,
  );

  function changeTeam(nextTeamId: string | null): void {
    setDraft(nextTeamId);
  }

  function submitTeam(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    submitLock.current = true;
    mutation.mutate(teamId);
  }

  function resolveFormError(): string | undefined {
    if (teams.isError) {
      return '팀 목록을 불러오지 못했습니다.';
    }
    if (mutation.isError) {
      return transportErrorMessage;
    }
    return response?.formError;
  }

  return {
    teamId,
    teams: teamOptions,
    isLoadingTeams: teams.isPending,
    formError: resolveFormError(),
    isSubmitting: mutation.isPending,
    changeTeam,
    submitTeam,
  };
}
