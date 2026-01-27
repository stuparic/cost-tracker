import { ref, type Ref } from 'vue';

// Check if browser supports Web Speech API
const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

if (!SpeechRecognitionAPI) {
  throw new Error('Speech Recognition API is not supported in this browser');
}

export class SpeechRecognition {
  public isRecording: Ref<boolean> = ref(false);
  public error: Ref<string | null> = ref(null);

  private recognition: any;
  private transcript: string = '';
  private resolveStop: ((text: string) => void) | null = null;

  constructor() {
    this.recognition = new SpeechRecognitionAPI();
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = 'sr-RS';

    this.recognition.onresult = this.handleResult.bind(this);
    this.recognition.onerror = this.handleError.bind(this);
    this.recognition.onend = this.handleEnd.bind(this);
  }

  private handleResult(event: any): void {
    this.transcript = '';
    for (let i = 0; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        this.transcript += event.results[i][0].transcript + ' ';
      }
    }
  }

  private handleError(event: any): void {
    console.error('Speech recognition error:', event.error);

    switch (event.error) {
      case 'no-speech':
        this.error.value = 'Nije detektovan govor';
        break;
      case 'audio-capture':
        this.error.value = 'Mikrofon nije dostupan';
        break;
      case 'not-allowed':
        this.error.value = 'Dozvola za mikrofon nije data';
        break;
      default:
        this.error.value = 'Greška pri prepoznavanju govora';
    }

    this.isRecording.value = false;
    if (this.resolveStop) {
      this.resolveStop('');
      this.resolveStop = null;
    }
  }

  private handleEnd(): void {
    this.isRecording.value = false;
    const result = this.transcript.trim();
    this.transcript = '';

    if (this.resolveStop) {
      this.resolveStop(result);
      this.resolveStop = null;
    }
  }

  public async start(): Promise<boolean> {
    try {
      // First, explicitly request microphone permission
      // This ensures the permission prompt appears on all devices/browsers
      await navigator.mediaDevices.getUserMedia({ audio: true });

      this.transcript = '';
      this.error.value = null;
      this.recognition.start();
      this.isRecording.value = true;
      return true;
    } catch (err: any) {
      console.error('Failed to start recording:', err);

      // Handle permission denied specifically
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.error.value = 'Dozvola za mikrofon nije data';
      } else if (err.name === 'NotFoundError') {
        this.error.value = 'Mikrofon nije pronađen';
      } else {
        this.error.value = 'Nije moguće pokrenuti snimanje';
      }

      this.isRecording.value = false;
      return false;
    }
  }

  public stop(): Promise<string> {
    return new Promise((resolve) => {
      this.resolveStop = resolve;
      try {
        this.recognition.stop();
      } catch (err) {
        console.error('Failed to stop recording:', err);
        this.isRecording.value = false;
        this.resolveStop = null;
        resolve('');
      }
    });
  }
}

// Factory function for use in components
export function useSpeechRecognition(): SpeechRecognition {
  return new SpeechRecognition();
}
