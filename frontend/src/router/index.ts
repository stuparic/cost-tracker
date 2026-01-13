import { createRouter, createWebHistory } from 'vue-router';
import ExpenseForm from '@/components/expense-form/ExpenseForm.vue';
import ExpenseList from '@/components/ExpenseList.vue';
import IncomeForm from '@/components/income-form/IncomeForm.vue';
import IncomeList from '@/components/IncomeList.vue';

const routes = [
  {
    path: '/',
    redirect: '/add'
  },
  {
    path: '/add',
    name: 'AddExpense',
    component: ExpenseForm
  },
  {
    path: '/list',
    name: 'ExpenseList',
    component: ExpenseList
  },
  {
    path: '/income/add',
    name: 'AddIncome',
    component: IncomeForm
  },
  {
    path: '/income/list',
    name: 'IncomeList',
    component: IncomeList
  }
];

export default createRouter({
  history: createWebHistory(),
  routes
});
