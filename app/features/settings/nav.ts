import { Building2Icon, ContactIcon, UserRoundIcon, UsersIcon } from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

export type SettingsNavItem = {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export type SettingsNavSection = {
  id: string;
  label: string;
  items: readonly SettingsNavItem[];
};

export const settingsNavSections: readonly SettingsNavSection[] = [
  {
    id: 'organization',
    label: '조직 관리',
    items: [
      {
        to: '/settings/companies',
        label: '회사 관리',
        description: '회사 정보 및 조직 관리',
        icon: Building2Icon,
      },
      {
        to: '/settings/teams',
        label: '팀 관리',
        description: '팀 구성 및 소속 관리',
        icon: UsersIcon,
      },
      {
        to: '/settings/employees',
        label: '직원 관리',
        description: '직원 등록 및 계정 관리',
        icon: ContactIcon,
      },
    ],
  },
  {
    id: 'account',
    label: '계정 및 권한',
    items: [
      {
        to: '/settings/account',
        label: '계정 설정',
        description: '개인정보 및 비밀번호 관리',
        icon: UserRoundIcon,
      },
    ],
  },
];

export const settingsNavItems: readonly SettingsNavItem[] = settingsNavSections.flatMap(
  (section) => section.items,
);

export function currentSettingsNavItem(pathname: string): SettingsNavItem | undefined {
  return settingsNavItems.find(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
  );
}
