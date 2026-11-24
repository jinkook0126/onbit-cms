import { useState } from 'react';

import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { Skeleton } from '~/components/ui/skeleton';
import { Switch } from '~/components/ui/switch';
import { CatalogCreateDialog } from '~/features/catalog/components/CatalogCreateDialog';
import { CatalogNameDialog } from '~/features/catalog/components/CatalogNameDialog';
import { useCatalogDelete } from '~/features/catalog/hooks/useCatalogDelete';
import { useCatalogList } from '~/features/catalog/hooks/useCatalogList';
import { useCatalogStatusForm } from '~/features/catalog/hooks/useCatalogStatusForm';
import { catalogKindItemLabels, catalogKindLabels } from '~/features/catalog/type';
import { readQueryError } from '~/lib/formError';
import { fieldValue, pageAlert, pageSurface, tableHeaderSurface } from '~/lib/styles';

import type { JSX, KeyboardEvent, MouseEvent } from 'react';
import type { CatalogKind, CatalogOption } from '~/features/catalog/type';

type CatalogListPageProps = {
  kind: CatalogKind;
};

function CatalogListSkeleton(): JSX.Element {
  return (
    <div className={`${pageSurface} p-5`} aria-hidden="true">
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function stopRowAction(event: MouseEvent | KeyboardEvent): void {
  event.stopPropagation();
}

function CatalogRow({
  kind,
  item,
  onSelect,
}: {
  kind: CatalogKind;
  item: CatalogOption;
  onSelect: (item: CatalogOption) => void;
}): JSX.Element {
  const itemLabel = catalogKindItemLabels[kind];
  const status = useCatalogStatusForm(kind, item.id, item.isActive);
  const removal = useCatalogDelete(kind, item.id);

  function openEdit(): void {
    onSelect(item);
  }

  function openEditFromKeyboard(event: KeyboardEvent<HTMLTableRowElement>): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    onSelect(item);
  }

  return (
    <tr
      className="cursor-pointer border-b border-border last:border-b-0 hover:bg-muted"
      tabIndex={0}
      onClick={openEdit}
      onKeyDown={openEditFromKeyboard}
    >
      <td className="px-4 py-3 text-foreground">{item.name}</td>
      <td className="px-4 py-3" onClick={stopRowAction} onKeyDown={stopRowAction}>
        <div className="flex items-center gap-2">
          <Switch
            id={`catalog-status-${item.id}`}
            checked={status.isActive}
            aria-busy={status.isSubmitting}
            onCheckedChange={status.changeStatus}
          />
          <Label
            htmlFor={`catalog-status-${item.id}`}
            className={`${fieldValue} inline-block w-12`}
          >
            {status.isActive ? '활성' : '비활성'}
          </Label>
        </div>
      </td>
      <td className="px-4 py-3" onClick={stopRowAction} onKeyDown={stopRowAction}>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={removal.isDeleting}
          aria-busy={removal.isDeleting}
          aria-label={`${item.name} ${itemLabel} 삭제`}
          onClick={removal.deleteItem}
        >
          삭제
        </Button>
      </td>
    </tr>
  );
}

export function CatalogListPage({ kind }: CatalogListPageProps): JSX.Element {
  const list = useCatalogList(kind);
  const title = catalogKindLabels[kind];
  const itemLabel = catalogKindItemLabels[kind];
  const [selectedItem, setSelectedItem] = useState<CatalogOption | null>(null);

  function closeNameDialog(): void {
    setSelectedItem(null);
  }

  if (list.isPending) {
    return <CatalogListSkeleton />;
  }

  if (list.isError) {
    return (
      <p role="alert" className={pageAlert}>
        {readQueryError(list.error, `${title} 목록을 불러오지 못했습니다.`)}
      </p>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        <CatalogCreateDialog kind={kind} />
      </div>
      <section className={`${pageSurface} overflow-hidden`}>
        {list.data.items.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            등록된 {itemLabel}이(가) 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-140 text-sm">
              <thead className={tableHeaderSurface}>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-foreground">이름</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">상태</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">삭제</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((item) => (
                  <CatalogRow key={item.id} kind={kind} item={item} onSelect={setSelectedItem} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <CatalogNameDialog
        kind={kind}
        item={selectedItem}
        open={selectedItem !== null}
        onClose={closeNameDialog}
      />
    </div>
  );
}
