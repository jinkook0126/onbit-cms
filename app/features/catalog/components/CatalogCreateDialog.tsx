import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { useCatalogCreateForm } from '~/features/catalog/hooks/useCatalogCreateForm';
import { catalogKindItemLabels, MAX_CATALOG_NAME_LENGTH } from '~/features/catalog/type';

import type { JSX, SubmitEvent } from 'react';
import type { CatalogKind } from '~/features/catalog/type';

type CatalogCreateDialogProps = {
  kind: CatalogKind;
};

function preventDialogDismiss(event: { preventDefault: () => void }): void {
  event.preventDefault();
}

export function CatalogCreateDialog({ kind }: CatalogCreateDialogProps): JSX.Element {
  const itemLabel = catalogKindItemLabels[kind];
  const {
    open,
    name,
    fieldErrors,
    formError,
    isSubmitting,
    openDialog,
    closeDialog,
    changeName,
    submitItem,
  } = useCatalogCreateForm(kind);

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      closeDialog();
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    submitItem();
  }

  return (
    <>
      <Button type="button" size="lg" onClick={openDialog}>
        {itemLabel} 등록
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={!isSubmitting}
          onInteractOutside={isSubmitting ? preventDialogDismiss : undefined}
          onPointerDownOutside={isSubmitting ? preventDialogDismiss : undefined}
        >
          <form noValidate className="grid gap-4" onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{itemLabel} 등록</DialogTitle>
              <DialogDescription>{itemLabel} 이름을 입력하세요.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor={`catalog-${kind}-name`}>{itemLabel} 이름</Label>
              <Input
                id={`catalog-${kind}-name`}
                name="name"
                value={name}
                autoComplete="off"
                maxLength={MAX_CATALOG_NAME_LENGTH}
                aria-required
                disabled={isSubmitting}
                onChange={changeName}
                aria-invalid={fieldErrors?.name ? true : undefined}
                aria-describedby={fieldErrors?.name ? `catalog-${kind}-name-error` : undefined}
              />
              {fieldErrors?.name ? (
                <p id={`catalog-${kind}-name-error`} className="text-sm text-destructive">
                  {fieldErrors.name}
                </p>
              ) : null}
            </div>
            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={closeDialog}>
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
                {isSubmitting ? '등록 중...' : '등록'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
