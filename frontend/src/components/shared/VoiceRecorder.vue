<template>
  <div class="voice-recorder">
    <Button
      :icon="buttonIcon"
      :class="['voice-button', recordingState]"
      :disabled="!isSupported"
      :title="buttonTitle"
      rounded
      text
      @click="toggleRecording"
    />

    <!-- Transcription Display -->
    <div v-if="transcript" class="transcript-display">
      <i class="pi pi-comment"></i>
      <span>{{ transcript }}</span>
    </div>

    <!-- Error Message -->
    <div v-if="errorMessage" class="error-display">
      <i class="pi pi-exclamation-triangle"></i>
      <span>{{ errorMessage }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import Button from 'primevue/button';

// Check browser support
const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

// Types for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

// Emit events
const emit = defineEmits<{
  transcript: [text: string];
  error: [error: string];
}>();

// State
type RecordingState = 'idle' | 'listening' | 'processing';
const recordingState = ref<RecordingState>('idle');
const transcript = ref('');
const errorMessage = ref('');
let recognition: any = null;

// Computed
const buttonIcon = computed(() => {
  switch (recordingState.value) {
    case 'listening':
      return 'pi pi-microphone';
    case 'processing':
      return 'pi pi-spinner pi-spin';
    default:
      return 'pi pi-microphone';
  }
});

const buttonTitle = computed(() => {
  if (!isSupported) return 'Vaš pretraživač ne podržava glasovni unos';
  switch (recordingState.value) {
    case 'listening':
      return 'Klikni da zaustaviš snimanje';
    case 'processing':
      return 'Obrađujem...';
    default:
      return 'Klikni da snimiš glasovni unos';
  }
});

// Initialize Speech Recognition
function initRecognition() {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  recognition = new SpeechRecognition();

  recognition.lang = 'sr-RS'; // Serbian language
  recognition.continuous = false; // Stop after single phrase
  recognition.interimResults = false; // Only final results
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    recordingState.value = 'listening';
    transcript.value = '';
    errorMessage.value = '';
  };

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    recordingState.value = 'processing';
    const result = event.results[0];
    if (result && result[0]) {
      transcript.value = result[0].transcript;
      emit('transcript', transcript.value);
    }
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    recordingState.value = 'idle';
    let errorMsg = 'Greška pri snimanju';

    switch (event.error) {
      case 'no-speech':
        errorMsg = 'Nije detektovan govor';
        break;
      case 'audio-capture':
        errorMsg = 'Mikrofon nije dostupan';
        break;
      case 'not-allowed':
        errorMsg = 'Dozvolite pristup mikrofonu';
        break;
      case 'network':
        errorMsg = 'Greška u mrežnoj vezi';
        break;
      default:
        errorMsg = event.message || 'Greška pri snimanju';
    }

    errorMessage.value = errorMsg;
    emit('error', errorMsg);

    // Clear error after 3 seconds
    setTimeout(() => {
      errorMessage.value = '';
    }, 3000);
  };

  recognition.onend = () => {
    if (recordingState.value === 'listening') {
      // Recording stopped without result
      recordingState.value = 'idle';
    } else if (recordingState.value === 'processing') {
      // Processing complete
      setTimeout(() => {
        recordingState.value = 'idle';
      }, 1000);
    } else {
      recordingState.value = 'idle';
    }
  };
}

// Toggle recording
function toggleRecording() {
  if (!isSupported) return;

  if (recordingState.value === 'idle') {
    startRecording();
  } else if (recordingState.value === 'listening') {
    stopRecording();
  }
}

function startRecording() {
  if (!recognition) {
    initRecognition();
  }

  try {
    recognition.start();
  } catch (error) {
    console.error('Failed to start recording:', error);
    errorMessage.value = 'Greška pri pokretanju snimanja';
  }
}

function stopRecording() {
  if (recognition) {
    recognition.stop();
  }
}

// Cleanup
onUnmounted(() => {
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
});
</script>

<style scoped>
.voice-recorder {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.voice-button {
  font-size: 1.5rem !important;
  width: 3rem !important;
  height: 3rem !important;
  transition: all 0.3s ease;
}

.voice-button.idle {
  color: #6b7280 !important;
}

.voice-button.idle:hover:not(:disabled) {
  color: var(--primary-color) !important;
  background: var(--primary-light) !important;
}

.voice-button.listening {
  color: #ef4444 !important;
  background: #fef2f2 !important;
  animation: pulse 1.5s ease-in-out infinite;
}

.voice-button.processing {
  color: var(--primary-color) !important;
  background: var(--primary-light) !important;
}

.voice-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

.transcript-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--primary-light);
  border-left: 3px solid var(--primary-color);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: var(--text-primary);
  animation: slideIn 0.3s ease-out;
}

.transcript-display i {
  color: var(--primary-color);
  font-size: 1rem;
}

.error-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #fef2f2;
  border-left: 3px solid #ef4444;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #991b1b;
  animation: slideIn 0.3s ease-out;
}

.error-display i {
  color: #ef4444;
  font-size: 1rem;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
