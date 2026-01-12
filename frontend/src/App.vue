<template>
  <div id="app">
    <Toast />
    <UserSelectionDialog v-model:visible="showUserDialog" />
    <Sidebar v-model:visible="sidebarVisible" position="left" class="theme-sidebar">
      <template #header>
        <h2 class="sidebar-title">Podešavanja</h2>
      </template>
      <ThemeSelector />
    </Sidebar>

    <div class="app-container">
      <header class="app-header">
        <div class="header-content">
          <button class="hamburger-btn" @click="sidebarVisible = true" aria-label="Open menu">
            <i class="pi pi-bars"></i>
          </button>
          <div class="app-title">
            <i class="pi pi-wallet"></i>
            <h1>Troškić</h1>
          </div>
          <p class="app-subtitle">Pratite troškove domaćinstva</p>
          <div v-if="userStore.selectedUser" class="user-badge" @click="switchUser">
            <i class="pi pi-user"></i>
            <span>{{ userStore.selectedUser === 'svetla' ? 'Svetla' : 'Dejan' }}</span>
          </div>
        </div>
      </header>
      <nav class="tab-nav">
        <router-link to="/add" class="tab-link">
          <i class="pi pi-plus-circle"></i>
          <span>Dodaj trošak</span>
        </router-link>
        <router-link to="/list" class="tab-link">
          <i class="pi pi-list"></i>
          <span>Lista troškova</span>
        </router-link>
      </nav>
      <main class="app-main">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import Toast from 'primevue/toast';
import Sidebar from 'primevue/sidebar';
import ThemeSelector from './components/ThemeSelector.vue';
import UserSelectionDialog from './components/UserSelectionDialog.vue';

const sidebarVisible = ref(false);
const manualDialogVisible = ref(false);

// Initialize stores on app load
import { useThemeStore } from './stores/theme';
import { useUserStore } from './stores/user';

const themeStore = useThemeStore();
const userStore = useUserStore();

// Show user selection dialog if no user is selected or manually triggered
const showUserDialog = computed({
  get: () => userStore.selectedUser === null || manualDialogVisible.value,
  set: (value) => {
    if (!value) {
      manualDialogVisible.value = false;
    }
  }
});

// Function to allow switching users
function switchUser() {
  manualDialogVisible.value = true;
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

:root {
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --border-color: #e5e7eb;
  --background: #f8fafb;
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
  position: relative;
}

.hamburger-btn {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
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

.tab-nav {
  display: flex;
  background: white;
  border-bottom: 2px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 90;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.tab-link {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  text-decoration: none;
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 0.9375rem;
  transition: all 0.2s;
  border-bottom: 3px solid transparent;
  position: relative;
}

.tab-link:hover {
  color: var(--primary-color);
  background: var(--primary-light);
}

.tab-link.router-link-active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.tab-link i {
  font-size: 1.25rem;
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
</style>
