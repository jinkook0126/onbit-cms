import { currentShellNavItem } from '~/features/shell/nav';

import type { UIMatch } from 'react-router';

export type ShellBreadcrumbMatch = Pick<UIMatch, 'pathname' | 'params' | 'loaderData'>;

export type ShellBreadcrumbHandle = {
  breadcrumb: (match: ShellBreadcrumbMatch) => string | undefined;
};

export type ShellBreadcrumbItem = {
  id: string;
  label: string;
  to: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isShellBreadcrumbHandle(value: unknown): value is ShellBreadcrumbHandle {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.breadcrumb === 'function';
}

function breadcrumbFromLoaderData(loaderData: unknown): string | undefined {
  if (!isRecord(loaderData) || typeof loaderData.breadcrumb !== 'string') {
    return undefined;
  }
  const label = loaderData.breadcrumb.trim();
  return label === '' ? undefined : label;
}

function normalizeBreadcrumbLabel(label: string | undefined): string | undefined {
  if (label === undefined) {
    return undefined;
  }
  const trimmed = label.trim();
  return trimmed === '' ? undefined : trimmed;
}

function breadcrumbLabel(match: UIMatch): string | undefined {
  const fromHandle = isShellBreadcrumbHandle(match.handle)
    ? normalizeBreadcrumbLabel(match.handle.breadcrumb(match))
    : undefined;
  return fromHandle ?? breadcrumbFromLoaderData(match.loaderData);
}

export const shellMenuBreadcrumb: ShellBreadcrumbHandle = {
  breadcrumb(match): string | undefined {
    return currentShellNavItem(match.pathname)?.label;
  },
};

export function shellBreadcrumbItems(matches: readonly UIMatch[]): ShellBreadcrumbItem[] {
  const items: ShellBreadcrumbItem[] = [];

  for (const match of matches) {
    const label = breadcrumbLabel(match);
    if (label === undefined) {
      continue;
    }
    items.push({ id: match.id, label, to: match.pathname });
  }

  return items;
}
