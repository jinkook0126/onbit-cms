import { ArrowRightIcon } from 'lucide-react';
import { Link } from 'react-router';

import { settingsNavSections } from '~/features/settings/nav';
import { focusRing } from '~/lib/styles';
import { cn } from '~/lib/utils';

import type { JSX } from 'react';

export function SettingsPage(): JSX.Element {
  return (
    <div className="flex max-w-240 flex-col gap-8">
      {settingsNavSections.map((section) => (
        <section key={section.id} className="flex flex-col gap-3" aria-labelledby={section.id}>
          <h2 id={section.id} className="text-sm font-medium text-foreground">
            {section.label}
          </h2>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {section.items.map((item) => {
              const Icon = item.icon;

              return (
                <li key={item.to} className="min-w-0">
                  <Link
                    to={item.to}
                    className={cn(
                      'flex h-full flex-col rounded-xl bg-card p-4 text-foreground ring-1 ring-border transition-colors duration-150 hover:ring-input',
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
