import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import { useTeamStatusForm } from '~/features/teams/hooks/useTeamStatusForm';
import { fieldLabel, fieldValue } from '~/lib/styles';

import type { JSX } from 'react';
import type { TeamDetail } from '~/features/teams/type';

type TeamStatusFormProps = {
  team: TeamDetail;
};

export function TeamStatusForm({ team }: TeamStatusFormProps): JSX.Element {
  const { isActive, formError, isSubmitting, changeStatus } = useTeamStatusForm(
    team.id,
    team.isActive,
  );

  return (
    <div className="grid gap-2">
      <p id="team-status-label" className={fieldLabel}>
        상태
      </p>
      <div className="flex items-center gap-2">
        <Switch
          id="team-status"
          checked={isActive}
          disabled={isSubmitting}
          onCheckedChange={changeStatus}
          aria-describedby={formError ? 'team-status-help team-status-error' : 'team-status-help'}
          aria-invalid={formError ? true : undefined}
        />
        <Label htmlFor="team-status" className={fieldValue}>
          {isActive ? '활성' : '비활성'}
        </Label>
      </div>
      <p id="team-status-help" className="text-sm text-muted-foreground">
        스위치를 바꾸면 이 팀의 활성 상태가 저장됩니다.
      </p>
      {formError ? (
        <p id="team-status-error" role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}
    </div>
  );
}
