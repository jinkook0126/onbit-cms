import { TeamDetailPage } from '~/features/teams/components/TeamDetailPage';

import type { JSX } from 'react';
import type { ShellBreadcrumbHandle } from '~/features/shell/breadcrumb';
import type { Route } from './+types/settings-team';

export const handle: ShellBreadcrumbHandle = {
  breadcrumb(): string {
    return '팀 상세';
  },
};

export function meta(): Route.MetaDescriptors {
  return [{ title: '팀 상세 | 온빛 CMS' }];
}

export default function SettingsTeam(): JSX.Element {
  return <TeamDetailPage />;
}
