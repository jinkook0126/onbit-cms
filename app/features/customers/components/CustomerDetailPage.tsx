import { BookOpenIcon, ListChecksIcon, MessagesSquareIcon, ReceiptTextIcon } from 'lucide-react';
import { useParams, useSearchParams } from 'react-router';

import { Badge } from '~/components/ui/badge';
import { Skeleton } from '~/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { CustomerBillingSummary } from '~/features/customers/components/CustomerBillingSummary';
import { CustomerCaseProgress } from '~/features/customers/components/CustomerCaseProgress';
import {
  CustomerConsultationList,
  formatConsultationCreatedAt,
} from '~/features/customers/components/CustomerConsultationList';
import { CustomerInstallmentList } from '~/features/customers/components/CustomerInstallmentList';
import { CustomerLedgerList } from '~/features/customers/components/CustomerLedgerList';
import { RetainCustomerButton } from '~/features/customers/components/RetainCustomerButton';
import { useCustomerCaseProgress } from '~/features/customers/hooks/useCustomerCaseProgress';
import { useCustomerConsultations } from '~/features/customers/hooks/useCustomerConsultations';
import { useCustomerDetail } from '~/features/customers/hooks/useCustomerDetail';
import {
  caseProgressStageLabels,
  consultationStatusLabels,
  customerCaseProgressTab,
  customerConsultationTab,
  customerFormError,
  formatCustomerPhone,
} from '~/features/customers/type';
import { ApiError } from '~/lib/apiClient';
import { fieldLabel, fieldValue } from '~/lib/styles';

import type { UseQueryResult } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import type { JSX } from 'react';
import type { CaseProgress, ConsultationListResponse, ConsultationStatus } from '~/features/customers/type';

const missingRecentConsultation = '없음';
const customerCaseStageLabel = '서류 준비';
const unassignedAssigneeLabel = '미정';

const statusBadgeVariants: Record<
  ConsultationStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  IN_CONSULTATION: 'default',
  CONSIDERING: 'secondary',
  ABSENT: 'outline',
  REJECTED: 'destructive',
  RETAINED: 'default',
};

type CustomerDetailTab = {
  value: string;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const customerDetailTabs: CustomerDetailTab[] = [
  {
    value: 'installments',
    label: '분납내역',
    title: '분납 내역 영역',
    description: '분납 일정과 납부 내용을 기록하는 영역입니다. 수임 전환 후 입력하실 수 있습니다.',
    icon: ReceiptTextIcon,
  },
  {
    value: customerConsultationTab,
    label: '상담이력',
    title: '상담 이력 영역',
    description:
      '상담 일자와 통화·방문 내용을 기록하는 영역입니다. 다음 단계에서 내용을 채워 넣습니다.',
    icon: MessagesSquareIcon,
  },
  {
    value: customerCaseProgressTab,
    label: '사건진행',
    title: '사건 진행 영역',
    description: '사건 단계와 진행 내용을 기록하는 영역입니다. 수임 전환 후 입력하실 수 있습니다.',
    icon: ListChecksIcon,
  },
  {
    value: 'ledger',
    label: '거래원장',
    title: '거래 원장 영역',
    description: '분납 입금 내역을 확인하는 영역입니다. 수임 전환 후 확인할 수 있습니다.',
    icon: BookOpenIcon,
  },
];

function CustomerDetailSkeleton(): JSX.Element {
  return (
    <div className="grid max-w-240 gap-6" aria-hidden="true">
      <Skeleton className="h-36 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function customerDetailErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return customerFormError(error.body) ?? '상담 고객을 불러오지 못했습니다.';
  }
  return '상담 고객을 불러오지 못했습니다.';
}

function CustomerDetailTabEmpty({
  title,
  description,
  icon,
}: Pick<CustomerDetailTab, 'title' | 'description' | 'icon'>): JSX.Element {
  const Icon = icon;
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-foreground">
        <Icon aria-hidden className="size-5" />
      </span>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function renderCustomerDetailTab(
  tab: CustomerDetailTab,
  customerId: string,
  status: ConsultationStatus,
  consultations: UseQueryResult<ConsultationListResponse>,
): JSX.Element {
  if (tab.value === 'consultations') {
    return (
      <CustomerConsultationList
        customerId={customerId}
        status={status}
        consultations={consultations}
      />
    );
  }
  if (tab.value === 'installments' && status === 'RETAINED') {
    return <CustomerInstallmentList customerId={customerId} />;
  }
  if (tab.value === 'ledger' && status === 'RETAINED') {
    return <CustomerLedgerList customerId={customerId} />;
  }
  if (tab.value === 'case-progress' && status === 'RETAINED') {
    return <CustomerCaseProgress customerId={customerId} />;
  }
  return (
    <CustomerDetailTabEmpty title={tab.title} description={tab.description} icon={tab.icon} />
  );
}

type CustomerDetailTabsProps = {
  customerId: string;
  status: ConsultationStatus;
  tab: string;
  consultations: UseQueryResult<ConsultationListResponse>;
};

function customerDetailTab(value: string | null): string {
  if (value !== null && customerDetailTabs.some((tab) => tab.value === value)) {
    return value;
  }
  return customerDetailTabs[0].value;
}

function CustomerDetailTabs({
  customerId,
  status,
  tab,
  consultations,
}: CustomerDetailTabsProps): JSX.Element {
  return (
    <Tabs key={tab} defaultValue={tab} className="gap-4">
      <TabsList variant="line">
        {customerDetailTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabsTrigger key={tab.value} value={tab.value}>
              <Icon aria-hidden />
              {tab.label}
            </TabsTrigger>
          );
        })}
      </TabsList>
      {customerDetailTabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          {renderCustomerDetailTab(tab, customerId, status, consultations)}
        </TabsContent>
      ))}
    </Tabs>
  );
}

function CustomerCaseStage({
  status,
  caseProgress,
}: {
  status: ConsultationStatus;
  caseProgress: UseQueryResult<CaseProgress>;
}): JSX.Element {
  if (status !== 'RETAINED') {
    return <p className={fieldValue}>{customerCaseStageLabel}</p>;
  }
  if (caseProgress.isError) {
    return <p className="text-sm text-destructive">사건 단계를 불러오지 못했습니다.</p>;
  }
  if (!caseProgress.isSuccess) {
    return <Skeleton className="h-5 w-16" aria-hidden="true" />;
  }
  return <p className={fieldValue}>{caseProgressStageLabels[caseProgress.data.stage]}</p>;
}

export function CustomerDetailPage(): JSX.Element {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const customerId = params.customerId ?? '';
  const detailTab = customerDetailTab(searchParams.get('tab'));
  const customer = useCustomerDetail(customerId);
  const caseProgress = useCustomerCaseProgress(customerId, customer.data?.status === 'RETAINED');
  const consultations = useCustomerConsultations(customerId, customer.isSuccess);

  if (customerId === '') {
    return (
      <p role="alert" className="text-sm text-destructive">
        상담 고객을 찾을 수 없습니다.
      </p>
    );
  }

  if (customer.isPending) {
    return <CustomerDetailSkeleton />;
  }

  if (customer.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {customerDetailErrorMessage(customer.error)}
      </p>
    );
  }

  const assigneeName = customer.data.assigneeName;
  const consultationItems = consultations.data?.consultations ?? [];
  const latestConsultation = consultationItems.length > 0 ? consultationItems[0] : undefined;
  const recentConsultation = latestConsultation
    ? formatConsultationCreatedAt(latestConsultation.createdAt)
    : missingRecentConsultation;

  return (
    <div className="grid max-w-240 gap-6">
      <section className="rounded-xl bg-card p-6 ring-1 ring-border">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="grid min-w-0 gap-1 lg:w-72 lg:shrink-0 lg:pr-8">
            <p className={fieldLabel}>고객 정보</p>
            <h2 className="text-2xl leading-9 font-semibold text-foreground">
              {customer.data.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              전화번호 {formatCustomerPhone(customer.data.phone)}
            </p>
            <p className="text-sm text-muted-foreground">최근 상담 {recentConsultation}</p>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-center lg:border-l lg:border-border lg:pl-8">
            <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border">
              <div className="grid content-center gap-2 sm:pr-6">
                <p className={fieldLabel}>담당자</p>
                {assigneeName ? (
                  <p className={fieldValue}>{assigneeName}</p>
                ) : (
                  <Badge variant="outline">{unassignedAssigneeLabel}</Badge>
                )}
              </div>
              <div className="grid content-center gap-2 sm:px-6">
                <p className={fieldLabel}>상담 상태</p>
                <Badge variant={statusBadgeVariants[customer.data.status]}>
                  {consultationStatusLabels[customer.data.status]}
                </Badge>
              </div>
              <div className="grid content-center gap-2 sm:px-6">
                <p className={fieldLabel}>사건 단계</p>
                <CustomerCaseStage status={customer.data.status} caseProgress={caseProgress} />
              </div>
            </div>
            {customer.data.status === 'RETAINED' ? null : (
              <div className="flex shrink-0 sm:border-l sm:border-border sm:pl-8">
                <RetainCustomerButton customerId={customer.data.id} />
              </div>
            )}
          </div>
        </div>
        {customer.data.status === 'RETAINED' ? (
          <CustomerBillingSummary customerId={customer.data.id} />
        ) : null}
      </section>
      <CustomerDetailTabs
        customerId={customer.data.id}
        status={customer.data.status}
        tab={detailTab}
        consultations={consultations}
      />
    </div>
  );
}
