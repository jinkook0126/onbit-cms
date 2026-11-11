import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

import { Badge } from '~/components/ui/badge';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Skeleton } from '~/components/ui/skeleton';
import { EmployeeCreateDialog } from '~/features/employees/components/EmployeeCreateDialog';
import { EmployeeTeamDialog } from '~/features/employees/components/EmployeeTeamDialog';
import { useEmployeeList } from '~/features/employees/hooks/useEmployeeList';
import { employeeFormError } from '~/features/employees/type';
import { ApiError } from '~/lib/apiClient';
import { cn } from '~/lib/utils';

import type { JSX, KeyboardEvent } from 'react';
import type { EmployeeListItem } from '~/features/employees/type';

function EmployeeListSkeleton(): JSX.Element {
  return (
    <div className="grid gap-3" aria-hidden="true">
      <Skeleton className="h-10 w-28" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function employeeListErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return employeeFormError(error.body) ?? '직원 목록을 불러오지 못했습니다.';
  }
  return '직원 목록을 불러오지 못했습니다.';
}

function EmployeeTeamBadge({ teamName }: { teamName: string | null }): JSX.Element {
  if (teamName) {
    return <span className="text-foreground">{teamName}</span>;
  }
  return <Badge variant="outline">미정</Badge>;
}

function EmployeeRow({
  employee,
  onSelect,
}: {
  employee: EmployeeListItem;
  onSelect: (employee: EmployeeListItem) => void;
}): JSX.Element {
  function openTeamDialog(): void {
    onSelect(employee);
  }

  function openTeamDialogFromKeyboard(event: KeyboardEvent<HTMLTableRowElement>): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    onSelect(employee);
  }

  return (
    <tr
      className="cursor-pointer border-b border-border last:border-b-0 hover:bg-muted"
      tabIndex={0}
      onClick={openTeamDialog}
      onKeyDown={openTeamDialogFromKeyboard}
    >
      <td className="px-4 py-3 text-foreground">{employee.loginId}</td>
      <td className="px-4 py-3 text-foreground">{employee.name}</td>
      <td className="px-4 py-3">
        <EmployeeTeamBadge teamName={employee.teamName} />
      </td>
    </tr>
  );
}

export function EmployeeListPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedCompanyId = searchParams.get('companyId') ?? '';
  const employees = useEmployeeList(requestedCompanyId);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeListItem | null>(null);
  const companies = employees.data?.companies ?? [];
  const onlyCompanyId = companies.length === 1 ? companies[0]?.id : undefined;

  useEffect(() => {
    if (requestedCompanyId !== '' || onlyCompanyId === undefined) {
      return;
    }
    setSearchParams({ companyId: onlyCompanyId }, { replace: true });
  }, [onlyCompanyId, requestedCompanyId, setSearchParams]);

  if (employees.isPending) {
    return <EmployeeListSkeleton />;
  }

  if (employees.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {employeeListErrorMessage(employees.error)}
      </p>
    );
  }

  const company = employees.data.company;
  let listBody: JSX.Element;
  if (company === null) {
    listBody = (
      <p className="text-sm text-muted-foreground">
        {companies.length === 0 ? '등록된 회사가 없습니다.' : '회사를 선택하세요.'}
      </p>
    );
  } else if (employees.data.employees.length === 0) {
    listBody = <p className="text-sm text-muted-foreground">등록된 직원이 없습니다.</p>;
  } else {
    listBody = (
      <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-border">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">직원 목록</caption>
          <thead className="border-b border-border">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium text-foreground">
                아이디
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-foreground">
                이름
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-foreground">
                팀
              </th>
            </tr>
          </thead>
          <tbody>
            {employees.data.employees.map((employee) => (
              <EmployeeRow key={employee.id} employee={employee} onSelect={setSelectedEmployee} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function changeCompany(companyId: string): void {
    setSelectedEmployee(null);
    setSearchParams({ companyId }, { replace: true });
  }

  return (
    <div className="grid max-w-240 gap-4">
      <div
        className={cn(
          'flex flex-wrap items-end gap-4',
          companies.length > 0 ? 'justify-between' : 'justify-end',
        )}
      >
        {companies.length > 0 ? (
          <div className="grid w-full max-w-80 gap-2">
            <Label htmlFor="employee-company">회사</Label>
            <Select value={company?.id} onValueChange={changeCompany}>
              <SelectTrigger id="employee-company" className="w-full">
                <SelectValue placeholder="회사를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {company ? <EmployeeCreateDialog companyId={company.id} /> : null}
      </div>
      {listBody}
      {company ? (
        <EmployeeTeamDialog
          key={selectedEmployee?.id ?? 'closed'}
          employee={selectedEmployee}
          companyId={company.id}
          onClose={() => {
            setSelectedEmployee(null);
          }}
        />
      ) : null}
    </div>
  );
}
