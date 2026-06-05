import { invoke } from '@tauri-apps/api/core';
import type { Category, ExpenseWithCategory, Budget, CategorySummary, DailySummary, FixedExpense, FixedExpenseStatus, Profile, SavingsGoal, MonthReport } from './types';

// ============ Active Profile (client-side state) ============

let activeProfileId = 1;

export function getActiveProfileId(): number {
  return activeProfileId;
}

export function setActiveProfileId(id: number): void {
  activeProfileId = id;
}

// ============ Profiles ============

export async function getProfiles(): Promise<Profile[]> {
  return await invoke<Profile[]>('get_profiles');
}

export async function addProfile(name: string): Promise<void> {
  await invoke('add_profile', { name });
}

export async function switchProfile(id: number): Promise<void> {
  await invoke('switch_profile', { id });
  activeProfileId = id;
}

export async function deleteProfile(id: number): Promise<void> {
  await invoke('delete_profile', { id });
}

// ============ Categories ============

export async function getCategories(): Promise<Category[]> {
  return await invoke<Category[]>('get_categories');
}

export async function getExpenseCount(): Promise<number> {
  return await invoke<number>('get_expense_count');
}

export async function addCategory(name: string, icon: string, color: string): Promise<void> {
  await invoke('add_category', { name, icon, color });
}

export async function deleteCategory(id: number): Promise<void> {
  await invoke('delete_category', { id });
}

// ============ Expenses ============

export async function getTodayExpenses(): Promise<ExpenseWithCategory[]> {
  return await invoke<ExpenseWithCategory[]>('get_today_expenses', { profileId: activeProfileId });
}

export async function getExpensesByDate(date: string): Promise<ExpenseWithCategory[]> {
  return await invoke<ExpenseWithCategory[]>('get_expenses_by_date', { date, profileId: activeProfileId });
}

export async function addExpense(amount: number, description: string, categoryId: number, date: string, paymentType: string = 'cash'): Promise<void> {
  await invoke('add_expense', { amount, description, categoryId, date, paymentType, profileId: activeProfileId });
}

export async function deleteExpense(id: number): Promise<void> {
  await invoke('delete_expense', { id });
}

export async function getTodayTotal(): Promise<number> {
  return await invoke<number>('get_today_total', { profileId: activeProfileId });
}

export async function getMonthTotal(month: string): Promise<number> {
  return await invoke<number>('get_month_total', { month, profileId: activeProfileId });
}

export async function getMonthCategorySummary(month: string): Promise<CategorySummary[]> {
  return await invoke<CategorySummary[]>('get_month_category_summary', { month, profileId: activeProfileId });
}

export async function getDailySummary(month: string): Promise<DailySummary[]> {
  return await invoke<DailySummary[]>('get_daily_summary', { month, profileId: activeProfileId });
}

// ============ Budget ============

export async function getBudget(month: string): Promise<Budget | null> {
  return await invoke<Budget | null>('get_budget', { month, profileId: activeProfileId });
}

export async function setBudget(month: string, amount: number): Promise<void> {
  await invoke('set_budget', { month, amount, profileId: activeProfileId });
}

export async function setIncome(month: string, income: number): Promise<void> {
  await invoke('set_income', { month, income, profileId: activeProfileId });
}

// ============ Fixed Expenses ============

export async function getFixedExpenses(): Promise<FixedExpense[]> {
  return await invoke<FixedExpense[]>('get_fixed_expenses', { profileId: activeProfileId });
}

export async function getAllFixedExpenses(): Promise<FixedExpense[]> {
  return await invoke<FixedExpense[]>('get_all_fixed_expenses', { profileId: activeProfileId });
}

export async function addFixedExpense(name: string, amount: number, categoryId: number | null, paymentType: string = 'cash'): Promise<void> {
  await invoke('add_fixed_expense', { name, amount, categoryId, paymentType, profileId: activeProfileId });
}

export async function updateFixedExpense(id: number, name: string, amount: number, categoryId: number | null): Promise<void> {
  await invoke('update_fixed_expense', { id, name, amount, categoryId });
}

export async function toggleFixedExpenseActive(id: number, isActive: boolean): Promise<void> {
  await invoke('toggle_fixed_expense_active', { id, isActive });
}

export async function deleteFixedExpense(id: number): Promise<void> {
  await invoke('delete_fixed_expense', { id });
}

export async function getFixedExpenseTotal(_month: string): Promise<number> {
  return await invoke<number>('get_fixed_expense_total', { month: _month, profileId: activeProfileId });
}

export async function getFixedExpenseStatuses(month: string): Promise<FixedExpenseStatus[]> {
  return await invoke<FixedExpenseStatus[]>('get_fixed_expense_statuses', { month, profileId: activeProfileId });
}

export async function toggleFixedExpensePayment(fixedExpenseId: number, month: string, paid: boolean): Promise<void> {
  await invoke('toggle_fixed_expense_payment', { fixedExpenseId, month, paid });
}

export async function getUnpaidFixedExpenseCount(month: string): Promise<number> {
  return await invoke<number>('get_unpaid_fixed_expense_count', { month, profileId: activeProfileId });
}

// ============ Savings Goals ============

export async function getSavingsGoal(month: string): Promise<SavingsGoal | null> {
  return await invoke<SavingsGoal | null>('get_savings_goal', { month, profileId: activeProfileId });
}

export async function setSavingsGoal(name: string, targetAmount: number, month: string): Promise<void> {
  await invoke('set_savings_goal', { name, targetAmount, month, profileId: activeProfileId });
}

export async function updateSavingsProgress(month: string, currentAmount: number): Promise<void> {
  await invoke('update_savings_progress', { month, currentAmount, profileId: activeProfileId });
}

// ============ Reports ============

export async function getMonthReport(month: string): Promise<MonthReport> {
  return await invoke<MonthReport>('get_month_report', { month, profileId: activeProfileId });
}

// ============ Seed Data ============

export async function seedTestData(): Promise<void> {
  await invoke('seed_test_data');
}
