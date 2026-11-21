import {
  CalendarCheckIcon,
  ChartColumnIcon,
  SettingsIcon,
  UsersIcon,
  WalletIcon,
} from 'lucide-react';

import type { ShellRole } from '~/features/shell/type';

export const shellNavItems = [
  { to: '/', label: '오늘의업무', icon: CalendarCheckIcon },
  { to: '/customers', label: '상담고객', icon: UsersIcon },
  { to: '/receivables', label: '분납/미수', icon: WalletIcon },
  { to: '/settlements', label: '월별 정산', icon: ChartColumnIcon },
  { to: '/settings', label: '설정', icon: SettingsIcon },
] as const;

export type ShellNavItem = (typeof shellNavItems)[number];

export function visibleShellNavItems(role: ShellRole): readonly ShellNavItem[] {
  if (role === 'SUPER_ADMIN') {
    return shellNavItems.filter((item) => item.to === '/settings');
  }
  return shellNavItems;
}

export function shellHomePath(role: ShellRole): '/' | '/settings' {
  if (role === 'SUPER_ADMIN') {
    return '/settings';
  }
  return '/';
}

export function isShellNavActive(pathname: string, item: ShellNavItem): boolean {
  if (item.to === '/') {
    return pathname === '/';
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export function currentShellNavItem(pathname: string): ShellNavItem | undefined {
  return shellNavItems.find((item) => isShellNavActive(pathname, item));
}
