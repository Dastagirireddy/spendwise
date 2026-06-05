import Database from '@tauri-apps/plugin-sql';
import { invoke } from '@tauri-apps/api/core';
import type { Category, ExpenseWithCategory, Budget, CategorySummary, DailySummary, FixedExpense, FixedExpenseStatus, Profile, SavingsGoal, MonthReport } from './types';

let dbPath: string | null = null;

async function getDbPath(): Promise<string> {
  if (!dbPath) {
    dbPath = await invoke<string>('db_path');
  }
  return dbPath;
}

let db: Database | null = null;

async function getDb(): Promise<Database> {
  if (!db) {
    const path = await getDbPath();
    db = await Database.load(path);
  }
  return db;
}

// ============ Profiles ============

let activeProfileId = 1;

export function getActiveProfileId(): number {
  return activeProfileId;
}

export function setActiveProfileId(id: number): void {
  activeProfileId = id;
}

export async function getProfiles(): Promise<Profile[]> {
  const database = await getDb();
  return await database.select<Profile[]>('SELECT * FROM profiles ORDER BY is_active DESC, name');
}

export async function addProfile(name: string): Promise<void> {
  const database = await getDb();
  await database.execute('INSERT INTO profiles (name, is_active) VALUES ($1, 0)', [name]);
}

export async function switchProfile(id: number): Promise<void> {
  const database = await getDb();
  await database.execute('UPDATE profiles SET is_active = 0');
  await database.execute('UPDATE profiles SET is_active = 1 WHERE id = $1', [id]);
  activeProfileId = id;
}

export async function deleteProfile(id: number): Promise<void> {
  const database = await getDb();
  if (id === 1) return; // Cannot delete default profile
  await database.execute('DELETE FROM profiles WHERE id = $1 AND id != 1', [id]);
}

// ============ Categories ============

export async function getCategories(): Promise<Category[]> {
  const database = await getDb();
  return await database.select<Category[]>('SELECT * FROM categories ORDER BY name');
}

export async function getExpenseCount(): Promise<number> {
  const database = await getDb();
  const result = await database.select<{ count: number }[]>('SELECT COUNT(*) as count FROM expenses');
  return result[0]?.count ?? 0;
}

export async function addCategory(name: string, icon: string, color: string): Promise<void> {
  const database = await getDb();
  await database.execute(
    'INSERT INTO categories (name, icon, color) VALUES ($1, $2, $3)',
    [name, icon, color]
  );
}

export async function deleteCategory(id: number): Promise<void> {
  const database = await getDb();
  const otherCat = await database.select<{ id: number }[]>(
    "SELECT id FROM categories WHERE name = 'Other' LIMIT 1"
  );
  const otherId = otherCat[0]?.id;
  if (otherId && otherId !== id) {
    await database.execute('UPDATE expenses SET category_id = $1 WHERE category_id = $2', [otherId, id]);
  }
  await database.execute('UPDATE fixed_expenses SET category_id = NULL WHERE category_id = $1', [id]);
  await database.execute('DELETE FROM categories WHERE id = $1', [id]);
}

// ============ Expenses ============

export async function getTodayExpenses(): Promise<ExpenseWithCategory[]> {
  const database = await getDb();
  return await database.select<ExpenseWithCategory[]>(
    `SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color
     FROM expenses e
     JOIN categories c ON e.category_id = c.id
     WHERE e.date = date('now') AND e.profile_id = $1
     ORDER BY e.created_at DESC`,
    [activeProfileId]
  );
}

export async function getExpensesByDate(date: string): Promise<ExpenseWithCategory[]> {
  const database = await getDb();
  return await database.select<ExpenseWithCategory[]>(
    `SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color
     FROM expenses e
     JOIN categories c ON e.category_id = c.id
     WHERE e.date = $1 AND e.profile_id = $2
     ORDER BY e.created_at DESC`,
    [date, activeProfileId]
  );
}

export async function addExpense(amount: number, description: string, categoryId: number, date: string, paymentType: string = 'cash'): Promise<void> {
  const database = await getDb();
  await database.execute(
    'INSERT INTO expenses (amount, description, category_id, date, payment_type, profile_id) VALUES ($1, $2, $3, $4, $5, $6)',
    [amount, description, categoryId, date, paymentType, activeProfileId]
  );
}

export async function deleteExpense(id: number): Promise<void> {
  const database = await getDb();
  await database.execute('DELETE FROM expenses WHERE id = $1', [id]);
}

export async function getTodayTotal(): Promise<number> {
  const database = await getDb();
  const result = await database.select<{ total: number }[]>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date = date('now') AND profile_id = $1",
    [activeProfileId]
  );
  return result[0]?.total ?? 0;
}

export async function getMonthTotal(month: string): Promise<number> {
  const database = await getDb();
  const result = await database.select<{ total: number }[]>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE strftime('%Y-%m', date) = $1 AND profile_id = $2",
    [month, activeProfileId]
  );
  return result[0]?.total ?? 0;
}

export async function getMonthCategorySummary(month: string): Promise<CategorySummary[]> {
  const database = await getDb();
  return await database.select<CategorySummary[]>(
    `SELECT
       e.category_id,
       c.name as category_name,
       c.icon as category_icon,
       c.color as category_color,
       COALESCE(SUM(e.amount), 0) as total,
       COUNT(e.id) as count
     FROM expenses e
     JOIN categories c ON e.category_id = c.id
     WHERE strftime('%Y-%m', e.date) = $1 AND e.profile_id = $2
     GROUP BY e.category_id
     ORDER BY total DESC`,
    [month, activeProfileId]
  );
}

export async function getDailySummary(month: string): Promise<DailySummary[]> {
  const database = await getDb();
  return await database.select<DailySummary[]>(
    `SELECT date, COALESCE(SUM(amount), 0) as total
     FROM expenses
     WHERE strftime('%Y-%m', date) = $1 AND profile_id = $2
     GROUP BY date
     ORDER BY date`,
    [month, activeProfileId]
  );
}

// ============ Budget ============

export async function getBudget(month: string): Promise<Budget | null> {
  const database = await getDb();
  const result = await database.select<Budget[]>(
    'SELECT * FROM budgets WHERE month = $1 AND profile_id = $2',
    [month, activeProfileId]
  );
  return result[0] ?? null;
}

export async function setBudget(month: string, amount: number): Promise<void> {
  const database = await getDb();
  await database.execute(
    'INSERT INTO budgets (month, amount, profile_id) VALUES ($1, $2, $3) ON CONFLICT(month, profile_id) DO UPDATE SET amount = $2',
    [month, amount, activeProfileId]
  );
}

export async function setIncome(month: string, income: number): Promise<void> {
  const database = await getDb();
  await database.execute(
    'INSERT INTO budgets (month, amount, income, profile_id) VALUES ($1, 0, $2, $3) ON CONFLICT(month, profile_id) DO UPDATE SET income = $2',
    [month, income, activeProfileId]
  );
}

// ============ Fixed Expenses ============

export async function getFixedExpenses(): Promise<FixedExpense[]> {
  const database = await getDb();
  return await database.select<FixedExpense[]>(
    'SELECT * FROM fixed_expenses WHERE is_active = 1 AND profile_id = $1 ORDER BY name',
    [activeProfileId]
  );
}

export async function getAllFixedExpenses(): Promise<FixedExpense[]> {
  const database = await getDb();
  return await database.select<FixedExpense[]>(
    'SELECT * FROM fixed_expenses WHERE profile_id = $1 ORDER BY is_active DESC, name',
    [activeProfileId]
  );
}

export async function addFixedExpense(name: string, amount: number, categoryId: number | null, paymentType: string = 'cash'): Promise<void> {
  const database = await getDb();
  await database.execute(
    'INSERT INTO fixed_expenses (name, amount, category_id, payment_type, profile_id) VALUES ($1, $2, $3, $4, $5)',
    [name, amount, categoryId, paymentType, activeProfileId]
  );
}

export async function updateFixedExpense(id: number, name: string, amount: number, categoryId: number | null): Promise<void> {
  const database = await getDb();
  await database.execute(
    'UPDATE fixed_expenses SET name = $1, amount = $2, category_id = $3 WHERE id = $4',
    [name, amount, categoryId, id]
  );
}

export async function toggleFixedExpenseActive(id: number, isActive: boolean): Promise<void> {
  const database = await getDb();
  await database.execute(
    'UPDATE fixed_expenses SET is_active = $1 WHERE id = $2',
    [isActive ? 1 : 0, id]
  );
}

export async function deleteFixedExpense(id: number): Promise<void> {
  const database = await getDb();
  await database.execute('DELETE FROM fixed_expenses WHERE id = $1', [id]);
}

export async function getFixedExpenseTotal(_month: string): Promise<number> {
  const database = await getDb();
  const result = await database.select<{ total: number }[]>(
    `SELECT COALESCE(SUM(fe.amount), 0) as total
     FROM fixed_expenses fe
     WHERE fe.is_active = 1 AND fe.profile_id = $1`,
    [activeProfileId]
  );
  return result[0]?.total ?? 0;
}

// ============ Fixed Expense Payments ============

export async function getFixedExpenseStatuses(month: string): Promise<FixedExpenseStatus[]> {
  const database = await getDb();
  return await database.select<FixedExpenseStatus[]>(
    `SELECT fe.*,
            c.name as category_name, c.icon as category_icon, c.color as category_color,
            fep.paid, fep.paid_at, fep.id as payment_id
     FROM fixed_expenses fe
     LEFT JOIN categories c ON fe.category_id = c.id
     LEFT JOIN fixed_expense_payments fep ON fe.id = fep.fixed_expense_id AND fep.month = $1
     WHERE fe.is_active = 1 AND fe.profile_id = $2
     ORDER BY fe.name`,
    [month, activeProfileId]
  );
}

export async function toggleFixedExpensePayment(fixedExpenseId: number, month: string, paid: boolean): Promise<void> {
  const database = await getDb();
  if (paid) {
    await database.execute(
      `INSERT INTO fixed_expense_payments (fixed_expense_id, month, paid, paid_at)
       VALUES ($1, $2, 1, datetime('now'))
       ON CONFLICT(fixed_expense_id, month) DO UPDATE SET paid = 1, paid_at = datetime('now')`,
      [fixedExpenseId, month]
    );
  } else {
    await database.execute(
      `UPDATE fixed_expense_payments SET paid = 0, paid_at = NULL
       WHERE fixed_expense_id = $1 AND month = $2`,
      [fixedExpenseId, month]
    );
  }
}

export async function getUnpaidFixedExpenseCount(month: string): Promise<number> {
  const database = await getDb();
  const result = await database.select<{ count: number }[]>(
    `SELECT COUNT(*) as count
     FROM fixed_expenses fe
     WHERE fe.is_active = 1 AND fe.profile_id = $1
       AND NOT EXISTS (
         SELECT 1 FROM fixed_expense_payments fep
         WHERE fep.fixed_expense_id = fe.id AND fep.month = $2 AND fep.paid = 1
       )`,
    [activeProfileId, month]
  );
  return result[0]?.count ?? 0;
}

// ============ Savings Goals ============

export async function getSavingsGoal(month: string): Promise<SavingsGoal | null> {
  const database = await getDb();
  const result = await database.select<SavingsGoal[]>(
    'SELECT * FROM savings_goals WHERE month = $1 AND profile_id = $2 LIMIT 1',
    [month, activeProfileId]
  );
  return result[0] ?? null;
}

export async function setSavingsGoal(name: string, targetAmount: number, month: string): Promise<void> {
  const database = await getDb();
  const existing = await getSavingsGoal(month);
  if (existing) {
    await database.execute(
      'UPDATE savings_goals SET name = $1, target_amount = $2 WHERE id = $3',
      [name, targetAmount, existing.id]
    );
  } else {
    await database.execute(
      'INSERT INTO savings_goals (name, target_amount, month, profile_id) VALUES ($1, $2, $3, $4)',
      [name, targetAmount, month, activeProfileId]
    );
  }
}

export async function updateSavingsProgress(month: string, currentAmount: number): Promise<void> {
  const existing = await getSavingsGoal(month);
  if (existing) {
    const database = await getDb();
    await database.execute(
      'UPDATE savings_goals SET current_amount = $1 WHERE id = $2',
      [currentAmount, existing.id]
    );
  }
}

// ============ Reports ============

export async function getMonthReport(month: string): Promise<MonthReport> {
  const budget = await getBudget(month);
  const monthTotal = await getMonthTotal(month);
  const fixedTotal = await getFixedExpenseTotal(month);
  const categorySummary = await getMonthCategorySummary(month);
  const dailySummary = await getDailySummary(month);
  const income = budget?.income ?? 0;
  const budgetAmount = budget?.amount ?? 0;
  const dynamicTotal = monthTotal;
  const saved = income - fixedTotal - dynamicTotal;

  return {
    month,
    income,
    budget: budgetAmount,
    totalSpent: monthTotal + fixedTotal,
    fixedTotal,
    dynamicTotal,
    saved,
    categories: categorySummary,
    daily: dailySummary,
  };
}

// ============ Seed Data (Development) ============

function randomDate(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const day = Math.floor(Math.random() * daysInMonth) + 1;
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function randomAmount(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

export async function seedTestData(): Promise<void> {
  const database = await getDb();

  await database.execute('DELETE FROM fixed_expense_payments', []);
  await database.execute('DELETE FROM fixed_expenses', []);
  await database.execute('DELETE FROM expenses', []);
  await database.execute('DELETE FROM budgets', []);
  await database.execute('DELETE FROM savings_goals', []);

  const months = ['2026-03', '2026-04', '2026-05', '2026-06'];

  const categories = await getCategories();
  const catMap = new Map(categories.map(c => [c.name, c.id]));
  const catIds = categories.map(c => c.id);

  const expenseTemplates = [
    { desc: 'Groceries', cat: 'Shopping', min: 15, max: 80 },
    { desc: 'Uber ride', cat: 'Transport', min: 5, max: 25 },
    { desc: 'Lunch out', cat: 'Food', min: 8, max: 20 },
    { desc: 'Coffee', cat: 'Food', min: 3, max: 7 },
    { desc: 'Netflix', cat: 'Entertainment', min: 10, max: 15 },
    { desc: 'Electric bill', cat: 'Bills', min: 40, max: 120 },
    { desc: 'Gas', cat: 'Transport', min: 30, max: 60 },
    { desc: 'Dinner', cat: 'Food', min: 15, max: 50 },
    { desc: 'Pharmacy', cat: 'Health', min: 10, max: 40 },
    { desc: 'Online course', cat: 'Education', min: 20, max: 100 },
    { desc: 'Movie tickets', cat: 'Entertainment', min: 12, max: 30 },
    { desc: 'New shirt', cat: 'Shopping', min: 20, max: 60 },
    { desc: 'Internet bill', cat: 'Bills', min: 30, max: 70 },
    { desc: 'Gym', cat: 'Health', min: 25, max: 50 },
    { desc: 'Pet food', cat: 'Other', min: 15, max: 40 },
    { desc: 'Phone case', cat: 'Shopping', min: 10, max: 30 },
    { desc: 'Bus pass', cat: 'Transport', min: 20, max: 50 },
    { desc: 'Takeout', cat: 'Food', min: 10, max: 35 },
    { desc: 'Book', cat: 'Education', min: 10, max: 25 },
    { desc: 'Haircut', cat: 'Other', min: 15, max: 35 },
  ];

  let inserted = 0;

  for (const month of months) {
    const count = 15 + Math.floor(Math.random() * 20);
    for (let i = 0; i < count; i++) {
      const tpl = expenseTemplates[Math.floor(Math.random() * expenseTemplates.length)];
      const catId = catMap.get(tpl.cat) ?? catIds[Math.floor(Math.random() * catIds.length)];
      const amount = randomAmount(tpl.min, tpl.max);
      const date = randomDate(month);
      await database.execute(
        'INSERT INTO expenses (amount, description, category_id, date, profile_id) VALUES ($1, $2, $3, $4, 1)',
        [amount, tpl.desc, catId, date]
      );
      inserted++;
    }

    await database.execute(
      'INSERT OR REPLACE INTO budgets (month, amount, income, profile_id) VALUES ($1, $2, $3, 1)',
      [month, randomAmount(800, 2500), randomAmount(3000, 7000)]
    );

    // Seed savings goal for current month
    if (month === '2026-06') {
      await database.execute(
        'INSERT OR IGNORE INTO savings_goals (name, target_amount, current_amount, month, profile_id) VALUES ($1, $2, $3, $4, 1)',
        ['Emergency Fund', 5000, randomAmount(1000, 3000), month]
      );
    }
  }

  const fixedItems = [
    { name: 'Rent', amount: 1200, cat: 'Other' },
    { name: 'Internet', amount: 60, cat: 'Bills' },
    { name: 'Phone plan', amount: 35, cat: 'Bills' },
    { name: 'Gym membership', amount: 40, cat: 'Health' },
    { name: 'Cloud storage', amount: 10, cat: 'Other' },
  ];

  const today = new Date().toISOString().slice(0, 10);
  const todayExpenses = [
    { desc: 'Morning coffee', cat: 'Food', min: 4, max: 7 },
    { desc: 'Breakfast burrito', cat: 'Food', min: 8, max: 14 },
    { desc: 'Uber to work', cat: 'Transport', min: 8, max: 18 },
    { desc: 'Lunch salad', cat: 'Food', min: 10, max: 18 },
    { desc: 'Snacks', cat: 'Food', min: 3, max: 8 },
    { desc: 'Gas station', cat: 'Transport', min: 25, max: 50 },
  ];

  for (const tpl of todayExpenses) {
    const catId = catMap.get(tpl.cat) ?? catIds[Math.floor(Math.random() * catIds.length)];
    const amount = randomAmount(tpl.min, tpl.max);
    await database.execute(
      'INSERT INTO expenses (amount, description, category_id, date, profile_id) VALUES ($1, $2, $3, $4, 1)',
      [amount, tpl.desc, catId, today]
    );
    inserted++;
  }

  for (const item of fixedItems) {
    const catId = catMap.get(item.cat) ?? null;
    await database.execute(
      'INSERT INTO fixed_expenses (name, amount, category_id, profile_id) VALUES ($1, $2, $3, 1)',
      [item.name, item.amount, catId]
    );
  }

  console.log(`Seeded ${inserted} expenses, ${months.length} budgets, ${fixedItems.length} fixed expenses`);
}
