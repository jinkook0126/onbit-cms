import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { requestLogout } from '~/features/auth/api/logoutApi';

type LogoutState = {
  logout: () => void;
  isLoggingOut: boolean;
  logoutError: boolean;
};

export function useLogout(): LogoutState {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: requestLogout,
    retry: 0,
    onSuccess: () => {
      queryClient.clear();
      void navigate('/login');
    },
  });

  function logout(): void {
    if (mutation.isPending) {
      return;
    }
    mutation.mutate();
  }

  return {
    logout,
    isLoggingOut: mutation.isPending,
    logoutError: mutation.isError,
  };
}
