<template>
  <div id="app">
    <Toast />
    <header class="app-header">
      <h1>💰 Troškovi</h1>
    </header>
    <main class="app-main">
      <ExpenseForm />
    </main>
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

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #f5f5f5;
  color: #333;
}

#app {
  min-height: 100vh;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.app-header h1 {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
}

.app-main {
  padding: 2rem 1rem;
}

@media (max-width: 640px) {
  .app-header {
    padding: 1rem;
  }

  .app-header h1 {
    font-size: 1.5rem;
  }

  .app-main {
    padding: 1rem 0;
  }
}
</style>
