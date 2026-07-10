import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';

/**
 * The signed-in household member, derived from the Google profile.
 * Replaces the old manual user picker: `firstName` feeds the legacy
 * createdBy field until data fully migrates to uids.
 */
export function useCurrentMember() {
  const authStore = useAuthStore();

  const firstName = computed(() => {
    const name = authStore.profile?.displayName || 'Korisnik';
    return name.split(' ')[0] || name;
  });

  const uid = computed(() => authStore.profile?.uid ?? null);

  return { firstName, uid };
}
