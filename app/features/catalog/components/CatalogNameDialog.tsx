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
import { useCatalogNameForm } from '~/features/catalog/hooks/useCatalogNameForm';
import { catalogKindItemLabels, MAX_CATALOG_NAME_LENGTH } from '~/features/catalog/type';

import type { JSX, SubmitEvent } from 'react';
import type { CatalogKind, CatalogOption } from '~/features/catalog/type';

type CatalogNameDialogProps = {
  kind: CatalogKind;
  item: CatalogOption | null;
  open: boolean;
  onClose: () => void;
};

function preventDialogDismiss(event: { preventDefault: () => void }): void {
  event.preventDefault();
}

function CatalogNameDialogForm({
  kind,
  item,
  open,
  onClose,
}: {
  kind: CatalogKind;
  item: CatalogOption;
  open: boolean;
  onClose: () => void;
}): JSX.Element {
  const itemLabel = catalogKindItemLabels[kind];
  const { name, fieldErrors, formError, isSubmitting, changeName, submitName } = useCatalogNameForm(
    kind,
    item.id,
    item.name,
    { onSaved: onClose },
  );

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      if (isSubmitting) {
        return;
      }
      onClose();
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    submitName();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!isSubmitting}
        onInteractOutside={isSubmitting ? preventDialogDismiss : undefined}
        onPointerDownOutside={isSubmitting ? preventDialogDismiss : undefined}
      >
        <form noValidate className="grid gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{itemLabel} 수정</DialogTitle>
            <DialogDescription>{itemLabel} 이름을 수정하세요.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={`catalog-${kind}-edit-name`}>{itemLabel} 이름</Label>
            <Input
              id={`catalog-${kind}-edit-name`}
              name="name"
              value={name}
              autoComplete="off"
              maxLength={MAX_CATALOG_NAME_LENGTH}
              aria-required
              disabled={isSubmitting}
              onChange={changeName}
              aria-invalid={fieldErrors?.name ? true : undefined}
              aria-describedby={
                fieldErrors?.name ? `catalog-${kind}-edit-name-error` : undefined
              }
            />
            {fieldErrors?.name ? (
              <p id={`catalog-${kind}-edit-name-error`} className="text-sm text-destructive">
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
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CatalogNameDialog({
  kind,
  item,
  open,
  onClose,
}: CatalogNameDialogProps): JSX.Element | null {
  if (!item) {
    return null;
  }

  return (
    <CatalogNameDialogForm key={item.id} kind={kind} item={item} open={open} onClose={onClose} />
  );
}
