<template>
  <div id="app">
    <Toast />
    <UserSelectionDialog v-model:visible="showUserDialog" />

    <!-- Voice Transcript Bubble -->
    <Transition name="slide-up">
      <div v-if="voiceTranscriptBubble.visible" class="voice-bubble">
        <i class="pi pi-microphone"></i>
        <span class="voice-bubble-text">{{ voiceTranscriptBubble.text }}</span>
      </div>
    </Transition>
    <Sidebar v-model:visible="sidebarVisible" position="left" class="theme-sidebar">
      <template #header>
        <h2 class="sidebar-title">Podešavanja</h2>
      </template>
      <ThemeSelector />
      <div class="sidebar-section">
        <h3 class="sidebar-section-title">Navigacija</h3>
        <router-link to="/recurring" class="sidebar-link" @click="sidebarVisible = false">
          <i class="pi pi-replay"></i>
          <span>Ponavljajuće stavke</span>
        </router-link>
      </div>
    </Sidebar>

    <div class="app-container">
      <header class="app-header">
        <div class="header-content">
          <div class="header-left">
            <button class="hamburger-btn" aria-label="Open menu" @click="sidebarVisible = true">
              <i class="pi pi-bars"></i>
            </button>
            <VoiceRecorder @transcript="handleVoiceTranscript" />
          </div>
          <div class="header-center">
            <div class="app-title">
              <i class="pi pi-wallet"></i>
              <h1>Troškić</h1>
            </div>
            <p class="app-subtitle">Pratite troškove domaćinstva</p>
          </div>
          <div v-if="userStore.selectedUser" class="user-badge" @click="switchUser">
            <i class="pi pi-user"></i>
            <span>{{ userStore.selectedUser === 'svetla' ? 'Svetla' : 'Dejan' }}</span>
          </div>
        </div>
      </header>
      <!-- Main Section Navigation -->
      <nav class="main-nav">
        <router-link to="/add" class="main-tab expense-tab">
          <i class="pi pi-shopping-cart"></i>
          <span>Troškovi</span>
        </router-link>
        <router-link to="/balance" class="main-tab balance-tab">
          <i class="pi pi-chart-pie"></i>
          <span>Bilans</span>
        </router-link>
        <router-link to="/income/add" class="main-tab income-tab">
          <i class="pi pi-wallet"></i>
          <span>Prihodi</span>
        </router-link>
      </nav>

      <!-- Sub Navigation -->
      <nav v-if="isExpenseRoute && !isBalanceRoute" class="tab-nav expense-subnav">
        <router-link to="/add" class="tab-link">
          <i class="pi pi-plus-circle"></i>
          <span>Dodaj</span>
        </router-link>
        <router-link to="/list" class="tab-link">
          <i class="pi pi-list"></i>
          <span>Lista</span>
        </router-link>
      </nav>

      <nav v-if="isIncomeRoute && !isBalanceRoute" class="tab-nav income-subnav">
        <router-link to="/income/add" class="tab-link">
          <i class="pi pi-plus-circle"></i>
          <span>Dodaj</span>
        </router-link>
        <router-link to="/income/list" class="tab-link">
          <i class="pi pi-list"></i>
          <span>Lista</span>
        </router-link>
      </nav>
      <main class="app-main">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import Toast from 'primevue/toast';
import Sidebar from 'primevue/sidebar';
import ThemeSelector from './components/ThemeSelector.vue';
import UserSelectionDialog from './components/UserSelectionDialog.vue';
import VoiceRecorder from './components/shared/VoiceRecorder.vue';
import { useVoiceInput } from './composables/useVoiceInput';

const route = useRoute();
const toast = useToast();
const sidebarVisible = ref(false);
const manualDialogVisible = ref(false);

// Voice transcript bubble state
const voiceTranscriptBubble = ref({
  visible: false,
  text: '',
});
let bubbleTimeout: ReturnType<typeof setTimeout> | null = null;

// Initialize stores on app load
import { useThemeStore } from './stores/theme';
import { useUserStore } from './stores/user';
import { useBalanceStore } from './stores/balance';

useThemeStore(); // Initialize theme
const userStore = useUserStore();
const balanceStore = useBalanceStore();
const { sendTranscript } = useVoiceInput();

// Preload balance data in background on app start
onMounted(() => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  balanceStore.fetchBalanceData({
    startDate: startOfMonth.toISOString(),
    endDate: endOfMonth.toISOString(),
    limit: 1000,
  });
});

// Show user selection dialog if no user is selected or manually triggered
const showUserDialog = computed({
  get: () => userStore.selectedUser === null || manualDialogVisible.value,
  set: (value) => {
    if (!value) {
      manualDialogVisible.value = false;
    }
  }
});

// Detect current route section
const isExpenseRoute = computed(() => {
  return route.path === '/add' || route.path === '/list';
});

const isBalanceRoute = computed(() => {
  return route.path === '/balance';
});

const isIncomeRoute = computed(() => {
  return route.path.startsWith('/income');
});

// Function to allow switching users
function switchUser() {
  manualDialogVisible.value = true;
}

// Show voice transcript bubble
function showVoiceTranscriptBubble(text: string) {
  // Clear existing timeout
  if (bubbleTimeout) {
    clearTimeout(bubbleTimeout);
  }

  // Show bubble with text
  voiceTranscriptBubble.value = {
    visible: true,
    text,
  };

  // Hide after 5 seconds
  bubbleTimeout = setTimeout(() => {
    voiceTranscriptBubble.value.visible = false;
  }, 5000);
}

// Voice input handler - AI will determine if it's expense or income
async function handleVoiceTranscript(text: string) {
  // Show bubble immediately
  showVoiceTranscriptBubble(text);

  try {
    // Don't send context - let AI determine if it's expense or income
    await sendTranscript(text);
  } catch (error) {
    console.error('Failed to process voice input:', error);
    toast.add({
      severity: 'error',
      summary: 'Greška',
      detail: 'Nije moguće poslati glasovni unos',
      life: 3000,
    });
  }
}
</script>

<style>
/* CSS Variables for Themes */
:root[data-theme="green"] {
  --primary-color: #10b981;
  --primary-dark: #059669;
  --primary-light: #ecfdf5;
  --primary-shadow: rgba(16, 185, 129, 0.25);
}

:root[data-theme="purple"] {
  --primary-color: #a855f7;
  --primary-dark: #7c3aed;
  --primary-light: #faf5ff;
  --primary-shadow: rgba(168, 85, 247, 0.25);
}

:root[data-theme="blue"] {
  --primary-color: #3b82f6;
  --primary-dark: #2563eb;
  --primary-light: #eff6ff;
  --primary-shadow: rgba(59, 130, 246, 0.25);
}

:root {
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --border-color: #e5e7eb;
  --background: #f8fafb;

  /* Income Colors */
  --income-color: #0891b2;
  --income-dark: #0e7490;
  --income-light: #ecfeff;
  --income-shadow: rgba(8, 145, 178, 0.25);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  overflow-x: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: var(--background);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 100%;
}

.app-header {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
  color: white;
  padding: 1.5rem 1rem;
  box-shadow: 0 2px 12px var(--primary-shadow);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Voice Recorder in Header - Override default styles */
.header-left :deep(.voice-button) {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  font-size: 1.5rem;
}

.header-left :deep(.voice-button.idle) {
  background: white;
  color: var(--primary-color);
  border: 2px solid white;
}

.header-left :deep(.voice-button.idle:hover:not(:disabled)) {
  background: rgba(255, 255, 255, 0.9);
  color: var(--primary-color);
}

.header-left :deep(.voice-button.listening) {
  background: #ef4444;
  color: white;
  border: 2px solid white;
}

.header-left :deep(.voice-button.processing) {
  background: white;
  color: var(--primary-color);
  border: 2px solid white;
}

.header-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hamburger-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.hamburger-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.hamburger-btn i {
  font-size: 1.25rem;
}

.sidebar-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.app-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  justify-content: center;
  margin-bottom: 0.25rem;
}

.app-title i {
  font-size: 1.75rem;
}

.app-title h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.025em;
}

.app-subtitle {
  text-align: center;
  font-size: 0.875rem;
  opacity: 0.9;
  font-weight: 400;
  margin: 0;
}

.user-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  width: fit-content;
  margin-left: auto;
  margin-right: auto;
}

.user-badge:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.user-badge i {
  font-size: 1rem;
}

/* Main Navigation (Troškovi/Prihodi) */
.main-nav {
  display: flex;
  background: white;
  border-bottom: 2px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 91;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.main-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  text-decoration: none;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.2s;
  border-bottom: 3px solid transparent;
}

.main-tab i {
  font-size: 1.5rem;
}

.main-tab.expense-tab.router-link-active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
  background: var(--primary-light);
}

.main-tab.income-tab.router-link-active {
  color: var(--income-color);
  border-bottom-color: var(--income-color);
  background: var(--income-light);
}

.main-tab.balance-tab.router-link-active {
  color: #f59e0b;
  border-bottom-color: #f59e0b;
  background: #fffbeb;
}

.main-tab:hover {
  background: var(--background);
}

/* Sub Navigation (Dodaj/Lista) */
.tab-nav {
  display: flex;
  background: white;
  border-bottom: 2px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 90;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.tab-link {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem;
  text-decoration: none;
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 0.9375rem;
  transition: all 0.2s;
  border-bottom: 3px solid transparent;
  position: relative;
}

.tab-link i {
  font-size: 1.125rem;
}

.expense-subnav .tab-link:hover {
  color: var(--primary-color);
  background: var(--primary-light);
}

.expense-subnav .tab-link.router-link-active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.income-subnav .tab-link:hover {
  color: var(--income-color);
  background: var(--income-light);
}

.income-subnav .tab-link.router-link-active {
  color: var(--income-color);
  border-bottom-color: var(--income-color);
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
  background: var(--background);
}

/* Mobile-first: Full-screen experience */
@media (max-width: 768px) {
  body {
    background: white;
  }

  .app-header {
    padding: 1.25rem 1rem;
    border-radius: 0;
  }

  .app-title h1 {
    font-size: 1.375rem;
  }

  .app-title i {
    font-size: 1.5rem;
  }

  .app-subtitle {
    font-size: 0.8125rem;
  }

  .app-main {
    padding: 0;
    background: white;
  }
}

/* Desktop: Centered card layout */
@media (min-width: 769px) {
  .app-main {
    padding: 2rem 1rem;
    justify-content: flex-start;
    align-items: center;
  }
}

/* Sidebar Navigation */
.sidebar-section {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.sidebar-section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 1rem 0;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  text-decoration: none;
  color: var(--text-primary);
  font-weight: 500;
  font-size: 0.9375rem;
  border-radius: 0.5rem;
  transition: all 0.2s;
}

.sidebar-link:hover {
  background: var(--primary-light);
  color: var(--primary-color);
}

.sidebar-link.router-link-active {
  background: var(--primary-color);
  color: white;
}

.sidebar-link i {
  font-size: 1.125rem;
}

/* Voice Transcript Bubble */
.voice-bubble {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;

  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;

  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(10px);
  color: white;
  border-radius: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

  max-width: 90%;
  width: auto;
}

.voice-bubble i {
  font-size: 1.25rem;
  color: #10b981;
  flex-shrink: 0;
}

.voice-bubble-text {
  font-size: 0.9375rem;
  font-weight: 500;
  line-height: 1.4;
}

/* Slide up animation */
.slide-up-enter-active {
  animation: slideUp 0.3s ease-out;
}

.slide-up-leave-active {
  animation: slideDown 0.3s ease-in;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@keyframes slideDown {
  from {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  to {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .voice-bubble {
    bottom: 1rem;
    padding: 0.875rem 1.25rem;
    max-width: calc(100% - 2rem);
  }

  .voice-bubble-text {
    font-size: 0.875rem;
  }
}
</style>
