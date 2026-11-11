import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { useTeamLeaderForm } from '~/features/teams/hooks/useTeamLeaderForm';
import { fieldLabel, sectionDescription } from '~/lib/styles';

import type { JSX, SubmitEvent } from 'react';
import type { TeamDetail } from '~/features/teams/type';

type TeamLeaderFormProps = {
  team: TeamDetail;
};

const unsetLeader = 'none';

export function TeamLeaderForm({ team }: TeamLeaderFormProps): JSX.Element {
  const { leaderId, formError, isSubmitting, changeLeader, submitLeader } = useTeamLeaderForm(
    team.id,
    team.leaderId,
  );

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    submitLeader();
  }

  function handleLeaderChange(value: string): void {
    changeLeader(value === unsetLeader ? null : value);
  }

  return (
    <section
      className="grid gap-4 border-t border-border pt-8"
      aria-labelledby="team-leader-heading"
    >
      <div className="grid gap-1">
        <h2 id="team-leader-heading" className="text-base font-semibold text-foreground">
          팀장
        </h2>
        <p className={sectionDescription}>같은 팀의 직원 중에서 고릅니다.</p>
      </div>
      <form noValidate className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid w-full max-w-80 gap-2">
          <Label htmlFor="team-leader" className={fieldLabel}>
            팀장
          </Label>
          <Select
            value={leaderId ?? unsetLeader}
            disabled={isSubmitting}
            onValueChange={handleLeaderChange}
          >
            <SelectTrigger
              id="team-leader"
              className="w-full"
              aria-invalid={formError ? true : undefined}
              aria-describedby={
                formError ? 'team-leader-help team-leader-error' : 'team-leader-help'
              }
            >
              <SelectValue placeholder="팀장을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={unsetLeader}>미정</SelectItem>
              {team.members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p id="team-leader-help" className="text-sm text-muted-foreground">
            {team.members.length === 0
              ? '팀에 소속된 직원이 없습니다.'
              : '저장하면 선택한 직원이 팀장이 됩니다.'}
          </p>
          {formError ? (
            <p id="team-leader-error" role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          ) : null}
        </div>
        <div>
          <Button type="submit" size="lg" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? '저장 중...' : '저장'}
          </Button>
        </div>
      </form>
    </section>
  );
}
