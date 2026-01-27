<template>
  <div class="theme-selector">
    <!-- Dark Mode Toggle -->
    <div class="dark-mode-section">
      <h3 class="section-title">Izgled</h3>
      <button class="dark-mode-toggle" @click="themeStore.toggleDarkMode()">
        <div class="toggle-content">
          <i :class="themeStore.isDarkMode ? 'pi pi-moon' : 'pi pi-sun'"></i>
          <span class="toggle-label">{{ themeStore.isDarkMode ? 'Tamni režim' : 'Svetli režim' }}</span>
        </div>
        <div class="toggle-switch" :class="{ active: themeStore.isDarkMode }">
          <div class="toggle-knob"></div>
        </div>
      </button>
    </div>

    <!-- Accent Color Selector -->
    <div class="accent-section">
      <h3 class="section-title">Akcentna boja</h3>
      <div class="accent-options">
        <button
          class="accent-option"
          :class="{ active: themeStore.currentAccent === 'green' }"
          @click="themeStore.setAccent('green')"
        >
          <div class="accent-preview green-preview">
            <div class="preview-bar"></div>
            <div class="preview-content"></div>
          </div>
          <span class="accent-name">Zelena</span>
          <i v-if="themeStore.currentAccent === 'green'" class="pi pi-check"></i>
        </button>

        <button
          class="accent-option"
          :class="{ active: themeStore.currentAccent === 'purple' }"
          @click="themeStore.setAccent('purple')"
        >
          <div class="accent-preview purple-preview">
            <div class="preview-bar"></div>
            <div class="preview-content"></div>
          </div>
          <span class="accent-name">Ljubičasta</span>
          <i v-if="themeStore.currentAccent === 'purple'" class="pi pi-check"></i>
        </button>

        <button
          class="accent-option"
          :class="{ active: themeStore.currentAccent === 'blue' }"
          @click="themeStore.setAccent('blue')"
        >
          <div class="accent-preview blue-preview">
            <div class="preview-bar"></div>
            <div class="preview-content"></div>
          </div>
          <span class="accent-name">Plava</span>
          <i v-if="themeStore.currentAccent === 'blue'" class="pi pi-check"></i>
        </button>
      </div>
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
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.75rem 0;
}

/* Dark Mode Toggle */
.dark-mode-section {
  margin-bottom: 0.5rem;
}

.dark-mode-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 1rem;
  background: var(--surface-card);
  border: 2px solid var(--border-color);
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.dark-mode-toggle:hover {
  border-color: var(--primary-color);
  background: var(--surface-hover);
}

.toggle-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.toggle-content i {
  font-size: 1.5rem;
  color: var(--primary-color);
}

.toggle-label {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1rem;
}

.toggle-switch {
  width: 48px;
  height: 26px;
  background: var(--surface-border);
  border-radius: 13px;
  position: relative;
  transition: background 0.3s;
}

.toggle-switch.active {
  background: var(--primary-color);
}

.toggle-knob {
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 3px;
  left: 3px;
  transition: transform 0.3s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-switch.active .toggle-knob {
  transform: translateX(22px);
}

/* Accent Color Selector */
.accent-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.accent-option {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: var(--surface-card);
  border: 2px solid var(--border-color);
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.accent-option:hover {
  border-color: var(--primary-color);
  background: var(--primary-light);
}

.accent-option.active {
  border-color: var(--primary-color);
  background: var(--primary-light);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.accent-preview {
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

.blue-preview .preview-bar {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}

.accent-name {
  flex: 1;
  font-weight: 600;
  color: var(--text-primary);
  text-align: left;
}

.accent-option i {
  color: var(--primary-color);
  font-size: 1.25rem;
}
</style>
