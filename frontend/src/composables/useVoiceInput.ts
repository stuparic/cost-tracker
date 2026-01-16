import { ref } from 'vue';
import apiClient from '@/api/client';

interface VoiceParseRequest {
  text: string;
}

interface VoiceParseResponse {
  receivedText: string;
  timestamp: string;
  message: string;
}

export function useVoiceInput() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function sendTranscript(text: string): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const payload: VoiceParseRequest = {
        text,
      };

      const response = await apiClient.post<VoiceParseResponse>('/voice/parse', payload);

      console.log('Voice input sent successfully:', response.data);
    } catch (err: any) {
      console.error('Failed to send voice input:', err);
      error.value = err.response?.data?.message || 'Greška pri slanju glasovnog unosa';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    error,
    sendTranscript,
  };
}
