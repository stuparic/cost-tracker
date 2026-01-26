<template>
  <div class="hold-to-record">
    <button
      :class="['record-button', { recording: isRecording }]"
      :title="buttonTitle"
      @mousedown="handlePressStart"
      @mouseup="handleTextProcessingEnd"
      @mouseleave="handleCancel"
      @touchstart.prevent="handlePressStart"
      @touchend.prevent="handleTextProcessingEnd"
      @touchcancel.prevent="handleCancel"
    >
      <i class="pi pi-microphone"></i>
    </button>

    <!-- Error Message -->
    <div v-if="errorMessage" class="error-display">
      <i class="pi pi-exclamation-triangle"></i>
      <span>{{ errorMessage }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, type Ref } from 'vue';
import { useHoldToRecord } from '@/composables/useHoldToRecord';
import { useUserStore } from '@/stores/user';
import { useToast } from 'primevue/usetoast';
import apiClient from "@/api/client.ts";

// User store
const userStore = useUserStore();

// Toast
const toast = useToast();

// Recording composable
const {
  isRecording,
  error,
  startRecording,
  stopRecording,
  cancelRecording,
  cleanup
} = useHoldToRecord();

// Local state
const errorMessage: Ref<string> = ref('');

// Computed
const buttonTitle = computed((): string => {
  return isRecording.value ? 'Držite da snimate...' : 'Držite da snimate glasovni unos';
});

// Handlers
function handlePressStart(): void {
  errorMessage.value = '';
  startRecording();
}

async function handleTextProcessingEnd(): Promise<void> {
  if (!isRecording.value) return;

  // Wait for the recognition to finish and get the transcript
  const text: string = await stopRecording();

  if (!text || text.trim() === '') {
    errorMessage.value = 'Nije detektovan govor';
    setTimeout(() => {
      errorMessage.value = '';
    }, 3000);
    return;
  }

  // Send to server immediately (fire and forget)
  sendToServer(text);

  // Show toast with transcribed text
  toast.add({
    severity: 'success',
    summary: 'Poslato!',
    detail: text,
    life: 4000
  });
}

function handleCancel(): void {
  if (isRecording.value) {
    cancelRecording();
  }
}

function sendToServer(text: string): void {
  const user = userStore.selectedUser;
  if (!user) {
    console.error('No user selected');
    return;
  }

  apiClient.post('/voice/parse', { text, createdBy: user });
}

// Watch for errors from composable
watch(error, (newError: string | null) => {
  if (newError) {
    errorMessage.value = newError;
    setTimeout(() => {
      errorMessage.value = '';
      error.value = null;
    }, 3000);
  }
});

// Cleanup
onUnmounted(() => {
  cleanup();
});
</script>

<style scoped>
.hold-to-record {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.record-button {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #6b7280;
  background: transparent;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
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