import { useState } from 'react';
import { useParams } from 'react-router';

import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { installmentScheduleLabel } from '~/features/customers/type';
import { ReceivableInstallmentDialog } from '~/features/receivables/components/ReceivableInstallmentDialog';
import { ReceivablePaymentDialog } from '~/features/receivables/components/ReceivablePaymentDialog';
import { ReceivablePlanDialog } from '~/features/receivables/components/ReceivablePlanDialog';
import { ReceivableStatusBadge } from '~/features/receivables/components/ReceivableStatusBadge';
import { useReceivableDetail } from '~/features/receivables/hooks/useReceivableDetail';
import { readQueryError } from '~/lib/formError';
import { formatWon } from '~/lib/money';
import { pageAlert, pageSurface } from '~/lib/styles';
import { cn } from '~/lib/utils';

import type { JSX } from 'react';
import type { ReceivableDetail, ReceivablePlanItem } from '~/features/receivables/type';

const summaryFields = [
  { key: 'totalRetainer', label: '총 수임료' },
  { key: 'depositReceived', label: '계약금 누계' },
  { key: 'installmentReceived', label: '회차 수납 누계' },
  { key: 'remainingRetainer', label: '남은 수임료' },
] as const satisfies readonly { key: keyof ReceivableDetail['customer']; label: string }[];

function ReceivableDetailSkeleton(): JSX.Element {
  return (
    <div className="grid gap-5" aria-hidden="true">
      <div className={`${pageSurface} grid gap-5 p-5`}>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
      <div className={`${pageSurface} p-5`}>
        <Skeleton className="h-56 w-full" />
      </div>
      <div className={`${pageSurface} p-5`}>
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}

function CustomerSummary({ detail }: { detail: ReceivableDetail }): JSX.Element {
  return (
    <section className={`${pageSurface} grid gap-5 p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-base font-semibold text-foreground">{detail.customer.name}</h2>
          <p className="text-sm text-muted-foreground">{detail.customer.caseType.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ReceivablePlanDialog customerId={detail.customer.id} plans={detail.plans} />
          <ReceivablePaymentDialog customerId={detail.customer.id} plans={detail.plans} />
        </div>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryFields.map((field) => {
          const emphasized = field.key === 'remainingRetainer';
          return (
            <div key={field.key} className="rounded-lg bg-muted px-4 py-3">
              <dt className="text-xs text-muted-foreground">{field.label}</dt>
              <dd
                className={cn(
                  'mt-2 font-semibold text-foreground tabular-nums',
                  emphasized ? 'text-2xl' : 'text-lg',
                )}
              >
                {formatWon(detail.customer[field.key])}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

function planScheduledTotal(plans: ReceivablePlanItem[]): number {
  return plans.reduce((sum, plan) => sum + plan.scheduledAmount, 0);
}

function PlanAmountNotice({
  plans,
  totalRetainer,
}: {
  plans: ReceivablePlanItem[];
  totalRetainer: number;
}): JSX.Element | null {
  if (plans.length === 0) {
    return null;
  }
  const scheduledTotal = planScheduledTotal(plans);
  if (scheduledTotal === totalRetainer) {
    return null;
  }
  const difference = Math.abs(scheduledTotal - totalRetainer);
  const comparison = scheduledTotal > totalRetainer ? '많습니다' : '적습니다';
  return (
    <p
      role="status"
      className="rounded-xl bg-destructive/10 px-5 py-4 text-sm font-medium text-destructive ring-1 ring-destructive/40"
    >
      예정액 합계 {formatWon(scheduledTotal)}이 총 수임료 {formatWon(totalRetainer)}보다{' '}
      {formatWon(difference)} {comparison}.
    </p>
  );
}

function PlanTable({
  customerId,
  plans,
  totalRetainer,
}: {
  customerId: string;
  plans: ReceivablePlanItem[];
  totalRetainer: number;
}): JSX.Element {
  const [editing, setEditing] = useState<ReceivablePlanItem | null>(null);

  return (
    <section className="grid gap-3">
      <h2 className="text-base font-semibold text-foreground">회차별 분납계획</h2>
      <div className={`${pageSurface} overflow-hidden`}>
        <Table>
          <caption className="sr-only">회차별 분납계획</caption>
          <TableHeader>
            <TableRow className="border-border hover:bg-card">
              <TableHead className="font-semibold">회차</TableHead>
              <TableHead className="font-semibold">예정일</TableHead>
              <TableHead className="text-right font-semibold">회차 예정액</TableHead>
              <TableHead className="text-right font-semibold">회차 수납액</TableHead>
              <TableHead className="text-right font-semibold">남은 예정액</TableHead>
              <TableHead className="font-semibold">상태</TableHead>
              <TableHead className="font-semibold">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.length > 0 ? (
              plans.map((plan) => {
                const label = installmentScheduleLabel(plan);
                return (
                  <TableRow key={plan.id}>
                    <TableCell>{label}</TableCell>
                    <TableCell>
                      <time dateTime={plan.promisedOn}>{plan.promisedOn}</time>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatWon(plan.scheduledAmount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatWon(plan.receivedAmount)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right tabular-nums',
                        plan.status === 'OVERDUE' && 'text-destructive',
                      )}
                    >
                      {formatWon(plan.remainingAmount)}
                    </TableCell>
                    <TableCell>
                      <ReceivableStatusBadge status={plan.status} />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label={`${label} 예정일과 예정액 변경`}
                        onClick={() => {
                          setEditing(plan);
                        }}
                      >
                        변경
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  등록된 분납 계획이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <PlanAmountNotice plans={plans} totalRetainer={totalRetainer} />
      {editing ? (
        <ReceivableInstallmentDialog
          key={editing.id}
          customerId={customerId}
          plan={editing}
          onClose={() => {
            setEditing(null);
          }}
        />
      ) : null}
    </section>
  );
}

function PaymentTable({ payments }: { payments: ReceivableDetail['payments'] }): JSX.Element {
  return (
    <section className="grid gap-3">
      <h2 className="text-base font-semibold text-foreground">입금 내역</h2>
      <div className={`${pageSurface} overflow-hidden`}>
        <Table>
          <caption className="sr-only">입금 내역</caption>
          <TableHeader>
            <TableRow className="border-border hover:bg-card">
              <TableHead className="font-semibold">입금일</TableHead>
              <TableHead className="font-semibold">구분</TableHead>
              <TableHead className="text-right font-semibold">입금액</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length > 0 ? (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <time dateTime={payment.paidOn}>{payment.paidOn}</time>
                  </TableCell>
                  <TableCell>{installmentScheduleLabel(payment)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatWon(payment.amount)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                  등록된 입금 내역이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

export function ReceivableDetailPage(): JSX.Element {
  const params = useParams();
  const customerId = params.customerId ?? '';
  const detail = useReceivableDetail(customerId);

  if (customerId === '') {
    return (
      <p role="alert" className={pageAlert}>
        분납 고객을 찾을 수 없습니다.
      </p>
    );
  }

  if (detail.isPending) {
    return <ReceivableDetailSkeleton />;
  }

  if (detail.isError) {
    return (
      <p role="alert" className={pageAlert}>
        {readQueryError(detail.error, '분납 상세를 불러오지 못했습니다.')}
      </p>
    );
  }

  return (
    <div className="grid gap-5">
      <CustomerSummary detail={detail.data} />
      <PlanTable
        customerId={detail.data.customer.id}
        plans={detail.data.plans}
        totalRetainer={detail.data.customer.totalRetainer}
      />
      <PaymentTable payments={detail.data.payments} />
    </div>
  );
}
