import { Badge } from '~/components/ui/badge';
import { Skeleton } from '~/components/ui/skeleton';
import { CaseProgressUpdateDialog } from '~/features/customers/components/CaseProgressUpdateDialog';
import { useCustomerCaseProgress } from '~/features/customers/hooks/useCustomerCaseProgress';
import { caseProgressStageLabels } from '~/features/customers/type';
import { readQueryError } from '~/lib/formError';
import { fieldLabel, fieldValue, pageAlert, pageSurface } from '~/lib/styles';

import type { JSX } from 'react';

type CustomerCaseProgressProps = {
  customerId: string;
};

const unsetTaskDueLabel = '미정';

export function CustomerCaseProgress({ customerId }: CustomerCaseProgressProps): JSX.Element {
  const caseProgress = useCustomerCaseProgress(customerId);

  if (caseProgress.isPending) {
    return (
      <div className={`${pageSurface} p-5`} aria-hidden="true">
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (caseProgress.isError) {
    return (
      <p role="alert" className={pageAlert}>
        {readQueryError(caseProgress.error, '사건 진행을 불러오지 못했습니다.')}
      </p>
    );
  }

  const { stage, nextTask, taskDueOn } = caseProgress.data;

  return (
    <div className="grid gap-3">
      <div className="flex justify-end">
        <CaseProgressUpdateDialog customerId={customerId} progress={caseProgress.data} />
      </div>
      <section className={`${pageSurface} p-6`}>
        <div className="grid gap-4 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border">
          <div className="grid content-center gap-2 sm:pr-6">
            <p className={fieldLabel}>진행단계</p>
            <p className={fieldValue}>{caseProgressStageLabels[stage]}</p>
          </div>
          <div className="grid content-center gap-2 sm:px-6">
            <p className={fieldLabel}>다음 할 일</p>
            <p className={`${fieldValue} break-words`}>{nextTask}</p>
          </div>
          <div className="grid content-center gap-2 sm:px-6">
            <p className={fieldLabel}>업무 기한</p>
            {taskDueOn ? (
              <time className={fieldValue} dateTime={taskDueOn}>
                {taskDueOn}
              </time>
            ) : (
              <Badge variant="outline">{unsetTaskDueLabel}</Badge>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
