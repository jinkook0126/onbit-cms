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
import { MAX_LOGIN_ID_LENGTH } from '~/features/auth/type';
import { useCompanyMasterForm } from '~/features/companies/hooks/useCompanyMasterForm';
import { MAX_ACCOUNT_NAME_LENGTH } from '~/features/settings/type';
import { fieldLabel, fieldValue, sectionDescription } from '~/lib/styles';

import type { JSX, SubmitEvent } from 'react';
import type { CompanyDetail } from '~/features/companies/type';

type CompanyMasterSectionProps = {
  company: CompanyDetail;
};

function preventDialogDismiss(event: { preventDefault: () => void }): void {
  event.preventDefault();
}

export function CompanyMasterSection({ company }: CompanyMasterSectionProps): JSX.Element {
  const {
    open,
    loginId,
    name,
    issued,
    fieldErrors,
    formError,
    isSubmitting,
    openDialog,
    closeDialog,
    changeLoginId,
    changeName,
    submitMaster,
  } = useCompanyMasterForm(company.id);

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      closeDialog();
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    submitMaster();
  }

  return (
    <section
      className="grid gap-4 border-t border-border pt-8"
      aria-labelledby="company-master-heading"
    >
      <div className="grid gap-1">
        <h2 id="company-master-heading" className="text-base font-semibold text-foreground">
          담당 계정
        </h2>
        <p className={sectionDescription}>회사를 관리하는 마스터 계정입니다.</p>
      </div>
      {company.masters.length === 0 ? (
        <div>
          <Button type="button" size="lg" onClick={openDialog}>
            회사 마스터 계정 생성
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {company.masters.map((master) => (
            <div key={master.id} className="grid gap-4">
              <div className="grid gap-2">
                <p className={fieldLabel}>아이디</p>
                <p className={fieldValue}>{master.loginId}</p>
              </div>
              <div className="grid gap-2">
                <p className={fieldLabel}>이름</p>
                <p className={fieldValue}>{master.name}</p>
              </div>
              {master.mustChangePassword ? (
                <div className="grid gap-2">
                  <p className={fieldLabel}>초기 비밀번호</p>
                  <p className={fieldValue}>{master.loginId}</p>
                  <p className={sectionDescription}>첫 로그인에서 비밀번호를 변경해야 합니다.</p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={!isSubmitting}
          onFocusOutside={preventDialogDismiss}
          onInteractOutside={isSubmitting ? preventDialogDismiss : undefined}
          onPointerDownOutside={isSubmitting ? preventDialogDismiss : undefined}
        >
          {issued ? (
            <div className="grid gap-4" role="status">
              <DialogHeader>
                <DialogTitle>회사 마스터 계정을 만들었습니다</DialogTitle>
                <DialogDescription>
                  초기 비밀번호는 아이디와 같습니다. 첫 로그인에서 비밀번호를 변경해야 합니다.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                <Label htmlFor="company-master-issued-login-id" className={fieldLabel}>
                  아이디
                </Label>
                <Input
                  id="company-master-issued-login-id"
                  value={issued.loginId}
                  readOnly
                  className="font-medium"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="company-master-temporary-password" className={fieldLabel}>
                  초기 비밀번호
                </Label>
                <Input
                  id="company-master-temporary-password"
                  value={issued.temporaryPassword}
                  readOnly
                  autoComplete="off"
                  spellCheck={false}
                  className="font-medium"
                />
              </div>
              <DialogFooter>
                <Button type="button" onClick={closeDialog}>
                  확인
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form noValidate className="grid gap-4" onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>회사 마스터 계정 생성</DialogTitle>
                <DialogDescription>
                  계정 아이디와 이름을 입력하세요. 초기 비밀번호는 아이디와 같습니다.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                <Label htmlFor="company-master-login-id" className={fieldLabel}>
                  아이디
                </Label>
                <Input
                  id="company-master-login-id"
                  name="loginId"
                  value={loginId}
                  autoComplete="off"
                  className="font-medium"
                  maxLength={MAX_LOGIN_ID_LENGTH}
                  aria-required
                  disabled={isSubmitting}
                  onChange={changeLoginId}
                  aria-invalid={fieldErrors?.loginId ? true : undefined}
                  aria-describedby={
                    fieldErrors?.loginId ? 'company-master-login-id-error' : undefined
                  }
                />
                {fieldErrors?.loginId ? (
                  <p id="company-master-login-id-error" className="text-sm text-destructive">
                    {fieldErrors.loginId}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="company-master-name" className={fieldLabel}>
                  이름
                </Label>
                <Input
                  id="company-master-name"
                  name="name"
                  value={name}
                  autoComplete="name"
                  className="font-medium"
                  maxLength={MAX_ACCOUNT_NAME_LENGTH}
                  aria-required
                  disabled={isSubmitting}
                  onChange={changeName}
                  aria-invalid={fieldErrors?.name ? true : undefined}
                  aria-describedby={fieldErrors?.name ? 'company-master-name-error' : undefined}
                />
                {fieldErrors?.name ? (
                  <p id="company-master-name-error" className="text-sm text-destructive">
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDialog}
                  disabled={isSubmitting}
                >
                  취소
                </Button>
                <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
                  {isSubmitting ? '저장 중...' : '저장'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
