<template>
  <div class="voice-recorder">
    <button :class="['voice-button', recordingState]" :disabled="!isSupported" :title="buttonTitle" @click="toggleRecording">
      <i :class="buttonIcon"></i>
    </button>

    <!-- Error Message -->
    <div v-if="errorMessage" class="error-display">
      <i class="pi pi-exclamation-triangle"></i>
      <span>{{ errorMessage }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';

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
let silenceTimeout: ReturnType<typeof setTimeout> | null = null;
const SILENCE_DURATION = 3000; // 3 seconds of silence

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
      return 'Snimanje... (zaustaviće se nakon 3s tišine)';
    case 'processing':
      return 'Obrađujem...';
    default:
      return 'Klikni da snimiš glasovni unos';
  }
});

// Clear silence timeout
function clearSilenceTimeout() {
  if (silenceTimeout) {
    clearTimeout(silenceTimeout);
    silenceTimeout = null;
  }
}

// Start silence timeout - stop after 3 seconds of no speech
function startSilenceTimeout() {
  clearSilenceTimeout();
  silenceTimeout = setTimeout(() => {
    if (recordingState.value === 'listening') {
      stopRecording();
    }
  }, SILENCE_DURATION);
}

// Initialize Speech Recognition
function initRecognition() {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  recognition = new SpeechRecognition();

  recognition.lang = 'sr-RS'; // Serbian language
  recognition.continuous = true; // Keep listening
  recognition.interimResults = true; // Get interim results to detect speech
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    recordingState.value = 'listening';
    transcript.value = '';
    errorMessage.value = '';
    // Start silence timer immediately
    startSilenceTimeout();
  };

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    // Get the latest result
    const lastResultIndex = event.results.length - 1;
    const result = event.results[lastResultIndex];

    if (result && result[0]) {
      // Update transcript with latest result
      transcript.value = result[0].transcript;

      // Reset silence timer on every result (user is still speaking)
      startSilenceTimeout();

      // If it's a final result, just update the transcript
      // Don't stop - let silence timer handle it
      if (result.isFinal) {
        // Keep listening for more speech
        startSilenceTimeout();
      }
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
    clearSilenceTimeout();

    // If we're still listening (not already processing), reset to idle
    if (recordingState.value === 'listening') {
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

    // Emit transcript if we have any
    if (transcript.value) {
      recordingState.value = 'processing';
      emit('transcript', transcript.value);

      // Reset after a short delay
      setTimeout(() => {
        recordingState.value = 'idle';
        transcript.value = '';
      }, 1000);
    }
  }
}

// Cleanup
onUnmounted(() => {
  clearSilenceTimeout();
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
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

/* Default idle state */
.voice-button.idle {
  color: #6b7280;
  background: transparent;
}

.voice-button.idle:hover:not(:disabled) {
  color: var(--primary-color);
  background: var(--primary-light);
}

.voice-button.listening {
  color: #ef4444;
  background: #fef2f2;
  animation: pulse 1.5s ease-in-out infinite;
}

.voice-button.processing {
  color: var(--primary-color);
  background: var(--primary-light);
}

.voice-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
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
