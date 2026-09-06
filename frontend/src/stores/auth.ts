import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type User } from 'firebase/auth';
import { firebaseAuth, googleProvider } from '@/firebase';
import { meApi, type MeResponse } from '@/api/me';
import { clearActivity } from '@/auth/session-timeout';

/**
 * Google sign-in state + the backend profile/household bootstrap.
 * `ready` resolves once Firebase restores (or rejects) the persisted session,
 * so the router can wait before deciding between /login and the app.
 */
export const useAuthStore = defineStore('auth', () => {
  const firebaseUser = ref<User | null>(null);
  const me = ref<MeResponse | null>(null);
  const initializing = ref(true);
  const signingIn = ref(false);
  const profileError = ref<string | null>(null);

  let readyResolve: () => void;
  const ready = new Promise<void>(resolve => {
    readyResolve = resolve;
  });

  const isAuthenticated = computed(() => firebaseUser.value !== null);
  const household = computed(() => me.value?.household ?? null);
  const profile = computed(() => me.value?.user ?? null);

  onAuthStateChanged(firebaseAuth, async user => {
    firebaseUser.value = user;
    if (user) {
      // Deliberately does NOT stamp activity here: this fires on every app
      // start when Firebase restores the session, so stamping would reset the
      // idle clock on each reload and the session would never expire. The
      // clock is owned by the request interceptor - the `/me` call below is
      // itself the first authenticated request.
      await loadProfile();
    } else {
      me.value = null;
    }
    initializing.value = false;
    readyResolve();
  });

  async function loadProfile() {
    profileError.value = null;
    try {
      me.value = await meApi.me();
    } catch (error) {
      console.error('Failed to load profile:', error);
      profileError.value = 'Ne mogu da učitam profil';
    }
  }

  async function signInWithGoogle() {
    signingIn.value = true;
    try {
      await signInWithPopup(firebaseAuth, googleProvider);
    } catch (error: unknown) {
      // Popups are often blocked in PWAs - fall back to a full redirect
      const code = (error as { code?: string })?.code ?? '';
      if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        if (code === 'auth/popup-blocked') {
          await signInWithRedirect(firebaseAuth, googleProvider);
          return;
        }
      } else {
        throw error;
      }
    } finally {
      signingIn.value = false;
    }
  }

  async function signOutUser() {
    clearActivity();
    await signOut(firebaseAuth);
    me.value = null;
  }

  function applyMe(response: MeResponse) {
    me.value = response;
  }

  return {
    firebaseUser,
    me,
    profile,
    household,
    initializing,
    signingIn,
    profileError,
    isAuthenticated,
    ready,
    loadProfile,
    applyMe,
    signInWithGoogle,
    signOutUser
  };
});
