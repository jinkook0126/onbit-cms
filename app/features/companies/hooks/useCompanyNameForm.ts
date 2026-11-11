import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { requestCompanyNameUpdate } from '~/features/companies/api/companyApi';
import { replaceCompanyDetail, replaceListedCompany } from '~/features/companies/api/companyQuery';
import { MAX_COMPANY_NAME_LENGTH } from '~/features/companies/type';

import type { ChangeEvent } from 'react';
import type { CompanyNameFieldErrors } from '~/features/companies/type';

type CompanyNameFormState = {
  name: string;
  fieldErrors?: CompanyNameFieldErrors;
  formError?: string;
  isSubmitting: boolean;
  changeName: (event: ChangeEvent<HTMLInputElement>) => void;
  submitName: () => void;
};

const transportErrorMessage = '회사 이름을 변경하지 못했습니다. 다시 시도하세요.';

export function useCompanyNameForm(companyId: string, savedName: string): CompanyNameFormState {
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [draft, setDraft] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (name: string) => requestCompanyNameUpdate(companyId, { name }),
    onSuccess: (response) => {
      if (response.name === undefined || response.fieldErrors || response.formError) {
        return;
      }
      const saved = response.name;
      replaceCompanyDetail(queryClient, companyId, { name: saved });
      replaceListedCompany(queryClient, companyId, { name: saved });
      setDraft(null);
      toast('회사 이름을 변경했습니다.');
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });
  const response = mutation.isError ? undefined : mutation.data;

  function changeName(event: ChangeEvent<HTMLInputElement>): void {
    setDraft(event.currentTarget.value.slice(0, MAX_COMPANY_NAME_LENGTH));
  }

  function submitName(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    submitLock.current = true;
    mutation.mutate(draft ?? savedName);
  }

  function resolveFormError(): string | undefined {
    if (mutation.isError) {
      return transportErrorMessage;
    }
    return response?.formError;
  }

  return {
    name: draft ?? savedName,
    fieldErrors: response?.fieldErrors,
    formError: resolveFormError(),
    isSubmitting: mutation.isPending,
    changeName,
    submitName,
  };
}
