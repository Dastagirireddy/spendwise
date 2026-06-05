# AGENTS.md

## Project

Tauri v2 desktop expense tracker. Vanilla TypeScript frontend (no framework), SQLite database via `@tauri-apps/plugin-sql`, Rust backend.

## Package Manager

**pnpm** — use `pnpm`, not npm or yarn.

## Key Commands

- `pnpm tauri dev` — full dev build (starts Vite on port 1420 + Rust backend). This is the primary dev command.
- `pnpm tauri build` — production desktop bundle
- `pnpm build` — frontend-only build (runs `tsc && vite build`). Used internally by `tauri build`.
- `pnpm dev` — Vite dev server only (no Rust). Needed manually only if you want to test frontend in a browser.

## Architecture

- `src/` — TypeScript frontend (Vite entry: `src/main.ts`)
- `src-tauri/` — Rust backend (entry: `src-tauri/src/main.rs` → calls `src-tauri/src/lib.rs`)
- `src/db.ts` — all SQLite queries live here. Frontend calls these directly via `@tauri-apps/plugin-sql`.
- `src-tauri/src/lib.rs` — database migrations and Tauri plugin setup. **New tables/migrations go here**, not in separate SQL files.

## Database

- SQLite file `expense-tracker.db` created at runtime (not in repo)
- Migrations defined inline in `src-tauri/src/lib.rs` as `Migration` structs (versions 1–7)
- To add a new migration: append to the `migrations` vec in `lib.rs` with the next version number

## Conventions

- Icons: Lucide via `@iconify-json/lucide` + `iconify-icon` web component (`<iconify-icon icon="lucide:...">`)
- No test framework, linter, formatter, or CI configured
- Strict TypeScript (`tsconfig.json`): `noUnusedLocals`, `noUnusedParameters`
- `withGlobalTauri: true` in `tauri.conf.json` — Tauri APIs available via `window.__TAURI__` without explicit import

## Tauri Permissions

Capabilities defined in `src-tauri/capabilities/default.json`. If you add new Tauri plugins or SQL operations, check that the required permissions are listed there.
