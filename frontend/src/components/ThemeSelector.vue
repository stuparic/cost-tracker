<template>
  <div class="theme-selector">
    <h3 class="theme-title">Izaberi temu</h3>

    <div class="theme-options">
      <button
        class="theme-option"
        :class="{ active: themeStore.currentTheme === 'green' }"
        @click="themeStore.setTheme('green')"
      >
        <div class="theme-preview green-preview">
          <div class="preview-bar"></div>
          <div class="preview-content"></div>
        </div>
        <span class="theme-name">Zelena</span>
        <i v-if="themeStore.currentTheme === 'green'" class="pi pi-check"></i>
      </button>

      <button
        class="theme-option"
        :class="{ active: themeStore.currentTheme === 'purple' }"
        @click="themeStore.setTheme('purple')"
      >
        <div class="theme-preview purple-preview">
          <div class="preview-bar"></div>
          <div class="preview-content"></div>
        </div>
        <span class="theme-name">Ljubičasta</span>
        <i v-if="themeStore.currentTheme === 'purple'" class="pi pi-check"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useThemeStore } from '@/stores/theme';

const themeStore = useThemeStore();
</script>

<style scoped>
.theme-selector {
  padding: 1rem 0;
}

.theme-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 1rem 0;
}

.theme-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.theme-option {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.theme-option:hover {
  border-color: var(--primary-color);
  background: var(--primary-light);
}

.theme-option.active {
  border-color: var(--primary-color);
  background: var(--primary-light);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.theme-preview {
  width: 48px;
  height: 48px;
  border-radius: 0.5rem;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.preview-bar {
  height: 16px;
  width: 100%;
}

.preview-content {
  height: 32px;
  background: #f8fafb;
}

.green-preview .preview-bar {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.purple-preview .preview-bar {
  background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
}

.theme-name {
  flex: 1;
  font-weight: 600;
  color: var(--text-primary);
  text-align: left;
}

.theme-option i {
  color: var(--primary-color);
  font-size: 1.25rem;
}
</style>