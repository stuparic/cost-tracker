import { useToast } from 'primevue/usetoast';
import { TOAST_DURATION } from '@/constants/app';

export function useAppToast() {
  const toast = useToast();

  const showSuccess = (detail: string, summary = 'Uspešno!') => {
    toast.add({
      severity: 'success',
      summary,
      detail,
      life: TOAST_DURATION.SUCCESS
    });
  };

  const showError = (detail: string, error?: any) => {
    const message = error?.response?.data?.message || detail;
    toast.add({
      severity: 'error',
      summary: 'Greška',
      detail: message,
      life: TOAST_DURATION.ERROR
    });
  };

  const showInfo = (detail: string, summary = 'Info') => {
    toast.add({
      severity: 'info',
      summary,
      detail,
      life: TOAST_DURATION.SUCCESS
    });
  };

  return { showSuccess, showError, showInfo };
}
