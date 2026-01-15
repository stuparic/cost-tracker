import { ref } from 'vue';

export function useAutocomplete(apiMethod: (query: string) => Promise<{ suggestions: Array<{ value: string }> }>) {
  const suggestions = ref<string[]>([]);

  async function search(event: any) {
    try {
      const response = await apiMethod(event.query);
      suggestions.value = response.suggestions.map(s => s.value);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
      suggestions.value = [];
    }
  }

  return { suggestions, search };
}
