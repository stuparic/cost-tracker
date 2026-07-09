import { createRouter, createWebHistory } from 'vue-router';

// Routes are lazy-loaded so each view (and heavy deps like chart.js)
// lands in its own chunk instead of one large bundle.
const routes = [
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

export default createRouter({
  history: createWebHistory(),
  routes
});
