import { Fragment } from 'react';
import { Link, useMatches } from 'react-router';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb';
import { SidebarTrigger } from '~/components/ui/sidebar';
import { shellBreadcrumbItems } from '~/features/shell/breadcrumb';
import { shellNavItems } from '~/features/shell/nav';

import type { JSX } from 'react';
import type { ShellBreadcrumbItem } from '~/features/shell/breadcrumb';

const shellDateLabel = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
});

const shellDateValue = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

type ShellBreadcrumbProps = {
  items: readonly ShellBreadcrumbItem[];
};

function ShellBreadcrumb({ items }: ShellBreadcrumbProps): JSX.Element {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <Fragment key={item.id}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem>
                {isCurrent ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={item.to}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function AppHeader(): JSX.Element {
  const matches = useMatches();
  const today = new Date();
  const fromRoutes = shellBreadcrumbItems(matches);
  const items =
    fromRoutes.length > 0
      ? fromRoutes
      : [{ id: 'home', label: shellNavItems[0].label, to: shellNavItems[0].to }];
  const currentLabel = items[items.length - 1]?.label ?? shellNavItems[0].label;

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border px-6 xl:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <SidebarTrigger />
        <h1 className="sr-only">{currentLabel}</h1>
        <ShellBreadcrumb items={items} />
      </div>
      <time
        dateTime={shellDateValue.format(today)}
        className="shrink-0 text-sm text-muted-foreground"
        suppressHydrationWarning
      >
        {shellDateLabel.format(today)}
      </time>
    </header>
  );
}
