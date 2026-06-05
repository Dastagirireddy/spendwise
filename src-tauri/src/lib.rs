use tauri_plugin_sql::{Migration, MigrationKind};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn db_path() -> String {
    #[cfg(debug_assertions)]
    {
        let dir = std::env::current_dir().expect("failed to get current dir");
        let path = dir.join("expense-tracker.db");
        format!("sqlite:{}", path.to_string_lossy())
    }
    #[cfg(not(debug_assertions))]
    {
        "sqlite:expense-tracker.db".to_string()
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "initial_schema",
            sql: "CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                icon TEXT NOT NULL DEFAULT 'lucide:package',
                color TEXT NOT NULL DEFAULT '#a8e6cf'
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

            CREATE TABLE IF NOT EXISTS profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
            kind: MigrationKind::Up,
        },
    ];

    let path = db_path();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(&path, migrations)
                .build(),
        )
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![greet, db_path])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
