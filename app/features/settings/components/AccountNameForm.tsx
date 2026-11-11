import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { useAccountNameForm } from '~/features/settings/hooks/useAccountNameForm';
import { MAX_ACCOUNT_NAME_LENGTH } from '~/features/settings/type';
import { fieldLabel, fieldValue, sectionDescription } from '~/lib/styles';

import type { JSX, SubmitEvent } from 'react';
import type { AccountProfile } from '~/features/settings/type';

type AccountNameFormProps = {
  profile: AccountProfile;
};

export function AccountNameForm({ profile }: AccountNameFormProps): JSX.Element {
  const { name, fieldErrors, formError, isSubmitting, changeName, submitName } = useAccountNameForm(
    profile.name,
  );

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    submitName();
  }

  return (
    <section className="grid gap-4" aria-labelledby="account-name-heading">
      <div className="grid gap-1">
        <h2 id="account-name-heading" className="text-base font-semibold text-foreground">
          이름
        </h2>
        <p className={sectionDescription}>화면에 표시되는 이름입니다.</p>
      </div>
      <form noValidate className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <p className={fieldLabel}>아이디</p>
          <p className={fieldValue}>{profile.loginId}</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="account-name" className={fieldLabel}>
            이름
          </Label>
          <Input
            id="account-name"
            name="name"
            value={name}
            autoComplete="name"
            className="w-full max-w-60 font-medium"
            maxLength={MAX_ACCOUNT_NAME_LENGTH}
            aria-required
            disabled={isSubmitting}
            onChange={changeName}
            aria-invalid={fieldErrors?.name ? true : undefined}
            aria-describedby={
              fieldErrors?.name ? 'account-name-help account-name-error' : 'account-name-help'
            }
          />
          <p id="account-name-help" className={sectionDescription}>
            {MAX_ACCOUNT_NAME_LENGTH}자 이하로 입력하세요.
          </p>
          {fieldErrors?.name ? (
            <p id="account-name-error" className="text-sm text-destructive">
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
    </section>
  );
}
