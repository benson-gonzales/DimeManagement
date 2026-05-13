
import { AppState, Transaction } from './types';

// Helper to generate IDs
const gid = () => Math.random().toString(36).substr(2, 5);

export const INITIAL_DATA: AppState = {
  estimatedMonthlyIncome: 0,
  classifications: [
    { id: 'class-income', name: 'Income', color: 'bg-cyan-50' },
    { id: 'class-church', name: 'Church', color: 'bg-sky-100' },
    { id: 'class-living', name: 'Living Expenses', color: 'bg-green-100' },
    { id: 'class-other', name: 'Other Expenses', color: 'bg-yellow-100' },
    { id: 'class-fun', name: 'Fun Stuff', color: 'bg-blue-50' },
    { id: 'class-savings', name: 'Savings', color: 'bg-emerald-100' },
    { id: 'class-transfers', name: 'Transfers', color: 'bg-slate-100' },
  ],
  categories: [
    { id: 'cat-paycheck', name: 'Paycheck/Salary', classificationId: 'class-income', balance: 0, monthlyBudget: 0 },
    { id: 'cat-bonus', name: 'Bonus/Other', classificationId: 'class-income', balance: 0, monthlyBudget: 0 },
    { id: 'cat-tithing', name: 'Tithing', classificationId: 'class-church', balance: 0, monthlyBudget: 0 },
    { id: 'cat-rent', name: 'Rent/Mortgage', classificationId: 'class-living', balance: 0, monthlyBudget: 0 },
    { id: 'cat-groceries', name: 'Groceries', classificationId: 'class-living', balance: 0, monthlyBudget: 0 },
    { id: 'cat-utilities', name: 'Utilities', classificationId: 'class-living', balance: 0, monthlyBudget: 0 },
    { id: 'cat-gas', name: 'Gas/Transportation', classificationId: 'class-other', balance: 0, monthlyBudget: 0 },
    { id: 'cat-household', name: 'Household Items', classificationId: 'class-other', balance: 0, monthlyBudget: 0 },
    { id: 'cat-dining', name: 'Dining Out', classificationId: 'class-fun', balance: 0, monthlyBudget: 0 },
    { id: 'cat-entertainment', name: 'Entertainment', classificationId: 'class-fun', balance: 0, monthlyBudget: 0 },
    { id: 'cat-emergency', name: 'Emergency Fund', classificationId: 'class-savings', balance: 0, monthlyBudget: 0 },
    { id: 'cat-longterm', name: 'Long-term Savings', classificationId: 'class-savings', balance: 0, monthlyBudget: 0 },
    { id: 'cat-credit-payment', name: 'Credit Payment', classificationId: 'class-transfers', balance: 0, monthlyBudget: 0 },
  ],
  accounts: [],
  transactions: [],
  investmentSnapshots: [],
};

export const TRANSFER_TYPES = [
  'Update Budget (Allocation)',
  'Category Transfer',
  'Transfer to Savings',
  'Transfer to Checking',
  'Credit Payment',
  'Transfer between Checking',
  'Account + Category Transfer'
] as const;
