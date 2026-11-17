import { redirect } from 'react-router';

import { authenticatedUserContext } from '~/features/auth/api/auth.server';
import { SettingsPage } from '~/features/settings/components/SettingsPage';
import { isShellRole } from '~/features/shell/type';

import type { JSX } from 'react';
import type { ShellRole } from '~/features/shell/type';
import type { Route } from './+types/settings-index';

export function meta(): Route.MetaDescriptors {
  return [{ title: '설정 | 온빛 CMS' }];
}

export function loader({ context }: Route.LoaderArgs): { role: ShellRole } {
  const user = context.get(authenticatedUserContext);
  if (!user || !isShellRole(user.role)) {
    throw redirect('/login');
  }
  return { role: user.role };
}

export default function SettingsIndex({ loaderData }: Route.ComponentProps): JSX.Element {
  return <SettingsPage role={loaderData.role} />;
}
