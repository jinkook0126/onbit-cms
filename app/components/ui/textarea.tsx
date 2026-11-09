import { cn } from 'cn';

import { fieldBase } from '~/lib/styles';

import type * as React from 'react';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(fieldBase, 'flex field-sizing-content min-h-20 px-3 py-2', className)}
      {...props}
    />
  );
}

export { Textarea };
