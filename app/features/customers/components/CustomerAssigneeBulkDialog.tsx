import { UserRoundPlusIcon } from 'lucide-react';
import { toast } from 'sonner';

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
import { useCustomerAssigneeBulkForm } from '~/features/customers/hooks/useCustomerAssigneeBulkForm';
import { readQueryError } from '~/lib/formError';
import { fieldLabel, sectionDescription } from '~/lib/styles';

import type { JSX, SubmitEvent } from 'react';

type CustomerAssigneeBulkDialogProps = {
  customerIds: string[];
  onAssigned: () => void;
};

function preventDialogDismiss(event: { preventDefault: () => void }): void {
  event.preventDefault();
}

export function CustomerAssigneeBulkDialog({
  customerIds,
  onAssigned,
}: CustomerAssigneeBulkDialogProps): JSX.Element {
  const {
    open,
    assigneeId,
    assignees,
    formError,
    isSubmitting,
    openDialog,
    closeDialog,
    changeAssignee,
    submitAssignees,
  } = useCustomerAssigneeBulkForm(customerIds, onAssigned);
  const selectedCount = customerIds.length;

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      closeDialog();
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    submitAssignees();
  }

  function handleOpen(): void {
    if (selectedCount === 0) {
      toast('고객을 선택해 주세요.');
      return;
    }
    openDialog();
  }

  return (
    <>
      <Button type="button" size="lg" variant="secondary" onClick={handleOpen}>
        <UserRoundPlusIcon />
        일괄 담당 등록
        {selectedCount > 0 ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
            {selectedCount}
          </span>
        ) : null}
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!isSubmitting}
          onInteractOutside={isSubmitting ? preventDialogDismiss : undefined}
          onPointerDownOutside={isSubmitting ? preventDialogDismiss : undefined}
        >
          <form noValidate className="grid gap-4" onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>일괄 담당 등록</DialogTitle>
              <DialogDescription className={sectionDescription}>
                선택한 {selectedCount}명의 담당을 등록합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="customer-bulk-assignee" className={fieldLabel}>
                담당
              </Label>
              <Select
                value={assigneeId === '' ? undefined : assigneeId}
                disabled={assignees.isPending || assignees.isError || isSubmitting}
                onValueChange={changeAssignee}
              >
                <SelectTrigger
                  id="customer-bulk-assignee"
                  className="w-full"
                  aria-invalid={formError ? true : undefined}
                  aria-describedby={formError ? 'customer-bulk-assignee-error' : undefined}
                >
                  <SelectValue placeholder="담당을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {assignees.data?.assignees.map((assignee) => (
                    <SelectItem key={assignee.id} value={assignee.id}>
                      {assignee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {assignees.isError ? (
                <p className="text-sm text-destructive" role="alert">
                  {readQueryError(assignees.error, '상담 담당 목록을 불러오지 못했습니다.')}
                </p>
              ) : null}
              {formError ? (
                <p
                  id="customer-bulk-assignee-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {formError}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog} disabled={isSubmitting}>
                취소
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting || assignees.isPending || assignees.isError || assigneeId === ''
                }
                aria-busy={isSubmitting}
              >
                {isSubmitting ? '저장 중...' : '저장'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
