
export type AccountType = 'Checking' | 'Savings' | 'Credit' | 'Investment';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  note?: string;
  archived?: boolean;
  archivedDate?: string; // Track when the account was retired
  orderIndex?: number;
}

export interface InvestmentSnapshot {
  monthKey: string; // YYYY-MM
  accountId: string;
  balance: number;
}

export interface Classification {
  id: string;
  name: string;
  color: string;
  deleted?: boolean;
  orderIndex?: number;
}

export interface Category {
  id: string;
  name: string;
  classificationId: string;
  balance: number;
  monthlyBudget: number;
  goalAmount?: number;
  deleted?: boolean;
  orderIndex?: number;
}

export type TransactionType = 
  | 'Standard' 
  | 'Income' 
  | 'Interest' 
  | 'Category Transfer' 
  | 'Transfer to Savings' 
  | 'Transfer to Checking' 
  | 'Credit Payment' 
  | 'Transfer between Checking'
  | 'Account + Category Transfer'
  | 'Update Budget (Allocation)';

export interface Transaction {
  id: string;
  date: string;
  categoryId: string;
  accountId: string;
  amount: number;
  description: string;
  type: TransactionType;
  toCategoryId?: string;
  fromCategoryId?: string;
  toAccountId?: string;
  fromAccountId?: string;
  cleared?: boolean;
}

export interface AppState {
  accounts: Account[];
  classifications: Classification[];
  categories: Category[];
  transactions: Transaction[];
  investmentSnapshots: InvestmentSnapshot[];
  estimatedMonthlyIncome: number;
}
