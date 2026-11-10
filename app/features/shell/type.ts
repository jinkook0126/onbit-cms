const shellRoles = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EMPLOYEE'] as const;

type ShellRole = (typeof shellRoles)[number];

export type ShellAccount = {
  loginId: string;
  companyName: string | null;
};

export function isShellRole(value: string): value is ShellRole {
  return shellRoles.some((role) => role === value);
}
