<template>
  <div class="login-view">
    <div class="login-card">
      <img src="/icon.svg" alt="Troškić" class="login-logo" />
      <h1 class="login-title">Troškić</h1>
      <p class="login-subtitle">Kućne finansije na jednom mestu</p>

      <button class="google-btn" :disabled="authStore.signingIn" @click="signIn">
        <svg class="google-icon" viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
        </svg>
        <span>{{ authStore.signingIn ? 'Prijavljivanje…' : 'Prijavi se Google nalogom' }}</span>
      </button>

      <p v-if="error" class="login-error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const router = useRouter();
const error = ref('');

async function signIn() {
  error.value = '';
  try {
    await authStore.signInWithGoogle();
    router.replace('/');
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code ?? '';
    error.value = code ? `Prijava nije uspela (${code})` : 'Prijava nije uspela, pokušaj ponovo';
  }
}
</script>

<style scoped>
.login-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--background);
  padding: 1.5rem;
}

.login-card {
  width: 100%;
  max-width: 360px;
  background: var(--surface-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: 2.5rem 2rem;
  text-align: center;
}

.login-logo {
  width: 72px;
  height: 72px;
  border-radius: 18px;
}

.login-title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 1rem 0 0.25rem;
  color: var(--text-primary);
}

.login-subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0 0 2rem;
}

.google-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.8rem 1rem;
  border: 1px solid var(--surface-border);
  border-radius: 999px;
  background: var(--surface-card);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.google-btn:hover:not(:disabled) {
  background: var(--surface-hover);
}

.google-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.google-icon {
  width: 20px;
  height: 20px;
}

.login-error {
  margin-top: 1rem;
  font-size: 0.8125rem;
  color: var(--expense-color);
}
</style>
