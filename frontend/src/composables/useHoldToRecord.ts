import { ref } from 'vue';

// Check if browser supports Web Speech API
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

if (!SpeechRecognition) {
  throw new Error('Speech Recognition API is not supported in this browser');
}

export function useHoldToRecord() {
  const isRecording = ref(false);
  const error = ref<string | null>(null);

  let recognition: any = null;
  let finalTranscript = '';

  // Initialize recognition
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'sr-RS';

  recognition.onresult = (event: any) => {
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }
  };

  recognition.onerror = (event: any) => {
    console.error('Speech recognition error:', event.error);

    if (event.error === 'no-speech') {
      error.value = 'Nije detektovan govor';
    } else if (event.error === 'audio-capture') {
      error.value = 'Mikrofon nije dostupan';
    } else if (event.error === 'not-allowed') {
      error.value = 'Dozvola za mikrofon nije data';
    } else {
      error.value = 'Greška pri prepoznavanju govora';
    }

    isRecording.value = false;
  };

  recognition.onend = () => {
    isRecording.value = false;
  };

  function startRecording(): boolean {
    try {
      finalTranscript = '';
      recognition.start();
      isRecording.value = true;
      error.value = null;
      return true;
    } catch (err: any) {
      console.error('Failed to start recording:', err);
      error.value = 'Nije moguće pokrenuti snimanje';
      isRecording.value = false;
      return false;
    }
  }

  function stopRecording(): string {
    try {
      recognition.stop();
      isRecording.value = false;

      // Return the final transcript
      const result = finalTranscript.trim();
      finalTranscript = '';
      return result;
    } catch (err) {
      console.error('Failed to stop recording:', err);
      isRecording.value = false;
      return '';
    }
  }

  function cancelRecording(): void {
    try {
      recognition.stop();
      isRecording.value = false;
      finalTranscript = '';
    } catch (err) {
      console.error('Failed to cancel recording:', err);
    }
  }

  function cleanup(): void {
    try {
      recognition.stop();
    } catch (err) {
      // Ignore errors during cleanup
    }
    isRecording.value = false;
    finalTranscript = '';
  }

  return {
    isRecording,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    cleanup
  };
}
