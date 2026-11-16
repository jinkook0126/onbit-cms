import { shellMenuBreadcrumb } from '~/features/shell/breadcrumb';
import { currentShellNavItem } from '~/features/shell/nav';
import { TodayWorkPage } from '~/features/today/components/TodayWorkPage';

import type { JSX } from 'react';
import type { Route } from './+types/today';

export const handle = shellMenuBreadcrumb;

export function meta({ location }: Route.MetaArgs): Route.MetaDescriptors {
  const label = currentShellNavItem(location.pathname)?.label ?? '오늘의업무';
  return [{ title: `${label} | 온빛 CMS` }];
}

export default function Today(): JSX.Element {
  return <TodayWorkPage />;
}
