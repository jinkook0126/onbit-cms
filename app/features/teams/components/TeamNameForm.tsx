import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { TeamStatusForm } from '~/features/teams/components/TeamStatusForm';
import { useTeamNameForm } from '~/features/teams/hooks/useTeamNameForm';
import { MAX_TEAM_NAME_LENGTH } from '~/features/teams/type';
import { fieldLabel, sectionDescription } from '~/lib/styles';

import type { JSX, SubmitEvent } from 'react';
import type { TeamDetail } from '~/features/teams/type';

type TeamNameFormProps = {
  team: TeamDetail;
};

export function TeamNameForm({ team }: TeamNameFormProps): JSX.Element {
  const { name, fieldErrors, formError, isSubmitting, changeName, submitName } = useTeamNameForm(
    team.id,
    team.name,
  );

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    submitName();
  }

  return (
    <section className="grid gap-4" aria-labelledby="team-name-heading">
      <div className="grid gap-1">
        <h2 id="team-name-heading" className="text-base font-semibold text-foreground">
          팀
        </h2>
        <p className={sectionDescription}>팀 이름을 바꿀 수 있습니다.</p>
      </div>
      <form noValidate className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <Label htmlFor="team-detail-name" className={fieldLabel}>
            팀 이름
          </Label>
          <Input
            id="team-detail-name"
            name="name"
            value={name}
            className="w-full max-w-60 font-medium"
            maxLength={MAX_TEAM_NAME_LENGTH}
            aria-required
            disabled={isSubmitting}
            onChange={changeName}
            aria-invalid={fieldErrors?.name ? true : undefined}
            aria-describedby={
              fieldErrors?.name
                ? 'team-detail-name-help team-detail-name-error'
                : 'team-detail-name-help'
            }
          />
          <p id="team-detail-name-help" className="text-sm text-muted-foreground">
            {MAX_TEAM_NAME_LENGTH}자 이하로 입력하세요.
          </p>
          {fieldErrors?.name ? (
            <p id="team-detail-name-error" className="text-sm text-destructive">
              {fieldErrors.name}
            </p>
          ) : null}
        </div>
        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <div>
          <Button type="submit" size="lg" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? '저장 중...' : '저장'}
          </Button>
        </div>
      </form>
      <TeamStatusForm team={team} />
    </section>
  );
}
