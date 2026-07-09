<template>
  <div id="app">
    <Toast />
    <UserSelectionDialog v-model:visible="showUserDialog" />
    <QuickInputDialog v-model:visible="quickInputVisible" />

    <Sidebar v-model:visible="sidebarVisible" position="right" class="theme-sidebar">
      <template #header>
        <h2 class="sidebar-title">Podešavanja</h2>
      </template>
      <ThemeSelector />
      <div class="sidebar-section">
        <h3 class="sidebar-section-title">Više</h3>
        <router-link to="/recurring" class="sidebar-link" @click="sidebarVisible = false">
          <i class="pi pi-replay"></i>
          <span>Ponavljajuće stavke</span>
        </router-link>
        <router-link to="/import" class="sidebar-link" @click="sidebarVisible = false">
          <i class="pi pi-file-import"></i>
          <span>Uvoz izvoda</span>
        </router-link>
        <button class="sidebar-link" @click="switchUser(); sidebarVisible = false">
          <i class="pi pi-users"></i>
          <span>Promeni korisnika</span>
        </button>
      </div>
    </Sidebar>

    <div class="app-container">
      <header class="app-header">
        <router-link to="/" class="brand">
          <span class="brand-mark"><i class="pi pi-wallet"></i></span>
          <span class="brand-name">Troškić</span>
        </router-link>
        <div class="header-actions">
          <button
            v-if="userStore.selectedUser"
            class="avatar-btn"
            :title="userLabel"
            aria-label="Promeni korisnika"
            @click="switchUser"
          >
            {{ userInitial }}
          </button>
          <button class="icon-btn" aria-label="Podešavanja" @click="sidebarVisible = true">
            <i class="pi pi-cog"></i>
          </button>
        </div>
      </header>

      <nav class="main-nav">
        <router-link to="/" class="nav-item" :class="{ active: route.path === '/' }">
          <i class="pi pi-home"></i>
          <span>Početna</span>
        </router-link>
        <router-link to="/list" class="nav-item" :class="{ active: isListRoute }">
          <i class="pi pi-list"></i>
          <span>Lista</span>
        </router-link>
        <router-link to="/add" class="nav-fab" aria-label="Dodaj stavku">
          <i class="pi pi-plus"></i>
          <span class="fab-label">Dodaj</span>
        </router-link>
        <router-link to="/balance" class="nav-item" :class="{ active: route.path === '/balance' }">
          <i class="pi pi-chart-pie"></i>
          <span>Bilans</span>
        </router-link>
        <button class="nav-item" @click="quickInputVisible = true">
          <i class="pi pi-microphone"></i>
          <span>Glasovno</span>
        </button>
      </nav>

      <nav v-if="segment" class="segment-nav" aria-label="Vrsta stavke">
        <router-link :to="segment.expense" class="segment-link" :class="{ active: !isIncomeRoute }">Trošak</router-link>
        <router-link :to="segment.income" class="segment-link income" :class="{ active: isIncomeRoute }">Prihod</router-link>
      </nav>

      <main class="app-main">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import Toast from 'primevue/toast';
import Sidebar from 'primevue/sidebar';
import ThemeSelector from './components/ThemeSelector.vue';
import UserSelectionDialog from './components/UserSelectionDialog.vue';
import QuickInputDialog from './components/QuickInputDialog.vue';
import { useThemeStore } from './stores/theme';
import { useUserStore } from './stores/user';

const route = useRoute();
const sidebarVisible = ref(false);
const manualDialogVisible = ref(false);
const quickInputVisible = ref(false);

useThemeStore();
const userStore = useUserStore();

const showUserDialog = computed({
  get: () => userStore.selectedUser === null || manualDialogVisible.value,
  set: value => {
    if (!value) {
      manualDialogVisible.value = false;
    }
  }
});

const userLabel = computed(() => (userStore.selectedUser === 'svetla' ? 'Svetla' : 'Dejan'));
const userInitial = computed(() => userLabel.value.charAt(0));

const isIncomeRoute = computed(() => route.path.startsWith('/income'));
const isListRoute = computed(() => route.path === '/list' || route.path === '/income/list');
const isAddRoute = computed(() => route.path === '/add' || route.path === '/income/add');

const segment = computed(() => {
  if (isAddRoute.value) return { expense: '/add', income: '/income/add' };
  if (isListRoute.value) return { expense: '/list', income: '/income/list' };
  return null;
});

function switchUser() {
  manualDialogVisible.value = true;
}
</script>

<style>
/* ---------- Design tokens ---------- */
:root[data-accent='green'] {
  --primary-color: #0f9d6e;
  --primary-dark: #0a7451;
  --primary-light: #e3f7ee;
  --primary-shadow: rgba(15, 157, 110, 0.22);
}

:root[data-accent='purple'],
:root {
  --primary-color: #5b45d6;
  --primary-dark: #43319f;
  --primary-light: #eeebfc;
  --primary-shadow: rgba(91, 69, 214, 0.25);
}

:root[data-accent='blue'] {
  --primary-color: #2f6fe4;
  --primary-dark: #1e4ea8;
  --primary-light: #e8f0fd;
  --primary-shadow: rgba(47, 111, 228, 0.22);
}

:root {
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --shadow-card: 0 1px 2px rgba(20, 20, 18, 0.04), 0 4px 14px rgba(20, 20, 18, 0.04);
  --shadow-card-hover: 0 6px 20px rgba(20, 20, 18, 0.08);
  --shadow-nav: 0 -2px 14px rgba(20, 20, 18, 0.07);

  --text-primary: #23233c;
  --text-secondary: #75758f;
  --border-color: #e7e7f1;
  --background: #f6f6fb;
  --surface-card: #ffffff;
  --surface-hover: #eeeef6;
  --surface-border: #d5d5e4;

  /* Hero card (deep navy, Rocket-style) */
  --hero-bg: #1d1d40;
  --hero-text: #ffffff;
  --hero-muted: rgba(255, 255, 255, 0.62);
  --hero-chip: rgba(255, 255, 255, 0.1);

  /* Income (mint) */
  --income-color: #0f9d6e;
  --income-dark: #0a7451;
  --income-light: #e3f7ee;
  --income-shadow: rgba(15, 157, 110, 0.22);

  /* Expense amounts (coral) */
  --expense-color: #d14b34;
  --expense-dark: #93301e;
  --expense-light: #fcece8;

  /* User colors */
  --user-svetla-color: #c23a6f;
  --user-svetla-light: #fbeaf0;
  --user-dejan-color: #0f9d6e;
  --user-dejan-light: #e3f7ee;
  --user-unknown-color: #6a6a82;
  --user-unknown-light: #ededf4;
}

:root.dark-mode {
  --text-primary: #f1f1f7;
  --text-secondary: #a2a2c0;
  --border-color: #2c2c52;
  --background: #14142b;
  --surface-card: #1d1d3d;
  --surface-hover: #29294f;
  --surface-border: #3a3a66;

  --shadow-card: 0 1px 2px rgba(0, 0, 0, 0.3), 0 4px 14px rgba(0, 0, 0, 0.25);
  --shadow-card-hover: 0 6px 20px rgba(0, 0, 0, 0.4);
  --shadow-nav: 0 -2px 14px rgba(0, 0, 0, 0.35);

  --hero-bg: #24244c;
  --hero-text: #ffffff;
  --hero-muted: rgba(255, 255, 255, 0.6);
  --hero-chip: rgba(255, 255, 255, 0.08);

  --income-color: #45d39c;
  --income-dark: #8ce7c4;
  --income-light: rgba(69, 211, 156, 0.13);

  --expense-color: #f2937c;
  --expense-dark: #f7c0b2;
  --expense-light: rgba(242, 147, 124, 0.12);

  --user-svetla-color: #ee85ad;
  --user-svetla-light: rgba(238, 133, 173, 0.14);
  --user-dejan-color: #45d39c;
  --user-dejan-light: rgba(69, 211, 156, 0.13);
  --user-unknown-color: #a2a2c0;
  --user-unknown-light: rgba(162, 162, 192, 0.14);
}

:root[data-accent='purple'].dark-mode,
:root.dark-mode {
  --primary-color: #a394f2;
  --primary-dark: #c4baf8;
  --primary-light: rgba(163, 148, 242, 0.15);
}

:root[data-accent='green'].dark-mode {
  --primary-color: #45d39c;
  --primary-dark: #8ce7c4;
  --primary-light: rgba(69, 211, 156, 0.13);
}

:root[data-accent='blue'].dark-mode {
  --primary-color: #7aa8f0;
  --primary-dark: #adc9f6;
  --primary-light: rgba(122, 168, 240, 0.14);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
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

/* ---------- Header ---------- */
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1.25rem;
  background: var(--background);
  position: sticky;
  top: 0;
  z-index: 100;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  text-decoration: none;
  color: var(--text-primary);
}

.brand-mark {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  background: var(--primary-color);
  color: var(--surface-card);
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-mark i {
  font-size: 1.05rem;
}

.brand-name {
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}

.icon-btn:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}

.icon-btn i {
  font-size: 1.125rem;
}

.avatar-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: var(--primary-light);
  color: var(--primary-color);
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s;
}

.avatar-btn:hover {
  transform: scale(1.06);
}

/* ---------- Main navigation ---------- */
.main-nav {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: var(--surface-card);
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 0.5rem 0.25rem 0.6rem;
  border: none;
  background: transparent;
  text-decoration: none;
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.15s;
}

.nav-item i {
  font-size: 1.3rem;
}

.nav-item.active,
.nav-item:hover {
  color: var(--primary-color);
}

.nav-fab {
  flex: 0 0 auto;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--primary-color);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  box-shadow: 0 4px 14px var(--primary-shadow);
  transition: transform 0.15s, background 0.15s;
}

:root.dark-mode .nav-fab {
  color: #131316;
}

.nav-fab:hover {
  transform: scale(1.05);
}

.nav-fab i {
  font-size: 1.35rem;
}

.fab-label {
  display: none;
}

/* ---------- Segment toggle (Trošak / Prihod) ---------- */
.segment-nav {
  display: flex;
  gap: 4px;
  margin: 0.5rem auto 0;
  padding: 4px;
  background: var(--surface-hover);
  border-radius: 999px;
  width: min(320px, calc(100% - 2.5rem));
}

.segment-link {
  flex: 1;
  text-align: center;
  padding: 0.45rem 1rem;
  border-radius: 999px;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  transition: all 0.15s;
}

.segment-link.active {
  background: var(--surface-card);
  color: var(--primary-color);
  box-shadow: var(--shadow-card);
}

.segment-link.income.active {
  color: var(--income-color);
}

/* ---------- Main content ---------- */
.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--background);
  overflow-x: hidden;
}

/* ---------- Mobile ---------- */
@media (max-width: 768px) {
  .main-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    border-top: 1px solid var(--border-color);
    box-shadow: var(--shadow-nav);
    padding: 0.25rem 0.5rem calc(0.25rem + env(safe-area-inset-bottom));
    z-index: 110;
  }

  .nav-fab {
    margin-top: -22px;
  }

  .app-main {
    padding-bottom: calc(84px + env(safe-area-inset-bottom));
  }
}

/* Mobile: dialogs become bottom sheets */
@media (max-width: 640px) {
  .p-dialog-mask {
    align-items: flex-end !important;
  }

  .p-dialog {
    width: 100vw !important;
    max-width: 100vw !important;
    max-height: 92vh !important;
    margin: 0 !important;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0 !important;
  }
}

/* ---------- Desktop ---------- */
@media (min-width: 769px) {
  .app-header {
    padding: 1rem 2rem;
  }

  .main-nav {
    position: sticky;
    top: 62px;
    z-index: 99;
    justify-content: center;
    gap: 0.5rem;
    background: var(--background);
    padding: 0.25rem 0 0.75rem;
  }

  .nav-item {
    flex: 0 0 auto;
    flex-direction: row;
    gap: 0.5rem;
    padding: 0.5rem 1.125rem;
    border-radius: 999px;
    font-size: 0.875rem;
  }

  .nav-item i {
    font-size: 1rem;
  }

  .nav-item.active {
    background: var(--primary-light);
  }

  .nav-item:hover {
    background: var(--surface-hover);
  }

  .nav-fab {
    width: auto;
    height: auto;
    border-radius: 999px;
    padding: 0.5rem 1.25rem;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
  }

  .nav-fab i {
    font-size: 1rem;
  }

  .fab-label {
    display: inline;
  }

  .app-main {
    padding: 1.5rem 1rem 3rem;
    align-items: center;
  }

  .app-main > * {
    width: 100%;
    max-width: 720px;
  }
}

/* ---------- Sidebar ---------- */
.sidebar-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.sidebar-section {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.sidebar-section-title {
  font-size: 0.8125rem;
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
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  text-decoration: none;
  color: var(--text-primary);
  font-family: inherit;
  font-weight: 500;
  font-size: 0.9375rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
}

.sidebar-link:hover {
  background: var(--primary-light);
  color: var(--primary-color);
}

.sidebar-link.router-link-active {
  background: var(--primary-color);
  color: var(--surface-card);
}

.sidebar-link i {
  font-size: 1.05rem;
}
</style>
