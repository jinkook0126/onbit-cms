import { currentSettingsNavItem } from '~/features/settings/nav';
import { TeamListPage } from '~/features/teams/components/TeamListPage';

import type { JSX } from 'react';
import type { Route } from './+types/settings-teams-index';

export function meta({ location }: Route.MetaArgs): Route.MetaDescriptors {
  const label = currentSettingsNavItem(location.pathname)?.label ?? '팀 관리';
  return [{ title: `${label} | 온빛 CMS` }];
}

export default function SettingsTeamsIndex(): JSX.Element {
  return <TeamListPage />;
}
