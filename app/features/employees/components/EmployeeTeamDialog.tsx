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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { useEmployeeTeamForm } from '~/features/employees/hooks/useEmployeeTeamForm';
import { fieldLabel, sectionDescription } from '~/lib/styles';

import type { JSX, SubmitEvent } from 'react';
import type { EmployeeListItem } from '~/features/employees/type';

type EmployeeTeamDialogProps = {
  employee: EmployeeListItem | null;
  companyId: string;
  onClose: () => void;
};

const unsetTeam = 'none';

function preventDialogDismiss(event: { preventDefault: () => void }): void {
  event.preventDefault();
}

export function EmployeeTeamDialog({
  employee,
  companyId,
  onClose,
}: EmployeeTeamDialogProps): JSX.Element {
  const { teamId, teams, isLoadingTeams, formError, isSubmitting, changeTeam, submitTeam } =
    useEmployeeTeamForm(
      employee?.id ?? '',
      employee?.teamId ?? null,
      companyId,
      employee !== null,
      onClose,
    );

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen && !isSubmitting) {
      onClose();
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    submitTeam();
  }

  function handleTeamChange(value: string): void {
    changeTeam(value === unsetTeam ? null : value);
  }

  return (
    <Dialog open={employee !== null} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!isSubmitting}
        onInteractOutside={isSubmitting ? preventDialogDismiss : undefined}
        onPointerDownOutside={isSubmitting ? preventDialogDismiss : undefined}
      >
        <form noValidate className="grid gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>팀 선택</DialogTitle>
            <DialogDescription className={sectionDescription}>
              {employee ? `${employee.name}의 팀을 고릅니다.` : '팀을 고릅니다.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="employee-team" className={fieldLabel}>
              팀
            </Label>
            <Select
              value={teamId ?? unsetTeam}
              disabled={isSubmitting || isLoadingTeams}
              onValueChange={handleTeamChange}
            >
              <SelectTrigger
                id="employee-team"
                className="w-full"
                aria-invalid={formError ? true : undefined}
                aria-describedby={formError ? 'employee-team-error' : undefined}
              >
                <SelectValue placeholder="팀을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={unsetTeam}>미정</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formError ? (
              <p id="employee-team-error" role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoadingTeams} aria-busy={isSubmitting}>
              {isSubmitting ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
