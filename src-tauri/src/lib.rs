use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

struct DbConn {
    conn: Mutex<rusqlite::Connection>,
}

fn get_db_path() -> String {
    let home = std::env::var("HOME").expect("HOME not set");
    let dir = std::path::PathBuf::from(&home)
        .join("Library/Application Support/com.expense-tracker.app");
    std::fs::create_dir_all(&dir).ok();
    dir.join("expense-tracker.db")
        .to_string_lossy()
        .to_string()
}

fn init_db(conn: &rusqlite::Connection) {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            icon TEXT NOT NULL DEFAULT 'lucide:package',
            color TEXT NOT NULL DEFAULT '#a8e6cf'
        );
        CREATE TABLE IF NOT EXISTS profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            amount REAL NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            category_id INTEGER NOT NULL REFERENCES categories(id),
            date TEXT NOT NULL DEFAULT (date('now')),
            payment_type TEXT NOT NULL DEFAULT 'cash',
            profile_id INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            month TEXT NOT NULL,
            amount REAL NOT NULL DEFAULT 0,
            income REAL NOT NULL DEFAULT 0,
            profile_id INTEGER NOT NULL DEFAULT 1,
            UNIQUE(month, profile_id)
        );
        CREATE TABLE IF NOT EXISTS fixed_expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            amount REAL NOT NULL,
            category_id INTEGER REFERENCES categories(id),
            payment_type TEXT NOT NULL DEFAULT 'cash',
            is_active INTEGER NOT NULL DEFAULT 1,
            profile_id INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS fixed_expense_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fixed_expense_id INTEGER NOT NULL REFERENCES fixed_expenses(id) ON DELETE CASCADE,
            month TEXT NOT NULL,
            paid INTEGER NOT NULL DEFAULT 0,
            payment_type TEXT NOT NULL DEFAULT 'cash',
            paid_at TEXT,
            UNIQUE(fixed_expense_id, month)
        );
        CREATE TABLE IF NOT EXISTS savings_goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            target_amount REAL NOT NULL,
            current_amount REAL NOT NULL DEFAULT 0,
            month TEXT NOT NULL,
            profile_id INTEGER NOT NULL DEFAULT 1 REFERENCES profiles(id),
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT OR IGNORE INTO profiles (id, name) VALUES (1, 'Personal');
        INSERT OR IGNORE INTO categories (name, icon, color) VALUES
            ('Food', 'lucide:utensils', '#D84C2A'),
            ('Transport', 'lucide:car', '#1A6B4A'),
            ('Shopping', 'lucide:shopping-bag', '#C97B1A'),
            ('Bills', 'lucide:file-text', '#5C3AB7'),
            ('Entertainment', 'lucide:gamepad-2', '#D84C2A'),
            ('Health', 'lucide:pill', '#1A6B4A'),
            ('Education', 'lucide:book-open', '#C97B1A'),
            ('Other', 'lucide:package', '#9C9890');",
    )
    .expect("failed to init db");
}

// ========== Types ==========

#[derive(Serialize, Deserialize)]
struct Profile {
    id: i64,
    name: String,
    is_active: i64,
    created_at: String,
}

#[derive(Serialize, Deserialize)]
struct Category {
    id: i64,
    name: String,
    icon: String,
    color: String,
}

#[derive(Serialize, Deserialize)]
struct ExpenseWithCategory {
    id: i64,
    amount: f64,
    description: String,
    category_id: i64,
    date: String,
    payment_type: String,
    profile_id: i64,
    created_at: String,
    category_name: String,
    category_icon: String,
    category_color: String,
}

#[derive(Serialize, Deserialize)]
struct Budget {
    id: i64,
    month: String,
    amount: f64,
    income: f64,
    profile_id: i64,
}

#[derive(Serialize, Deserialize)]
struct CategorySummary {
    category_id: i64,
    category_name: String,
    category_icon: String,
    category_color: String,
    total: f64,
    count: i64,
}

#[derive(Serialize, Deserialize)]
struct DailySummary {
    date: String,
    total: f64,
}

#[derive(Serialize, Deserialize)]
struct FixedExpense {
    id: i64,
    name: String,
    amount: f64,
    category_id: Option<i64>,
    payment_type: String,
    is_active: i64,
    profile_id: i64,
    created_at: String,
}

#[derive(Serialize, Deserialize)]
struct FixedExpenseStatus {
    id: i64,
    name: String,
    amount: f64,
    category_id: Option<i64>,
    payment_type: String,
    is_active: i64,
    profile_id: i64,
    created_at: String,
    category_name: Option<String>,
    category_icon: Option<String>,
    category_color: Option<String>,
    paid: Option<i64>,
    paid_at: Option<String>,
    payment_id: Option<i64>,
}

#[derive(Serialize, Deserialize)]
struct SavingsGoal {
    id: i64,
    name: String,
    target_amount: f64,
    current_amount: f64,
    month: String,
    profile_id: i64,
    created_at: String,
}

#[derive(Serialize, Deserialize)]
struct MonthReport {
    month: String,
    income: f64,
    budget: f64,
    total_spent: f64,
    fixed_total: f64,
    dynamic_total: f64,
    saved: f64,
    categories: Vec<CategorySummary>,
    daily: Vec<DailySummary>,
}

// ========== Profile Commands ==========

#[tauri::command]
fn get_profiles(state: State<'_, DbConn>) -> Result<Vec<Profile>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, is_active, created_at FROM profiles ORDER BY is_active DESC, name")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Profile {
                id: row.get(0)?,
                name: row.get(1)?,
                is_active: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn add_profile(state: State<'_, DbConn>, name: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO profiles (name, is_active) VALUES (?1, 0)",
        [&name],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn switch_profile(state: State<'_, DbConn>, id: i64) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE profiles SET is_active = 0", [])
        .map_err(|e| e.to_string())?;
    conn.execute("UPDATE profiles SET is_active = 1 WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_profile(state: State<'_, DbConn>, id: i64) -> Result<(), String> {
    if id == 1 {
        return Ok(());
    }
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM profiles WHERE id = ?1 AND id != 1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ========== Category Commands ==========

#[tauri::command]
fn get_categories(state: State<'_, DbConn>) -> Result<Vec<Category>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, icon, color FROM categories ORDER BY name")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Category {
                id: row.get(0)?,
                name: row.get(1)?,
                icon: row.get(2)?,
                color: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_expense_count(state: State<'_, DbConn>) -> Result<i64, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.query_row("SELECT COUNT(*) FROM expenses", [], |row| row.get(0))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn add_category(
    state: State<'_, DbConn>,
    name: String,
    icon: String,
    color: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO categories (name, icon, color) VALUES (?1, ?2, ?3)",
        rusqlite::params![name, icon, color],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_category(state: State<'_, DbConn>, id: i64) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let other_id: Option<i64> = conn
        .query_row(
            "SELECT id FROM categories WHERE name = 'Other' LIMIT 1",
            [],
            |row| row.get(0),
        )
        .ok();
    if let Some(oid) = other_id {
        if oid != id {
            conn.execute(
                "UPDATE expenses SET category_id = ?1 WHERE category_id = ?2",
                rusqlite::params![oid, id],
            )
            .map_err(|e| e.to_string())?;
        }
    }
    conn.execute(
        "UPDATE fixed_expenses SET category_id = NULL WHERE category_id = ?1",
        [id],
    )
    .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM categories WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ========== Expense Commands ==========

#[tauri::command]
fn get_today_expenses(
    state: State<'_, DbConn>,
    profile_id: i64,
) -> Result<Vec<ExpenseWithCategory>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT e.id, e.amount, e.description, e.category_id, e.date, e.payment_type, e.profile_id, e.created_at,
                    c.name, c.icon, c.color
             FROM expenses e
             JOIN categories c ON e.category_id = c.id
             WHERE e.date = date('now') AND e.profile_id = ?1
             ORDER BY e.created_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([profile_id], |row| {
            Ok(ExpenseWithCategory {
                id: row.get(0)?,
                amount: row.get(1)?,
                description: row.get(2)?,
                category_id: row.get(3)?,
                date: row.get(4)?,
                payment_type: row.get(5)?,
                profile_id: row.get(6)?,
                created_at: row.get(7)?,
                category_name: row.get(8)?,
                category_icon: row.get(9)?,
                category_color: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_expenses_by_date(
    state: State<'_, DbConn>,
    date: String,
    profile_id: i64,
) -> Result<Vec<ExpenseWithCategory>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT e.id, e.amount, e.description, e.category_id, e.date, e.payment_type, e.profile_id, e.created_at,
                    c.name, c.icon, c.color
             FROM expenses e
             JOIN categories c ON e.category_id = c.id
             WHERE e.date = ?1 AND e.profile_id = ?2
             ORDER BY e.created_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params![date, profile_id], |row| {
            Ok(ExpenseWithCategory {
                id: row.get(0)?,
                amount: row.get(1)?,
                description: row.get(2)?,
                category_id: row.get(3)?,
                date: row.get(4)?,
                payment_type: row.get(5)?,
                profile_id: row.get(6)?,
                created_at: row.get(7)?,
                category_name: row.get(8)?,
                category_icon: row.get(9)?,
                category_color: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn add_expense(
    state: State<'_, DbConn>,
    amount: f64,
    description: String,
    category_id: i64,
    date: String,
    payment_type: String,
    profile_id: i64,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO expenses (amount, description, category_id, date, payment_type, profile_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![amount, description, category_id, date, payment_type, profile_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_expense(state: State<'_, DbConn>, id: i64) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM expenses WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_today_total(state: State<'_, DbConn>, profile_id: i64) -> Result<f64, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE date = date('now') AND profile_id = ?1",
        [profile_id],
        |row| row.get(0),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_month_total(state: State<'_, DbConn>, month: String, profile_id: i64) -> Result<f64, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE strftime('%Y-%m', date) = ?1 AND profile_id = ?2",
        rusqlite::params![month, profile_id],
        |row| row.get(0),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_month_category_summary(
    state: State<'_, DbConn>,
    month: String,
    profile_id: i64,
) -> Result<Vec<CategorySummary>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT e.category_id, c.name, c.icon, c.color,
                    COALESCE(SUM(e.amount), 0), COUNT(e.id)
             FROM expenses e
             JOIN categories c ON e.category_id = c.id
             WHERE strftime('%Y-%m', e.date) = ?1 AND e.profile_id = ?2
             GROUP BY e.category_id
             ORDER BY SUM(e.amount) DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params![month, profile_id], |row| {
            Ok(CategorySummary {
                category_id: row.get(0)?,
                category_name: row.get(1)?,
                category_icon: row.get(2)?,
                category_color: row.get(3)?,
                total: row.get(4)?,
                count: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_daily_summary(
    state: State<'_, DbConn>,
    month: String,
    profile_id: i64,
) -> Result<Vec<DailySummary>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT date, COALESCE(SUM(amount), 0)
             FROM expenses
             WHERE strftime('%Y-%m', date) = ?1 AND profile_id = ?2
             GROUP BY date
             ORDER BY date",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params![month, profile_id], |row| {
            Ok(DailySummary {
                date: row.get(0)?,
                total: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

// ========== Budget Commands ==========

#[tauri::command]
fn get_budget(
    state: State<'_, DbConn>,
    month: String,
    profile_id: i64,
) -> Result<Option<Budget>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let result = conn.query_row(
        "SELECT id, month, amount, income, profile_id FROM budgets WHERE month = ?1 AND profile_id = ?2",
        rusqlite::params![month, profile_id],
        |row| {
            Ok(Budget {
                id: row.get(0)?,
                month: row.get(1)?,
                amount: row.get(2)?,
                income: row.get(3)?,
                profile_id: row.get(4)?,
            })
        },
    );
    match result {
        Ok(b) => Ok(Some(b)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn set_budget(
    state: State<'_, DbConn>,
    month: String,
    amount: f64,
    profile_id: i64,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO budgets (month, amount, profile_id) VALUES (?1, ?2, ?3)
         ON CONFLICT(month, profile_id) DO UPDATE SET amount = ?2",
        rusqlite::params![month, amount, profile_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn set_income(
    state: State<'_, DbConn>,
    month: String,
    income: f64,
    profile_id: i64,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO budgets (month, amount, income, profile_id) VALUES (?1, 0, ?2, ?3)
         ON CONFLICT(month, profile_id) DO UPDATE SET income = ?2",
        rusqlite::params![month, income, profile_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ========== Fixed Expense Commands ==========

#[tauri::command]
fn get_fixed_expenses(
    state: State<'_, DbConn>,
    profile_id: i64,
) -> Result<Vec<FixedExpense>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, amount, category_id, payment_type, is_active, profile_id, created_at
             FROM fixed_expenses WHERE is_active = 1 AND profile_id = ?1 ORDER BY name",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([profile_id], |row| {
            Ok(FixedExpense {
                id: row.get(0)?,
                name: row.get(1)?,
                amount: row.get(2)?,
                category_id: row.get(3)?,
                payment_type: row.get(4)?,
                is_active: row.get(5)?,
                profile_id: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_all_fixed_expenses(
    state: State<'_, DbConn>,
    profile_id: i64,
) -> Result<Vec<FixedExpense>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, amount, category_id, payment_type, is_active, profile_id, created_at
             FROM fixed_expenses WHERE profile_id = ?1 ORDER BY is_active DESC, name",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([profile_id], |row| {
            Ok(FixedExpense {
                id: row.get(0)?,
                name: row.get(1)?,
                amount: row.get(2)?,
                category_id: row.get(3)?,
                payment_type: row.get(4)?,
                is_active: row.get(5)?,
                profile_id: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn add_fixed_expense(
    state: State<'_, DbConn>,
    name: String,
    amount: f64,
    category_id: Option<i64>,
    payment_type: String,
    profile_id: i64,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO fixed_expenses (name, amount, category_id, payment_type, profile_id) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![name, amount, category_id, payment_type, profile_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn update_fixed_expense(
    state: State<'_, DbConn>,
    id: i64,
    name: String,
    amount: f64,
    category_id: Option<i64>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE fixed_expenses SET name = ?1, amount = ?2, category_id = ?3 WHERE id = ?4",
        rusqlite::params![name, amount, category_id, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn toggle_fixed_expense_active(
    state: State<'_, DbConn>,
    id: i64,
    is_active: bool,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE fixed_expenses SET is_active = ?1 WHERE id = ?2",
        rusqlite::params![if is_active { 1 } else { 0 }, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_fixed_expense(state: State<'_, DbConn>, id: i64) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM fixed_expenses WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_fixed_expense_total(
    state: State<'_, DbConn>,
    _month: String,
    profile_id: i64,
) -> Result<f64, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT COALESCE(SUM(fe.amount), 0) FROM fixed_expenses fe WHERE fe.is_active = 1 AND fe.profile_id = ?1",
        [profile_id],
        |row| row.get(0),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_fixed_expense_statuses(
    state: State<'_, DbConn>,
    month: String,
    profile_id: i64,
) -> Result<Vec<FixedExpenseStatus>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT fe.id, fe.name, fe.amount, fe.category_id, fe.payment_type, fe.is_active, fe.profile_id, fe.created_at,
                    c.name, c.icon, c.color,
                    fep.paid, fep.paid_at, fep.id
             FROM fixed_expenses fe
             LEFT JOIN categories c ON fe.category_id = c.id
             LEFT JOIN fixed_expense_payments fep ON fe.id = fep.fixed_expense_id AND fep.month = ?1
             WHERE fe.is_active = 1 AND fe.profile_id = ?2
             ORDER BY fe.name",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params![month, profile_id], |row| {
            Ok(FixedExpenseStatus {
                id: row.get(0)?,
                name: row.get(1)?,
                amount: row.get(2)?,
                category_id: row.get(3)?,
                payment_type: row.get(4)?,
                is_active: row.get(5)?,
                profile_id: row.get(6)?,
                created_at: row.get(7)?,
                category_name: row.get(8)?,
                category_icon: row.get(9)?,
                category_color: row.get(10)?,
                paid: row.get(11)?,
                paid_at: row.get(12)?,
                payment_id: row.get(13)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn toggle_fixed_expense_payment(
    state: State<'_, DbConn>,
    fixed_expense_id: i64,
    month: String,
    paid: bool,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    if paid {
        conn.execute(
            "INSERT INTO fixed_expense_payments (fixed_expense_id, month, paid, paid_at)
             VALUES (?1, ?2, 1, datetime('now'))
             ON CONFLICT(fixed_expense_id, month) DO UPDATE SET paid = 1, paid_at = datetime('now')",
            rusqlite::params![fixed_expense_id, month],
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "UPDATE fixed_expense_payments SET paid = 0, paid_at = NULL
             WHERE fixed_expense_id = ?1 AND month = ?2",
            rusqlite::params![fixed_expense_id, month],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn get_unpaid_fixed_expense_count(
    state: State<'_, DbConn>,
    month: String,
    profile_id: i64,
) -> Result<i64, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT COUNT(*) FROM fixed_expenses fe
         WHERE fe.is_active = 1 AND fe.profile_id = ?1
           AND NOT EXISTS (
             SELECT 1 FROM fixed_expense_payments fep
             WHERE fep.fixed_expense_id = fe.id AND fep.month = ?2 AND fep.paid = 1
           )",
        rusqlite::params![profile_id, month],
        |row| row.get(0),
    )
    .map_err(|e| e.to_string())
}

// ========== Savings Goal Commands ==========

#[tauri::command]
fn get_savings_goal(
    state: State<'_, DbConn>,
    month: String,
    profile_id: i64,
) -> Result<Option<SavingsGoal>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let result = conn.query_row(
        "SELECT id, name, target_amount, current_amount, month, profile_id, created_at
         FROM savings_goals WHERE month = ?1 AND profile_id = ?2 LIMIT 1",
        rusqlite::params![month, profile_id],
        |row| {
            Ok(SavingsGoal {
                id: row.get(0)?,
                name: row.get(1)?,
                target_amount: row.get(2)?,
                current_amount: row.get(3)?,
                month: row.get(4)?,
                profile_id: row.get(5)?,
                created_at: row.get(6)?,
            })
        },
    );
    match result {
        Ok(g) => Ok(Some(g)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn set_savings_goal(
    state: State<'_, DbConn>,
    name: String,
    target_amount: f64,
    month: String,
    profile_id: i64,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let existing: Option<i64> = conn
        .query_row(
            "SELECT id FROM savings_goals WHERE month = ?1 AND profile_id = ?2 LIMIT 1",
            rusqlite::params![month, profile_id],
            |row| row.get(0),
        )
        .ok();
    if let Some(id) = existing {
        conn.execute(
            "UPDATE savings_goals SET name = ?1, target_amount = ?2 WHERE id = ?3",
            rusqlite::params![name, target_amount, id],
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "INSERT INTO savings_goals (name, target_amount, month, profile_id) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![name, target_amount, month, profile_id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn update_savings_progress(
    state: State<'_, DbConn>,
    month: String,
    current_amount: f64,
    profile_id: i64,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let existing: Option<i64> = conn
        .query_row(
            "SELECT id FROM savings_goals WHERE month = ?1 AND profile_id = ?2 LIMIT 1",
            rusqlite::params![month, profile_id],
            |row| row.get(0),
        )
        .ok();
    if let Some(id) = existing {
        conn.execute(
            "UPDATE savings_goals SET current_amount = ?1 WHERE id = ?2",
            rusqlite::params![current_amount, id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ========== Report Command ==========

#[tauri::command]
fn get_month_report(
    state: State<'_, DbConn>,
    month: String,
    profile_id: i64,
) -> Result<MonthReport, String> {
    let budget = get_budget(state.clone(), month.clone(), profile_id)?;
    let month_total = get_month_total(state.clone(), month.clone(), profile_id)?;
    let fixed_total = get_fixed_expense_total(state.clone(), month.clone(), profile_id)?;
    let categories = get_month_category_summary(state.clone(), month.clone(), profile_id)?;
    let daily = get_daily_summary(state.clone(), month.clone(), profile_id)?;
    let income = budget.as_ref().map_or(0.0, |b| b.income);
    let budget_amount = budget.as_ref().map_or(0.0, |b| b.amount);
    let dynamic_total = month_total;
    let saved = income - fixed_total - dynamic_total;

    Ok(MonthReport {
        month,
        income,
        budget: budget_amount,
        total_spent: month_total + fixed_total,
        fixed_total,
        dynamic_total,
        saved,
        categories,
        daily,
    })
}

// ========== Seed Command ==========

#[tauri::command]
fn seed_test_data(state: State<'_, DbConn>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    conn.execute_batch(
        "DELETE FROM fixed_expense_payments;
         DELETE FROM fixed_expenses;
         DELETE FROM expenses;
         DELETE FROM budgets;
         DELETE FROM savings_goals;",
    )
    .map_err(|e| e.to_string())?;

    let categories: Vec<Category> = {
        let mut stmt = conn
            .prepare("SELECT id, name, icon, color FROM categories ORDER BY name")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                Ok(Category {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    icon: row.get(2)?,
                    color: row.get(3)?,
                })
            })
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?
    };

    let cat_map: std::collections::HashMap<String, i64> =
        categories.iter().map(|c| (c.name.clone(), c.id)).collect();
    let cat_ids: Vec<i64> = categories.iter().map(|c| c.id).collect();

    let months = ["2026-03", "2026-04", "2026-05", "2026-06"];

    let expense_templates: Vec<(&str, &str, f64, f64)> = vec![
        ("Groceries", "Shopping", 15.0, 80.0),
        ("Uber ride", "Transport", 5.0, 25.0),
        ("Lunch out", "Food", 8.0, 20.0),
        ("Coffee", "Food", 3.0, 7.0),
        ("Netflix", "Entertainment", 10.0, 15.0),
        ("Electric bill", "Bills", 40.0, 120.0),
        ("Gas", "Transport", 30.0, 60.0),
        ("Dinner", "Food", 15.0, 50.0),
        ("Pharmacy", "Health", 10.0, 40.0),
        ("Online course", "Education", 20.0, 100.0),
        ("Movie tickets", "Entertainment", 12.0, 30.0),
        ("New shirt", "Shopping", 20.0, 60.0),
        ("Internet bill", "Bills", 30.0, 70.0),
        ("Gym", "Health", 25.0, 50.0),
        ("Pet food", "Other", 15.0, 40.0),
        ("Phone case", "Shopping", 10.0, 30.0),
        ("Bus pass", "Transport", 20.0, 50.0),
        ("Takeout", "Food", 10.0, 35.0),
        ("Book", "Education", 10.0, 25.0),
        ("Haircut", "Other", 15.0, 35.0),
    ];

    let now = chrono::Utc::now();
    let today_str = now.format("%Y-%m-%d").to_string();

    for month_str in &months {
        let parts: Vec<&str> = month_str.split('-').collect();
        let y: i32 = parts[0].parse().unwrap_or(2026);
        let m: u32 = parts[1].parse().unwrap_or(6);
        let days_in_month = if m == 12 {
            31
        } else {
            let this_month = chrono::NaiveDate::from_ymd_opt(y, m, 1).unwrap();
            let next_month = chrono::NaiveDate::from_ymd_opt(y, m + 1, 1).unwrap();
            (next_month - this_month).num_days() as u32
        };

        let count = 15 + (rand::random::<u32>() % 20);
        for _ in 0..count {
            let tpl = &expense_templates[rand::random::<usize>() % expense_templates.len()];
            let cat_id = cat_map
                .get(tpl.1)
                .copied()
                .unwrap_or(cat_ids[rand::random::<usize>() % cat_ids.len()]);
            let amount =
                ((rand::random::<f64>() * (tpl.3 - tpl.2) + tpl.2) * 100.0).round() / 100.0;
            let day = (rand::random::<u32>() % days_in_month) + 1;
            let date = format!(
                "{}-{:02}-{:02}",
                y,
                m,
                day
            );
            conn.execute(
                "INSERT INTO expenses (amount, description, category_id, date, profile_id) VALUES (?1, ?2, ?3, ?4, 1)",
                rusqlite::params![amount, tpl.0, cat_id, date],
            )
            .map_err(|e| e.to_string())?;
        }

        let budget_amt = ((rand::random::<f64>() * 1700.0 + 800.0) * 100.0).round() / 100.0;
        let income_amt = ((rand::random::<f64>() * 4000.0 + 3000.0) * 100.0).round() / 100.0;
        conn.execute(
            "INSERT OR REPLACE INTO budgets (month, amount, income, profile_id) VALUES (?1, ?2, ?3, 1)",
            rusqlite::params![month_str, budget_amt, income_amt],
        )
        .map_err(|e| e.to_string())?;

        if *month_str == "2026-06" {
            let savings = ((rand::random::<f64>() * 2000.0 + 1000.0) * 100.0).round() / 100.0;
            conn.execute(
                "INSERT OR IGNORE INTO savings_goals (name, target_amount, current_amount, month, profile_id) VALUES (?1, 5000, ?2, ?3, 1)",
                rusqlite::params!["Emergency Fund", savings, month_str],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    let fixed_items: Vec<(&str, f64, &str)> = vec![
        ("Rent", 1200.0, "Other"),
        ("Internet", 60.0, "Bills"),
        ("Phone plan", 35.0, "Bills"),
        ("Gym membership", 40.0, "Health"),
        ("Cloud storage", 10.0, "Other"),
    ];

    let today_expenses: Vec<(&str, &str, f64, f64)> = vec![
        ("Morning coffee", "Food", 4.0, 7.0),
        ("Breakfast burrito", "Food", 8.0, 14.0),
        ("Uber to work", "Transport", 8.0, 18.0),
        ("Lunch salad", "Food", 10.0, 18.0),
        ("Snacks", "Food", 3.0, 8.0),
        ("Gas station", "Transport", 25.0, 50.0),
    ];

    for tpl in &today_expenses {
        let cat_id = cat_map
            .get(tpl.1)
            .copied()
            .unwrap_or(cat_ids[rand::random::<usize>() % cat_ids.len()]);
        let amount =
            ((rand::random::<f64>() * (tpl.3 - tpl.2) + tpl.2) * 100.0).round() / 100.0;
        conn.execute(
            "INSERT INTO expenses (amount, description, category_id, date, profile_id) VALUES (?1, ?2, ?3, ?4, 1)",
            rusqlite::params![amount, tpl.0, cat_id, today_str],
        )
        .map_err(|e| e.to_string())?;
    }

    for item in &fixed_items {
        let cat_id = cat_map.get(item.2).copied();
        conn.execute(
            "INSERT INTO fixed_expenses (name, amount, category_id, profile_id) VALUES (?1, ?2, ?3, 1)",
            rusqlite::params![item.0, item.1, cat_id],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

// ========== App Entry ==========

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_path = get_db_path();
    let conn = rusqlite::Connection::open(&db_path).expect("failed to open db");
    init_db(&conn);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .manage(DbConn {
            conn: Mutex::new(conn),
        })
        .invoke_handler(tauri::generate_handler![
            get_profiles,
            add_profile,
            switch_profile,
            delete_profile,
            get_categories,
            get_expense_count,
            add_category,
            delete_category,
            get_today_expenses,
            get_expenses_by_date,
            add_expense,
            delete_expense,
            get_today_total,
            get_month_total,
            get_month_category_summary,
            get_daily_summary,
            get_budget,
            set_budget,
            set_income,
            get_fixed_expenses,
            get_all_fixed_expenses,
            add_fixed_expense,
            update_fixed_expense,
            toggle_fixed_expense_active,
            delete_fixed_expense,
            get_fixed_expense_total,
            get_fixed_expense_statuses,
            toggle_fixed_expense_payment,
            get_unpaid_fixed_expense_count,
            get_savings_goal,
            set_savings_goal,
            update_savings_progress,
            get_month_report,
            seed_test_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
