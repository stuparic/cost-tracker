// Shared visual identity for expense categories (icons + mid-tone colors
// readable on both light and dark surfaces; bg = same hex at ~13% alpha)

export const CATEGORY_ICONS: Record<string, string> = {
  Groceries: 'pi pi-shopping-cart',
  Home: 'pi pi-home',
  Transport: 'pi pi-car',
  Health: 'pi pi-heart',
  Electronics: 'pi pi-desktop',
  Dining: 'pi pi-shopping-bag',
  Clothing: 'pi pi-tag',
  Entertainment: 'pi pi-ticket',
  Utilities: 'pi pi-bolt',
  CarLoan: 'pi pi-key',
  HomeLoan: 'pi pi-building',
  Travel: 'pi pi-globe',
  Work: 'pi pi-briefcase',
  Transfers: 'pi pi-send',
  Charity: 'pi pi-heart-fill',
  Other: 'pi pi-circle'
};

export const CATEGORY_COLORS: Record<string, string> = {
  Groceries: '#0f9d6e',
  Home: '#5b45d6',
  Transport: '#2f6fe4',
  Health: '#c23a6f',
  Electronics: '#8a63d2',
  Dining: '#d1743a',
  Clothing: '#c2589c',
  Entertainment: '#e0a72e',
  Utilities: '#4a94d8',
  CarLoan: '#185fa5',
  HomeLoan: '#7a51c9',
  Travel: '#1d9e75',
  Work: '#5f5e5a',
  Transfers: '#993c1d',
  Charity: '#d4537e',
  Other: '#6a6a82'
};

export function categoryIcon(category: string): string {
  return CATEGORY_ICONS[category] ?? CATEGORY_ICONS.Other!;
}

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Other!;
}
