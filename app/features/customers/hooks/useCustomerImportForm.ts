import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  requestCustomerImport,
  requestCustomerImportTemplate,
} from '~/features/customers/api/customerApi';
import { customerQueryKeys } from '~/features/customers/api/customerQuery';
import { MAX_CUSTOMER_IMPORT_FILE_BYTES } from '~/features/customers/type';
import { readQueryError } from '~/lib/formError';

import type {
  CustomerImportDuplicate,
  CustomerImportResponse,
  CustomerImportRowError,
} from '~/features/customers/type';

type CustomerImportFormState = {
  open: boolean;
  file: File | null;
  formError?: string;
  rowErrors: CustomerImportRowError[];
  duplicates: CustomerImportDuplicate[];
  registeredCount?: number;
  isSubmitting: boolean;
  isDownloading: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  selectFile: (file: File | null) => void;
  downloadTemplate: () => void;
  submitImport: () => void;
};

const FILE_INVALID_MESSAGE = 'xlsx 파일을 선택하세요.';
const FILE_TOO_LARGE_MESSAGE = '파일은 2MB 이하여야 합니다.';
const transportErrorMessage = '상담 고객을 등록하지 못했습니다. 다시 시도하세요.';
const templateErrorMessage = '템플릿을 내려받지 못했습니다. 다시 시도하세요.';

function isExcelFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.xlsx');
}

export function useCustomerImportForm(): CustomerImportFormState {
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [clientError, setClientError] = useState<string | undefined>(undefined);
  const [isDownloading, setDownloading] = useState(false);
  const mutation = useMutation({
    mutationFn: (nextFile: File) => requestCustomerImport(nextFile),
    onSuccess: (response) => {
      if (
        response.createdCount === undefined ||
        response.formError !== undefined ||
        response.rowErrors !== undefined
      ) {
        return;
      }
      if (response.createdCount > 0) {
        void queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() });
      }
      if (response.duplicates !== undefined && response.duplicates.length > 0) {
        setFile(null);
        return;
      }
      setOpen(false);
      setFile(null);
      setClientError(undefined);
      toast(`${response.createdCount}명의 상담 고객을 등록했습니다.`);
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });
  const response: CustomerImportResponse | undefined = mutation.isError ? undefined : mutation.data;
  const completed =
    response?.createdCount !== undefined &&
    response.formError === undefined &&
    response.rowErrors === undefined
      ? response
      : undefined;
  const formError =
    clientError ??
    response?.formError ??
    (mutation.isError ? readQueryError(mutation.error, transportErrorMessage) : undefined);

  function resetSelection(): void {
    setFile(null);
    setClientError(undefined);
    mutation.reset();
  }

  function openDialog(): void {
    resetSelection();
    setOpen(true);
  }

  function closeDialog(): void {
    if (mutation.isPending || isDownloading) {
      return;
    }
    setOpen(false);
    resetSelection();
  }

  function selectFile(nextFile: File | null): void {
    mutation.reset();
    if (nextFile === null) {
      setFile(null);
      setClientError(undefined);
      return;
    }
    if (!isExcelFile(nextFile)) {
      setFile(null);
      setClientError(FILE_INVALID_MESSAGE);
      return;
    }
    if (nextFile.size > MAX_CUSTOMER_IMPORT_FILE_BYTES) {
      setFile(null);
      setClientError(FILE_TOO_LARGE_MESSAGE);
      return;
    }
    setFile(nextFile);
    setClientError(undefined);
  }

  function downloadTemplate(): void {
    if (isDownloading || mutation.isPending) {
      return;
    }
    setDownloading(true);
    mutation.reset();
    void requestCustomerImportTemplate()
      .then(() => {
        setClientError(undefined);
      })
      .catch((error: unknown) => {
        setClientError(readQueryError(error, templateErrorMessage));
      })
      .finally(() => {
        setDownloading(false);
      });
  }

  function submitImport(): void {
    if (file === null || submitLock.current || mutation.isPending) {
      return;
    }
    submitLock.current = true;
    setClientError(undefined);
    mutation.mutate(file);
  }

  return {
    open,
    file,
    formError,
    rowErrors: response?.rowErrors ?? [],
    duplicates: completed?.duplicates ?? [],
    registeredCount: completed?.createdCount,
    isSubmitting: mutation.isPending,
    isDownloading,
    openDialog,
    closeDialog,
    selectFile,
    downloadTemplate,
    submitImport,
  };
}
