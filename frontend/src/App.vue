<template>
  <div id="app">
    <Toast />
    <div class="app-container">
      <header class="app-header">
        <div class="header-content">
          <div class="app-title">
            <i class="pi pi-wallet"></i>
            <h1>Cost Tracker</h1>
          </div>
          <p class="app-subtitle">Pratite troškove domaćinstva</p>
        </div>
      </header>
      <main class="app-main">
        <ExpenseForm />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import Toast from 'primevue/toast';
import ExpenseForm from './components/expense-form/ExpenseForm.vue';
</script>

<style>
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
  background: #f8fafb;
  color: #1f2937;
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
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  padding: 1.5rem 1rem;
  box-shadow: 0 2px 12px rgba(16, 185, 129, 0.15);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 600px;
  margin: 0 auto;
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

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
  background: #f8fafb;
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
