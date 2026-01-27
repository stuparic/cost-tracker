<template>
  <Dialog
    v-model:visible="isVisible"
    modal
    :header="dialogHeader"
    :style="{ width: '90vw', maxWidth: '500px' }"
    :draggable="false"
    class="quick-input-dialog"
  >
    <div class="dialog-content">
      <!-- Textarea with dynamic states -->
      <div class="textarea-wrapper" :class="textareaWrapperClass">
        <textarea
          ref="textareaRef"
          v-model="inputText"
          :placeholder="textareaPlaceholder"
          :disabled="isProcessing || isSending"
          class="input-textarea"
          rows="4"
          @keydown.ctrl.enter="handleSend"
        ></textarea>

        <!-- Recording visualization overlay -->
        <div v-if="isRecording" class="recording-overlay">
          <div class="waveform-container">
            <span class="recording-indicator">🔴</span>
            <div class="waveform">
              <span v-for="i in 12" :key="i" class="wave-bar" :style="getWaveBarStyle(i)"></span>
            </div>
            <span class="recording-timer">{{ recordingTime }}</span>
          </div>
        </div>

        <!-- Processing overlay -->
        <div v-if="isProcessing" class="processing-overlay">
          <i class="pi pi-spin pi-spinner processing-spinner"></i>
          <span class="processing-text">Obrađujem...</span>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="action-buttons">
        <Button
          v-if="!isRecording"
          label="Start"
          icon="pi pi-microphone"
          class="mic-button"
          :disabled="isProcessing || isSending"
          @click="handleStartRecording"
        />
        <Button
          v-else
          label="Stop"
          icon="pi pi-stop-circle"
          class="mic-button recording-active"
          @click="handleStopRecording"
        />
        <Button
          label="Pošalji"
          icon="pi pi-check"
          :disabled="!canSend"
          :loading="isSending"
          severity="success"
          @click="handleSend"
        />
      </div>

      <!-- Hint text -->
      <div v-if="hintText" class="hint-text">
        <i class="pi pi-info-circle"></i>
        <span>{{ hintText }}</span>
      </div>

      <!-- Error message -->
      <div v-if="errorMessage" class="error-message">
        <i class="pi pi-exclamation-triangle"></i>
        <span>{{ errorMessage }}</span>
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { useSpeechRecognition } from '@/composables/useSpeechRecognition';
import { useUserStore } from '@/stores/user';
import { useToast } from 'primevue/usetoast';
import apiClient from '@/api/client';

// Props
const visible = defineModel<boolean>('visible', { required: true });

// User store & toast
const userStore = useUserStore();
const toast = useToast();

// Speech recognition
const speechRecognition = useSpeechRecognition();
const isRecording = speechRecognition.isRecording;
const recognitionError = speechRecognition.error;

// Local state
const inputText = ref('');
const isProcessing = ref(false);
const isSending = ref(false);
const errorMessage = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const recordingStartTime = ref<number>(0);
const recordingTime = ref('00:00');
const recordingTimerInterval = ref<number | null>(null);

// Computed
const isVisible = computed({
  get: () => visible.value,
  set: (value) => {
    visible.value = value;
    if (!value) {
      resetDialog();
    }
  }
});

const dialogHeader = computed(() => {
  if (isRecording.value) return '🔴 SNIMAM...';
  if (isProcessing.value) return '⏳ Prepoznajem govor...';
  if (isSending.value) return '📤 Šaljem...';
  if (inputText.value.trim()) return '✅ Prepoznato! Proverite tekst';
  return 'Brzi unos troška';
});

const textareaPlaceholder = computed(() => {
  if (isRecording.value) return '';
  if (isProcessing.value) return '';
  return 'Opišite trošak ili koristite glasovni unos...';
});

const textareaWrapperClass = computed(() => ({
  'recording-state': isRecording.value,
  'processing-state': isProcessing.value,
  'ready-state': inputText.value.trim() && !isRecording.value && !isProcessing.value
}));

const canSend = computed(() => {
  return inputText.value.trim() && !isProcessing.value && !isSending.value && !isRecording.value;
});

const hintText = computed(() => {
  if (isRecording.value) return 'Kliknite "Zaustavi snimanje" kada završite';
  return '';
});

// Waveform animation
const waveHeights = ref<number[]>([2, 4, 6, 8, 6, 4, 2, 4, 6, 8, 6, 4]);
let waveAnimationFrame: number | null = null;

function getWaveBarStyle(index: number) {
  const height = waveHeights.value[index - 1] || 4;
  return {
    height: `${height}px`,
    animationDelay: `${index * 0.1}s`
  };
}

function animateWaveform() {
  // Simulate audio waveform by randomly adjusting heights
  waveHeights.value = waveHeights.value.map(() => Math.random() * 12 + 2);

  if (isRecording.value) {
    waveAnimationFrame = requestAnimationFrame(() => {
      setTimeout(animateWaveform, 100);
    });
  }
}

// Recording timer
function startRecordingTimer() {
  recordingStartTime.value = Date.now();
  updateRecordingTime();
  recordingTimerInterval.value = window.setInterval(updateRecordingTime, 100);
}

function updateRecordingTime() {
  const elapsed = Math.floor((Date.now() - recordingStartTime.value) / 1000);
  const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');
  recordingTime.value = `${minutes}:${seconds}`;
}

function stopRecordingTimer() {
  if (recordingTimerInterval.value) {
    clearInterval(recordingTimerInterval.value);
    recordingTimerInterval.value = null;
  }
  recordingTime.value = '00:00';
}

// Handlers
function handleStartRecording() {
  errorMessage.value = '';
  speechRecognition.start();
  startRecordingTimer();
  animateWaveform();
}

async function handleStopRecording() {
  if (!isRecording.value) return;

  stopRecordingTimer();

  if (waveAnimationFrame) {
    cancelAnimationFrame(waveAnimationFrame);
    waveAnimationFrame = null;
  }

  isProcessing.value = true;

  try {
    const text = await speechRecognition.stop();

    if (!text || text.trim() === '') {
      errorMessage.value = 'Nije detektovan govor';
      setTimeout(() => {
        errorMessage.value = '';
      }, 3000);
    } else {
      inputText.value = text;
      await nextTick();
      textareaRef.value?.focus();
    }
  } catch (err) {
    errorMessage.value = 'Greška pri prepoznavanju govora';
    setTimeout(() => {
      errorMessage.value = '';
    }, 3000);
  } finally {
    isProcessing.value = false;
  }
}

async function handleSend() {
  if (!canSend.value) return;

  const user = userStore.selectedUser;
  if (!user) {
    errorMessage.value = 'Nema izabranog korisnika';
    setTimeout(() => {
      errorMessage.value = '';
    }, 3000);
    return;
  }

  isSending.value = true;
  errorMessage.value = '';

  try {
    await apiClient.post('/voice/parse', {
      text: inputText.value.trim(),
      createdBy: user
    });

    toast.add({
      severity: 'success',
      summary: 'Poslato!',
      detail: inputText.value.trim(),
      life: 4000
    });

    isVisible.value = false;
  } catch (err) {
    console.error('Error sending to server:', err);
    errorMessage.value = 'Greška pri slanju. Pokušajte ponovo.';
    setTimeout(() => {
      errorMessage.value = '';
    }, 3000);
  } finally {
    isSending.value = false;
  }
}

function resetDialog() {
  inputText.value = '';
  errorMessage.value = '';
  isProcessing.value = false;
  isSending.value = false;
  stopRecordingTimer();
  if (waveAnimationFrame) {
    cancelAnimationFrame(waveAnimationFrame);
    waveAnimationFrame = null;
  }
  if (isRecording.value) {
    speechRecognition.stop(); // Don't await, just cleanup
  }
}

// Watch for recognition errors
watch(recognitionError, (newError) => {
  if (newError) {
    errorMessage.value = newError;
    stopRecordingTimer();
    if (waveAnimationFrame) {
      cancelAnimationFrame(waveAnimationFrame);
      waveAnimationFrame = null;
    }
    setTimeout(() => {
      errorMessage.value = '';
      recognitionError.value = null;
    }, 3000);
  }
});

// Cleanup
onUnmounted(() => {
  if (isRecording.value) {
    speechRecognition.stop(); // Don't await, just cleanup
  }
  stopRecordingTimer();
  if (waveAnimationFrame) {
    cancelAnimationFrame(waveAnimationFrame);
  }
});
</script>

<style scoped>
.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.textarea-wrapper {
  position: relative;
  min-height: 120px;
}

.input-textarea {
  width: 100%;
  min-height: 120px;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.3s ease;
}

.input-textarea:focus {
  outline: none;
  border-color: #10b981;
}

.input-textarea:disabled {
  background-color: #f9fafb;
  cursor: not-allowed;
}

/* Recording state */
.textarea-wrapper.recording-state .input-textarea {
  border-color: #ef4444;
  animation: pulseBorder 1.5s ease-in-out infinite;
}

@keyframes pulseBorder {
  0%, 100% {
    border-color: #ef4444;
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
  }
  50% {
    border-color: #dc2626;
    box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
  }
}

/* Processing state */
.textarea-wrapper.processing-state .input-textarea {
  border-color: #3b82f6;
}

/* Ready state */
.textarea-wrapper.ready-state .input-textarea {
  border-color: #10b981;
}

/* Recording overlay */
.recording-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 0.5rem;
  pointer-events: none;
}

.waveform-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.recording-indicator {
  font-size: 1.5rem;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.waveform {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 30px;
}

.wave-bar {
  width: 3px;
  background: linear-gradient(to top, #ef4444, #dc2626);
  border-radius: 2px;
  animation: waveMove 0.8s ease-in-out infinite;
}

@keyframes waveMove {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.5); }
}

.recording-timer {
  font-size: 0.875rem;
  font-weight: 600;
  color: #ef4444;
  font-variant-numeric: tabular-nums;
}

/* Processing overlay */
.processing-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 0.5rem;
  pointer-events: none;
}

.processing-spinner {
  font-size: 2rem;
  color: #3b82f6;
}

.processing-text {
  font-size: 0.875rem;
  color: #6b7280;
}

/* Action buttons */
.action-buttons {
  display: flex;
  gap: 0.75rem;
}

.action-buttons .p-button {
  flex: 1;
}

.mic-button {
  background: #6b7280 !important;
  border-color: #6b7280 !important;
}

.mic-button:hover:not(:disabled) {
  background: #4b5563 !important;
  border-color: #4b5563 !important;
}

.mic-button.recording-active {
  background: #ef4444 !important;
  border-color: #ef4444 !important;
  animation: buttonPulse 1.5s ease-in-out infinite;
}

@keyframes buttonPulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
  }
}

/* Hint text */
.hint-text {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #eff6ff;
  border-left: 3px solid #3b82f6;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #1e40af;
}

.hint-text i {
  color: #3b82f6;
}

/* Error message */
.error-message {
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

.error-message i {
  color: #ef4444;
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
