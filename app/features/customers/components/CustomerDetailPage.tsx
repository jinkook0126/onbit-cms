import { BookOpenIcon, ListChecksIcon, MessagesSquareIcon, ReceiptTextIcon } from 'lucide-react';
import { useParams } from 'react-router';

import { Badge } from '~/components/ui/badge';
import { Skeleton } from '~/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import {
  CustomerConsultationList,
  formatConsultationCreatedAt,
} from '~/features/customers/components/CustomerConsultationList';
import { useCustomerConsultations } from '~/features/customers/hooks/useCustomerConsultations';
import { useCustomerDetail } from '~/features/customers/hooks/useCustomerDetail';
import {
  consultationStatusLabels,
  customerFormError,
  formatCustomerPhone,
} from '~/features/customers/type';
import { ApiError } from '~/lib/apiClient';
import { fieldLabel, fieldValue } from '~/lib/styles';

import type { UseQueryResult } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import type { JSX } from 'react';
import type { ConsultationListResponse } from '~/features/customers/type';

const missingRecentConsultation = '없음';
const customerCaseStageLabel = '서류 준비';

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
    value: 'consultations',
    label: '상담이력',
    title: '상담 이력 영역',
    description:
      '상담 일자와 통화·방문 내용을 기록하는 영역입니다. 다음 단계에서 내용을 채워 넣습니다.',
    icon: MessagesSquareIcon,
  },
  {
    value: 'case-progress',
    label: '사건진행',
    title: '사건 진행 영역',
    description: '사건 단계와 진행 내용을 기록하는 영역입니다. 수임 전환 후 입력하실 수 있습니다.',
    icon: ListChecksIcon,
  },
  {
    value: 'ledger',
    label: '거래원장',
    title: '거래 원장 영역',
    description: '거래 금액과 입출 내용을 기록하는 영역입니다. 다음 단계에서 내용을 채워 넣습니다.',
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

type CustomerDetailTabsProps = {
  customerId: string;
  consultations: UseQueryResult<ConsultationListResponse>;
};

function CustomerDetailTabs({ customerId, consultations }: CustomerDetailTabsProps): JSX.Element {
  return (
    <Tabs defaultValue={customerDetailTabs[0].value} className="gap-4">
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
          {tab.value === 'consultations' ? (
            <CustomerConsultationList customerId={customerId} consultations={consultations} />
          ) : (
            <CustomerDetailTabEmpty
              title={tab.title}
              description={tab.description}
              icon={tab.icon}
            />
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}

export function CustomerDetailPage(): JSX.Element {
  const params = useParams();
  const customerId = params.customerId ?? '';
  const customer = useCustomerDetail(customerId);
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
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-0">
          <div className="grid min-w-0 content-start gap-2 lg:w-72 lg:shrink-0 lg:pr-6">
            <p className={fieldLabel}>고객 정보</p>
            <h2 className="text-2xl leading-9 font-semibold text-foreground">{customer.data.name}</h2>
            <p className="flex flex-wrap items-center gap-2">
              <span className={fieldLabel}>전화번호</span>
              <span className={fieldValue}>{formatCustomerPhone(customer.data.phone)}</span>
            </p>
            <p className="flex flex-wrap items-center gap-2">
              <span className={fieldLabel}>최근 상담</span>
                <span className={fieldValue}>{recentConsultation}</span>
            </p>
          </div>
          <div className="grid min-w-0 flex-1 gap-6 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border lg:border-l lg:border-border">
            <div className="grid content-start gap-2 sm:px-6">
              <p className={fieldLabel}>담당자</p>
              {assigneeName ? (
                <p className={fieldValue}>{assigneeName}</p>
              ) : (
                <Badge variant="outline" className="w-fit">
                  미정
                </Badge>
              )}
            </div>
            <div className="grid content-start gap-2 sm:px-6">
              <p className={fieldLabel}>상담 상태</p>
              <p className={fieldValue}>{consultationStatusLabels[customer.data.status]}</p>
            </div>
            <div className="grid content-start gap-2 sm:px-6">
              <p className={fieldLabel}>사건 단계</p>
              <p className={fieldValue}>{customerCaseStageLabel}</p>
            </div>
          </div>
        </div>
      </section>
      <CustomerDetailTabs customerId={customer.data.id} consultations={consultations} />
    </div>
  );
}
