import { useRef, useState } from 'react';

import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { useCatalogList } from '~/features/catalog/hooks/useCatalogList';
import { useCustomerImportForm } from '~/features/customers/hooks/useCustomerImportForm';
import { formatCustomerPhone } from '~/features/customers/type';
import { sectionDescription } from '~/lib/styles';
import { cn } from '~/lib/utils';

import type { ChangeEvent, DragEvent, JSX } from 'react';

type OutsideEvent = {
  preventDefault: () => void;
};

export function CustomerImportDialog(): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const sources = useCatalogList('inflow-sources', true);
  let sourceNames = '불러오는 중';
  if (sources.isSuccess) {
    sourceNames = sources.data.items.map((source) => source.name).join(', ');
  } else if (sources.isError) {
    sourceNames = '불러오지 못했습니다';
  }
  const {
    open,
    file,
    formError,
    rowErrors,
    duplicates,
    registeredCount,
    isSubmitting,
    isDownloading,
    openDialog,
    closeDialog,
    selectFile,
    downloadTemplate,
    submitImport,
  } = useCustomerImportForm();

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      closeDialog();
    }
  }

  function preventOutsideDismiss(event: OutsideEvent): void {
    if (isSubmitting || isDownloading) {
      event.preventDefault();
    }
  }

  function chooseFile(): void {
    inputRef.current?.click();
  }

  function changeFile(event: ChangeEvent<HTMLInputElement>): void {
    const input = event.currentTarget;
    selectFile(input.files?.item(0) ?? null);
    input.value = '';
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    if (!isSubmitting) {
      setDragging(true);
    }
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setDragging(false);
    if (isSubmitting) {
      return;
    }
    selectFile(event.dataTransfer.files.item(0));
  }

  let fileLabel = '파일을 끌어다 놓거나 파일 찾기를 누르세요.';
  if (file) {
    fileLabel = file.name;
  }
  let duplicateSummary = '중복된 고객이라 등록하지 않았습니다.';
  if (registeredCount !== undefined && registeredCount > 0) {
    duplicateSummary = `${registeredCount}명을 등록했습니다. 중복된 고객은 제외했습니다.`;
  }

  return (
    <>
      <Button type="button" size="lg" variant="outline" onClick={openDialog}>
        엑셀 업로드
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!isSubmitting && !isDownloading}
          onInteractOutside={preventOutsideDismiss}
          onPointerDownOutside={preventOutsideDismiss}
        >
          <DialogHeader>
            <DialogTitle>엑셀 업로드</DialogTitle>
            <DialogDescription className={sectionDescription}>
              템플릿의 이름, 연락처, 유입경로를 저장합니다. 담당은 미정이고 상담 상태는
              상담중입니다. 같은 회사의 같은 이름과 연락처는 제외합니다. 유입경로는 {sourceNames}
              입니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isDownloading || isSubmitting}
              onClick={downloadTemplate}
            >
              {isDownloading ? '내려받는 중...' : '템플릿 다운로드'}
            </Button>
            <div
              className={cn(
                'grid justify-items-center gap-3 rounded-lg border border-dashed border-border px-4 py-8 text-center',
                dragging && 'border-primary bg-muted',
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <p className="text-sm text-muted-foreground">{fileLabel}</p>
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmitting}
                onClick={chooseFile}
              >
                파일 찾기
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                tabIndex={-1}
                onChange={changeFile}
              />
            </div>
            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}
            {rowErrors.length > 0 ? (
              <ul className="grid max-h-40 gap-1 overflow-y-auto text-sm text-destructive">
                {rowErrors.map((error) => (
                  <li key={error.row}>
                    {error.row}행: {error.message}
                  </li>
                ))}
              </ul>
            ) : null}
            {duplicates.length > 0 ? (
              <div className="grid gap-2">
                <p className="text-sm text-foreground">{duplicateSummary}</p>
                <ul className="grid max-h-40 gap-1 overflow-y-auto text-sm text-muted-foreground">
                  {duplicates.map((customer) => (
                    <li key={customer.row}>
                      {customer.row}행 {customer.name} · {formatCustomerPhone(customer.phone)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={closeDialog}>
              취소
            </Button>
            <Button type="button" disabled={file === null || isSubmitting} onClick={submitImport}>
              {isSubmitting ? '업로드 중...' : '업로드'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
