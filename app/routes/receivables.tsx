import { Outlet } from 'react-router';

import { shellMenuBreadcrumb } from '~/features/shell/breadcrumb';

import type { JSX } from 'react';

export const handle = shellMenuBreadcrumb;

export default function Receivables(): JSX.Element {
  return <Outlet />;
}
