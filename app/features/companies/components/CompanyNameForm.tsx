import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { CompanyStatusForm } from '~/features/companies/components/CompanyStatusForm';
import { useCompanyNameForm } from '~/features/companies/hooks/useCompanyNameForm';
import { MAX_COMPANY_NAME_LENGTH } from '~/features/companies/type';
import { fieldLabel, fieldValue, sectionDescription } from '~/lib/styles';

import type { JSX, SubmitEvent } from 'react';
import type { CompanyDetail } from '~/features/companies/type';

type CompanyNameFormProps = {
  company: CompanyDetail;
};

export function CompanyNameForm({ company }: CompanyNameFormProps): JSX.Element {
  const { name, fieldErrors, formError, isSubmitting, changeName, submitName } = useCompanyNameForm(
    company.id,
    company.name,
  );

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    submitName();
  }

  return (
    <section className="grid gap-4" aria-labelledby="company-name-heading">
      <div className="grid gap-1">
        <h2 id="company-name-heading" className="text-base font-semibold text-foreground">
          회사
        </h2>
        <p className={sectionDescription}>회사 이름을 바꿀 수 있습니다.</p>
      </div>
      <form noValidate className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <p className={fieldLabel}>아이디</p>
          <p className={fieldValue}>{company.loginId}</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="company-detail-name" className={fieldLabel}>
            회사 이름
          </Label>
          <Input
            id="company-detail-name"
            name="name"
            value={name}
            autoComplete="organization"
            className="w-full max-w-60 font-medium"
            maxLength={MAX_COMPANY_NAME_LENGTH}
            aria-required
            disabled={isSubmitting}
            onChange={changeName}
            aria-invalid={fieldErrors?.name ? true : undefined}
            aria-describedby={
              fieldErrors?.name
                ? 'company-detail-name-help company-detail-name-error'
                : 'company-detail-name-help'
            }
          />
          <p id="company-detail-name-help" className="text-sm text-muted-foreground">
            {MAX_COMPANY_NAME_LENGTH}자 이하로 입력하세요.
          </p>
          {fieldErrors?.name ? (
            <p id="company-detail-name-error" className="text-sm text-destructive">
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
      <CompanyStatusForm company={company} />
    </section>
  );
}
