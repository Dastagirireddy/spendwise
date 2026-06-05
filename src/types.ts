export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
}

export interface Expense {
  id: number;
  amount: number;
  description: string;
  category_id: number;
  date: string;
  payment_type: string;
  created_at: string;
}

export interface ExpenseWithCategory extends Expense {
  category_name: string;
  category_icon: string;
  category_color: string;
}

export interface Budget {
  id: number;
  month: string;
  amount: number;
  income: number;
}

export interface CategorySummary {
  category_id: number;
  category_name: string;
  category_icon: string;
  category_color: string;
  total: number;
  count: number;
}

export interface DailySummary {
  date: string;
  total: number;
}

export interface FixedExpense {
  id: number;
  name: string;
  amount: number;
  category_id: number | null;
  is_active: number;
  created_at: string;
}

export interface FixedExpenseWithCategory extends FixedExpense {
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
}

export interface FixedExpensePayment {
  id: number;
  fixed_expense_id: number;
  month: string;
  paid: number;
  paid_at: string | null;
}

export interface FixedExpenseStatus extends FixedExpenseWithCategory {
  paid: number;
  paid_at: string | null;
  payment_id: number | null;
}

export type View = 'dashboard' | 'settings' | 'reports';

export interface Profile {
  id: number;
  name: string;
  is_active: number;
  created_at: string;
}

export interface SavingsGoal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  month: string;
  profile_id: number;
  created_at: string;
}

export interface MonthReport {
  month: string;
  income: number;
  budget: number;
  totalSpent: number;
  fixedTotal: number;
  dynamicTotal: number;
  saved: number;
  categories: CategorySummary[];
  daily: DailySummary[];
}
