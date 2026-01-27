import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useThemeStore } from './theme';

export type User = 'svetla' | 'dejan';

export const useUserStore = defineStore('user', () => {
  // Load user from localStorage (null if not set)
  const selectedUser = ref<User | null>(localStorage.getItem('user') as User | null);

  // Map users to themes
  const userThemeMap: Record<User, 'purple' | 'green'> = {
    svetla: 'purple',
    dejan: 'green'
  };

  // Set user and apply corresponding accent
  function setUser(user: User) {
    selectedUser.value = user;
    localStorage.setItem('user', user);

    // Automatically set the corresponding accent color
    const themeStore = useThemeStore();
    themeStore.setAccent(userThemeMap[user]);
  }

  return {
    selectedUser,
    setUser,
    userThemeMap
  };
});
