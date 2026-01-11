import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export type Theme = 'green' | 'purple';

export const useThemeStore = defineStore('theme', () => {
  // Load theme from localStorage or default to green
  const currentTheme = ref<Theme>(
    (localStorage.getItem('theme') as Theme) || 'green'
  );

  // Apply theme to document root
  function applyTheme(theme: Theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  // Set theme
  function setTheme(theme: Theme) {
    currentTheme.value = theme;
    localStorage.setItem('theme', theme);
    applyTheme(theme);
  }

  // Watch for theme changes
  watch(currentTheme, (newTheme) => {
    applyTheme(newTheme);
  }, { immediate: true });

  return {
    currentTheme,
    setTheme,
  };
});