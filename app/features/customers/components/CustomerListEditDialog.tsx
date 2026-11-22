import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { CustomerProfileDialog } from '~/features/customers/components/CustomerProfileDialog';
import { useCustomerDetail } from '~/features/customers/hooks/useCustomerDetail';
import { readQueryError } from '~/lib/formError';

import type { JSX } from 'react';

type CustomerListEditDialogProps = {
  customerId: string;
  onClose: () => void;
};

export function CustomerListEditDialog({
  customerId,
  onClose,
}: CustomerListEditDialogProps): JSX.Element | null {
  const customer = useCustomerDetail(customerId);
  if (customerId === '') {
    return null;
  }
  if (customer.isSuccess) {
    return (
      <CustomerProfileDialog
        mode="edit"
        open
        customer={customer.data}
        onClose={onClose}
      />
    );
  }

  return (
    <Dialog
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>고객 수정</DialogTitle>
          <DialogDescription className="sr-only">고객 정보를 불러옵니다.</DialogDescription>
        </DialogHeader>
        {customer.isError ? (
          <p className="text-sm text-destructive" role="alert">
            {readQueryError(customer.error, '상담 고객을 불러오지 못했습니다.')}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">고객 정보를 불러오는 중입니다.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
