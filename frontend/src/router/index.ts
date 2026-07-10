import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

// Routes are lazy-loaded so each view (and heavy deps like chart.js)
// lands in its own chunk instead of one large bundle.
const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/components/LoginView.vue')
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('@/components/HomeView.vue')
  },
  {
    path: '/add',
    name: 'AddExpense',
    component: () => import('@/components/expense-form/ExpenseForm.vue')
  },
  {
    path: '/list',
    name: 'ExpenseList',
    component: () => import('@/components/ExpenseList.vue')
  },
  {
    path: '/balance',
    name: 'Balance',
    component: () => import('@/components/BalanceView.vue')
  },
  {
    path: '/income/add',
    name: 'AddIncome',
    component: () => import('@/components/income-form/IncomeForm.vue')
  },
  {
    path: '/income/list',
    name: 'IncomeList',
    component: () => import('@/components/IncomeList.vue')
  },
  {
    path: '/drafts',
    name: 'ExpenseDrafts',
    component: () => import('@/components/DraftsView.vue')
  },
  {
    path: '/recurring',
    name: 'RecurringOccurrences',
    component: () => import('@/components/RecurringOccurrencesList.vue')
  },
  {
    path: '/import',
    name: 'StatementImport',
    component: () => import('@/components/StatementImport.vue')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Auth gate: wait for Firebase to restore the session, then route accordingly
router.beforeEach(async to => {
  const authStore = useAuthStore();
  await authStore.ready;

  if (!authStore.isAuthenticated && to.path !== '/login') {
    return '/login';
  }
  if (authStore.isAuthenticated && to.path === '/login') {
    return '/';
  }
  return true;
});

export default router;
