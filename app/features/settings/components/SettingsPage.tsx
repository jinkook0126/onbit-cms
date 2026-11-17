import { ArrowRightIcon } from 'lucide-react';
import { Link } from 'react-router';

import { visibleSettingsNavSections } from '~/features/settings/nav';
import { focusRing, pageSurface } from '~/lib/styles';
import { cn } from '~/lib/utils';

import type { JSX } from 'react';
import type { ShellRole } from '~/features/shell/type';

type SettingsPageProps = {
  role: ShellRole;
};

export function SettingsPage({ role }: SettingsPageProps): JSX.Element {
  const sections = visibleSettingsNavSections(role);

  return (
    <div className="flex max-w-240 flex-col gap-8">
      {sections.map((section) => (
        <section key={section.id} className="flex flex-col gap-3" aria-labelledby={section.id}>
          <h2 id={section.id} className="text-sm font-medium text-foreground">
            {section.label}
          </h2>
          <ul className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {section.items.map((item) => {
              const Icon = item.icon;

              return (
                <li key={item.to} className="min-w-0">
                  <Link
                    to={item.to}
                    className={cn(
                      'flex h-full flex-col p-5 text-foreground transition-colors duration-150 hover:ring-input',
                      pageSurface,
                      focusRing,
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                    <span className="mt-3 text-base leading-snug font-semibold">{item.label}</span>
                    <span className="mt-1 text-sm text-muted-foreground">{item.description}</span>
                    <span className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                      <span>관리하기</span>
                      <ArrowRightIcon className="size-4" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
