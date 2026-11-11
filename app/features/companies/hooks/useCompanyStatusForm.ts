import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { requestCompanyStatusUpdate } from '~/features/companies/api/companyApi';
import { replaceCompanyDetail, replaceListedCompany } from '~/features/companies/api/companyQuery';

type CompanyStatusFormState = {
  isActive: boolean;
  formError?: string;
  isSubmitting: boolean;
  changeStatus: (checked: boolean) => void;
};

const transportErrorMessage = '회사 상태를 변경하지 못했습니다. 다시 시도하세요.';

export function useCompanyStatusForm(
  companyId: string,
  savedIsActive: boolean,
): CompanyStatusFormState {
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [draft, setDraft] = useState<boolean | null>(null);
  const mutation = useMutation({
    mutationFn: (isActive: boolean) => requestCompanyStatusUpdate(companyId, { isActive }),
    onSuccess: (response) => {
      if (response.isActive === undefined || response.formError) {
        setDraft(null);
        return;
      }
      const saved = response.isActive;
      replaceCompanyDetail(queryClient, companyId, { isActive: saved });
      replaceListedCompany(queryClient, companyId, { isActive: saved });
      setDraft(null);
      toast(saved ? '회사를 활성화했습니다.' : '회사를 비활성화했습니다.');
    },
    onError: () => {
      setDraft(null);
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });
  const response = mutation.isError ? undefined : mutation.data;

  function changeStatus(checked: boolean): void {
    if (submitLock.current || mutation.isPending || checked === (draft ?? savedIsActive)) {
      return;
    }
    submitLock.current = true;
    setDraft(checked);
    mutation.mutate(checked);
  }

  return {
    isActive: draft ?? savedIsActive,
    formError: mutation.isError ? transportErrorMessage : response?.formError,
    isSubmitting: mutation.isPending,
    changeStatus,
  };
}
