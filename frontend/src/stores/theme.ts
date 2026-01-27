import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export type AccentColor = 'green' | 'purple' | 'blue';

export const useThemeStore = defineStore('theme', () => {
  // Load from localStorage or use defaults
  const currentAccent = ref<AccentColor>((localStorage.getItem('accent') as AccentColor) || 'green');
  const isDarkMode = ref<boolean>(localStorage.getItem('darkMode') === 'true');

  // Apply accent to document root
  function applyAccent(accent: AccentColor) {
    document.documentElement.setAttribute('data-accent', accent);
  }

  // Apply dark mode to document root
  function applyDarkMode(dark: boolean) {
    if (dark) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }

  // Set accent color
  function setAccent(accent: AccentColor) {
    currentAccent.value = accent;
    localStorage.setItem('accent', accent);
    applyAccent(accent);
  }

  // Toggle dark mode
  function toggleDarkMode() {
    isDarkMode.value = !isDarkMode.value;
    localStorage.setItem('darkMode', String(isDarkMode.value));
    applyDarkMode(isDarkMode.value);
  }

  // Set dark mode explicitly
  function setDarkMode(dark: boolean) {
    isDarkMode.value = dark;
    localStorage.setItem('darkMode', String(dark));
    applyDarkMode(dark);
  }

  // Watch for accent changes
  watch(
    currentAccent,
    newAccent => {
      applyAccent(newAccent);
    },
    { immediate: true }
  );

  // Watch for dark mode changes
  watch(
    isDarkMode,
    newDarkMode => {
      applyDarkMode(newDarkMode);
    },
    { immediate: true }
  );

  return {
    currentAccent,
    isDarkMode,
    setAccent,
    toggleDarkMode,
    setDarkMode
  };
});
