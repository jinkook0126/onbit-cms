import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { useTeamCreateForm } from '~/features/teams/hooks/useTeamCreateForm';
import { MAX_TEAM_NAME_LENGTH } from '~/features/teams/type';

import type { JSX, SubmitEvent } from 'react';

type TeamCreateDialogProps = {
  companyId: string;
};

function preventDialogDismiss(event: { preventDefault: () => void }): void {
  event.preventDefault();
}

export function TeamCreateDialog({ companyId }: TeamCreateDialogProps): JSX.Element {
  const {
    open,
    name,
    fieldErrors,
    formError,
    isSubmitting,
    openDialog,
    closeDialog,
    changeName,
    submitTeam,
  } = useTeamCreateForm(companyId);

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      closeDialog();
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    submitTeam();
  }

  return (
    <>
      <Button type="button" size="lg" onClick={openDialog}>
        팀 등록
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={!isSubmitting}
          onInteractOutside={isSubmitting ? preventDialogDismiss : undefined}
          onPointerDownOutside={isSubmitting ? preventDialogDismiss : undefined}
        >
          <form noValidate className="grid gap-4" onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>팀 등록</DialogTitle>
              <DialogDescription>팀 이름을 입력하세요.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="team-name">팀 이름</Label>
              <Input
                id="team-name"
                name="name"
                value={name}
                autoComplete="off"
                maxLength={MAX_TEAM_NAME_LENGTH}
                aria-required
                disabled={isSubmitting}
                onChange={changeName}
                aria-invalid={fieldErrors?.name ? true : undefined}
                aria-describedby={fieldErrors?.name ? 'team-name-error' : undefined}
              />
              {fieldErrors?.name ? (
                <p id="team-name-error" className="text-sm text-destructive">
                  {fieldErrors.name}
                </p>
              ) : null}
            </div>
            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog} disabled={isSubmitting}>
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
                {isSubmitting ? '저장 중...' : '저장'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
