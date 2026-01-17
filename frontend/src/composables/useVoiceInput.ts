import { ref } from 'vue';
import apiClient from '@/api/client';

interface VoiceParseRequest {
  text: string;
}

interface VoiceParseResponse {
  success: boolean;
  type?: 'expense' | 'income';
  data?: {
    amount: number;
    currency: 'EUR' | 'RSD';
    shopOrSource: string;
    description?: string;
    category?: string;
    incomeType?: string;
    date?: string;
  };
  confidence?: 'high' | 'medium' | 'low';
  originalTranscript?: string;
  message?: string;
}

export function useVoiceInput() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function sendTranscript(text: string): Promise<VoiceParseResponse> {
    loading.value = true;
    error.value = null;

    try {
      const payload: VoiceParseRequest = {
        text,
      };

      const response = await apiClient.post<VoiceParseResponse>(
        '/voice/parse',
        payload,
        { timeout: 60000 } // 60 seconds for AI processing
      );

      console.log('Voice parsing result:', response.data);
      return response.data;
    } catch (err: any) {
      console.error('Failed to parse voice input:', err);
      error.value =
        err.response?.data?.message || 'Greška pri analizi glasovnog unosa';
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
