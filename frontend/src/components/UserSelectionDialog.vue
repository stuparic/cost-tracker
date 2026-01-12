<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    :closable="false"
    :dismissableMask="false"
    :modal="true"
    header="Izaberite korisnika"
    class="user-selection-dialog"
  >
    <div class="user-options">
      <button
        class="user-card svetla"
        @click="selectUser('svetla')"
      >
        <div class="color-preview purple"></div>
        <h3>Svetla</h3>
        <p class="theme-label">Ljubičasta tema</p>
      </button>

      <button
        class="user-card dejan"
        @click="selectUser('dejan')"
      >
        <div class="color-preview green"></div>
        <h3>Dejan</h3>
        <p class="theme-label">Zelena tema</p>
      </button>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import Dialog from 'primevue/dialog';
import { useUserStore, type User } from '../stores/user';

defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
}>();

const userStore = useUserStore();

function selectUser(user: User) {
  userStore.setUser(user);
  emit('update:visible', false);
}
</script>

<style scoped>
.user-options {
  display: flex;
  gap: 1.5rem;
  padding: 1rem 0;
  flex-wrap: wrap;
  justify-content: center;
}

.user-card {
  flex: 1;
  min-width: 200px;
  max-width: 250px;
  padding: 2rem 1.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 1rem;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  font-family: inherit;
}

.user-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.user-card.svetla:hover {
  border-color: #a855f7;
  background: #faf5ff;
}

.user-card.dejan:hover {
  border-color: #10b981;
  background: #ecfdf5;
}

.color-preview {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s ease;
}

.user-card:hover .color-preview {
  transform: scale(1.1);
}

.color-preview.purple {
  background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
}

.color-preview.green {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.user-card h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.theme-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

/* Mobile responsiveness */
@media (max-width: 600px) {
  .user-options {
    flex-direction: column;
    gap: 1rem;
  }

  .user-card {
    max-width: 100%;
  }
}
</style>

<style>
/* Global dialog styling */
.user-selection-dialog .p-dialog {
  max-width: 600px;
  width: 90vw;
}

.user-selection-dialog .p-dialog-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 0.5rem 0.5rem 0 0;
}

.user-selection-dialog .p-dialog-title {
  font-size: 1.25rem;
  font-weight: 700;
}
</style>
