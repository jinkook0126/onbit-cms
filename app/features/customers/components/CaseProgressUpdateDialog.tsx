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
import { Textarea } from '~/components/ui/textarea';
import { CustomerNextContactField } from '~/features/customers/components/CustomerNextContactField';
import { useCaseProgressForm } from '~/features/customers/hooks/useCaseProgressForm';
import {
  MAX_CASE_NEXT_TASK_LENGTH,
  caseProgressStageLabels,
  isCaseProgressStage,
} from '~/features/customers/type';
import { fieldLabel, sectionDescription } from '~/lib/styles';

import type { JSX, SubmitEvent } from 'react';
import type { CaseProgress, CaseProgressStage } from '~/features/customers/type';

const caseProgressStages = Object.keys(caseProgressStageLabels) as CaseProgressStage[];

type OutsideEvent = {
  preventDefault: () => void;
  target: EventTarget | null;
};

function isDatePickerTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[data-slot="popover-content"]') !== null;
}

type CaseProgressUpdateDialogProps = {
  customerId: string;
  progress: CaseProgress;
};

export function CaseProgressUpdateDialog({
  customerId,
  progress,
}: CaseProgressUpdateDialogProps): JSX.Element {
  const form = useCaseProgressForm(customerId, progress);
  const taskErrorId = 'case-progress-task-error';

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      form.closeDialog();
    }
  }

  function handleStageChange(value: string): void {
    if (isCaseProgressStage(value)) {
      form.changeStage(value);
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    form.submitProgress();
  }

  function preventOutsideDismiss(event: OutsideEvent): void {
    if (form.isSubmitting || isDatePickerTarget(event.target)) {
      event.preventDefault();
    }
  }

  return (
    <>
      <Button type="button" onClick={form.openDialog}>
        진행 업데이트
      </Button>
      <Dialog open={form.open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={!form.isSubmitting}
          onInteractOutside={preventOutsideDismiss}
          onPointerDownOutside={preventOutsideDismiss}
        >
          <form noValidate className="grid gap-4" onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>진행 업데이트</DialogTitle>
              <DialogDescription className={sectionDescription}>
                진행단계, 다음 할 일 또는 처리결과, 업무 기한을 입력하세요.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="case-progress-stage" className={fieldLabel}>
                진행단계
              </Label>
              <Select
                value={form.stage}
                disabled={form.isSubmitting}
                onValueChange={handleStageChange}
              >
                <SelectTrigger
                  id="case-progress-stage"
                  className="w-full"
                  aria-invalid={form.fieldErrors?.stage ? true : undefined}
                  aria-describedby={
                    form.fieldErrors?.stage ? 'case-progress-stage-error' : undefined
                  }
                >
                  <SelectValue placeholder="진행단계를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {caseProgressStages.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {caseProgressStageLabels[stage]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.fieldErrors?.stage ? (
                <p id="case-progress-stage-error" className="text-sm text-destructive">
                  {form.fieldErrors.stage}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="case-progress-task" className={fieldLabel}>
                다음 할 일 또는 처리결과
              </Label>
              <Textarea
                id="case-progress-task"
                name="nextTask"
                value={form.nextTask}
                rows={3}
                maxLength={MAX_CASE_NEXT_TASK_LENGTH}
                aria-required
                disabled={form.isSubmitting}
                onChange={form.changeNextTask}
                aria-invalid={form.fieldErrors?.nextTask ? true : undefined}
                aria-describedby={form.fieldErrors?.nextTask ? taskErrorId : undefined}
              />
              {form.fieldErrors?.nextTask ? (
                <p id={taskErrorId} className="text-sm text-destructive">
                  {form.fieldErrors.nextTask}
                </p>
              ) : null}
            </div>
            <CustomerNextContactField
              id="case-progress-due"
              label="업무 기한"
              value={form.taskDueOn}
              invalid={form.fieldErrors?.taskDueOn !== undefined}
              message={form.fieldErrors?.taskDueOn}
              disabled={form.isSubmitting}
              onChange={form.changeTaskDueOn}
            />
            {form.formError ? (
              <p role="alert" className="text-sm text-destructive">
                {form.formError}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={form.closeDialog}
                disabled={form.isSubmitting}
              >
                취소
              </Button>
              <Button type="submit" disabled={form.isSubmitting} aria-busy={form.isSubmitting}>
                {form.isSubmitting ? '저장 중...' : '저장'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
