import { ref } from 'vue';
import apiClient from '@/api/client';
import { useUserStore } from '@/stores/user.ts';

interface VoiceParseResponse {
  success: boolean;
  type?: string;
  errorMessage?: string;
}

export function useVoiceInput() {
  const userStore = useUserStore();
  const user = userStore.selectedUser;
  const error = ref<string | null>(null);

  async function sendTranscript(text: string) {
    try {
      let payload = { text: text, createdBy: user };
      const response = await apiClient.post<VoiceParseResponse>('/voice/parse', payload);
      console.log('Voice parsiÍng result:', response.data);
      return { success: true, errorMessage: null, type: response.data.type };
    } catch (err: any) {
      console.error('Failed to parse voice input:', err);
      error.value = err.response?.data?.message || 'Greška pri analizi glasovnog unosa';
      return { success: false, errorMessage: error.value, type: null };
    }
  }

  return {
    error,
    sendTranscript
  };
}
