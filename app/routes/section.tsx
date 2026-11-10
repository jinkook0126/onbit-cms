import { Outlet } from 'react-router';

import { shellMenuBreadcrumb } from '~/features/shell/breadcrumb';
import { currentShellNavItem } from '~/features/shell/nav';

import type { JSX } from 'react';
import type { Route } from './+types/section';

export const handle = shellMenuBreadcrumb;

export function meta({ location }: Route.MetaArgs): Route.MetaDescriptors {
  const label = currentShellNavItem(location.pathname)?.label ?? '온빛 CMS';
  return [{ title: `${label} | 온빛 CMS` }];
}

export default function Section(): JSX.Element {
  return <Outlet />;
}
