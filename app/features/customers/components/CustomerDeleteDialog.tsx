import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { useCustomerDelete } from '~/features/customers/hooks/useCustomerDelete';

import type { JSX } from 'react';

type CustomerDeleteTarget = {
  id: string;
  name: string;
};

type CustomerDeleteDialogProps = {
  customer: CustomerDeleteTarget | null;
  onClose: () => void;
  onDeleted: (customerId: string) => void;
};

export function CustomerDeleteDialog({
  customer,
  onClose,
  onDeleted,
}: CustomerDeleteDialogProps): JSX.Element {
  const deletion = useCustomerDelete((customerId) => {
    onDeleted(customerId);
    onClose();
  });

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen && !deletion.isPending) {
      onClose();
    }
  }

  function deleteCustomer(): void {
    if (!customer || deletion.isPending) {
      return;
    }
    deletion.mutate(customer.id);
  }

  return (
    <Dialog open={customer !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!deletion.isPending}>
        <DialogHeader>
          <DialogTitle>고객 삭제</DialogTitle>
          <DialogDescription>
            {customer ? `${customer.name} 고객을 삭제합니다.` : '고객을 삭제합니다.'} 상담 이력과 수임
            정보도 함께 삭제됩니다.
          </DialogDescription>
        </DialogHeader>
        {deletion.isError ? (
          <p className="text-sm text-destructive" role="alert">
            상담 고객을 삭제하지 못했습니다. 다시 시도하세요.
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={deletion.isPending}>
            취소
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={deleteCustomer}
            disabled={deletion.isPending || customer === null}
            aria-busy={deletion.isPending}
          >
            {deletion.isPending ? '삭제 중...' : '삭제'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
