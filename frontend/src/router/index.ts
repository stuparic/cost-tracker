import { createRouter, createWebHistory } from 'vue-router';
import ExpenseForm from '@/components/expense-form/ExpenseForm.vue';
import ExpenseList from '@/components/ExpenseList.vue';

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
  }
];

export default createRouter({
  history: createWebHistory(),
  routes
});
