import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import { useCompanyStatusForm } from '~/features/companies/hooks/useCompanyStatusForm';
import { fieldLabel, fieldValue } from '~/lib/styles';

import type { JSX } from 'react';
import type { CompanyDetail } from '~/features/companies/type';

type CompanyStatusFormProps = {
  company: CompanyDetail;
};

export function CompanyStatusForm({ company }: CompanyStatusFormProps): JSX.Element {
  const { isActive, formError, isSubmitting, changeStatus } = useCompanyStatusForm(
    company.id,
    company.isActive,
  );

  return (
    <div className="grid gap-2">
      <p id="company-status-label" className={fieldLabel}>
        상태
      </p>
      <div className="flex items-center gap-2">
        <Switch
          id="company-status"
          checked={isActive}
          disabled={isSubmitting}
          onCheckedChange={changeStatus}
          aria-describedby={
            formError ? 'company-status-help company-status-error' : 'company-status-help'
          }
          aria-invalid={formError ? true : undefined}
        />
        <Label htmlFor="company-status" className={fieldValue}>
          {isActive ? '활성' : '비활성'}
        </Label>
      </div>
      <p id="company-status-help" className="text-sm text-muted-foreground">
        비활성으로 바꾸면 이 회사 계정은 로그인할 수 없습니다.
      </p>
      {formError ? (
        <p id="company-status-error" role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}
    </div>
  );
}
