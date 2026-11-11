'use client';

import { cn } from 'cn';
import { Switch as SwitchPrimitive } from 'radix-ui';

import { focusRing, invalidState } from '~/lib/styles';

import type * as React from 'react';

function Switch({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: 'sm' | 'default';
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        'peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all duration-150 after:absolute after:-inset-x-3 after:-inset-y-2 data-[size=default]:h-[18.4px] data-[size=default]:w-[32px] data-[size=sm]:h-[14px] data-[size=sm]:w-[24px] data-[state=checked]:bg-primary data-[state=checked]:hover:bg-primary-hover data-[state=unchecked]:bg-input data-[state=unchecked]:hover:bg-muted-foreground dark:data-[state=unchecked]:bg-input/80 data-disabled:cursor-not-allowed data-disabled:opacity-50',
        focusRing,
        invalidState,
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-full bg-background ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0 dark:data-[state=checked]:bg-primary-foreground dark:data-[state=unchecked]:bg-foreground"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
