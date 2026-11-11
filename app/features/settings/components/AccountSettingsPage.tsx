import { Skeleton } from '~/components/ui/skeleton';
import { AccountNameForm } from '~/features/settings/components/AccountNameForm';
import { AccountPasswordForm } from '~/features/settings/components/AccountPasswordForm';
import { useAccountProfile } from '~/features/settings/hooks/useAccountProfile';

import type { JSX } from 'react';

function AccountSettingsSkeleton(): JSX.Element {
  return (
    <div className="grid max-w-180 gap-4" aria-hidden="true">
      <Skeleton className="h-5 w-16" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-10 w-24" />
    </div>
  );
}

export function AccountSettingsPage(): JSX.Element {
  const profile = useAccountProfile();

  if (profile.isPending) {
    return <AccountSettingsSkeleton />;
  }

  if (profile.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        계정 정보를 불러오지 못했습니다.
      </p>
    );
  }

  return (
    <div className="grid max-w-180 gap-8">
      <AccountNameForm profile={profile.data} />
      <AccountPasswordForm />
    </div>
  );
}
