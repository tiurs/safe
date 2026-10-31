import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'safe.db';
const SCHEMA_VERSION = 1;

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  if (version >= SCHEMA_VERSION) return;

  if (version === 0) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS firearms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        make TEXT, model TEXT, type TEXT, action TEXT, caliber TEXT,
        serial_number TEXT, barrel_length REAL, finish TEXT, condition TEXT,
        round_count INTEGER, purchase_date TEXT, purchase_price REAL,
        purchased_from TEXT, current_value REAL, location TEXT, notes TEXT,
        photos TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS ammo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        caliber TEXT, brand TEXT, product_line TEXT, grain REAL, bullet_type TEXT,
        quantity INTEGER NOT NULL DEFAULT 0, low_stock_threshold INTEGER,
        cost_per_round REAL, purchase_date TEXT, purchased_from TEXT,
        lot_number TEXT, location TEXT, notes TEXT,
        photos TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS accessories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT, category TEXT, brand TEXT, model TEXT, serial_number TEXT,
        quantity INTEGER, firearm_id INTEGER REFERENCES firearms(id) ON DELETE SET NULL,
        purchase_date TEXT, purchase_price REAL, current_value REAL,
        location TEXT, notes TEXT,
        photos TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT);
      CREATE INDEX IF NOT EXISTS idx_accessories_firearm ON accessories(firearm_id);
    `);
    version = 1;
  }

  await db.execAsync(`PRAGMA user_version = ${version}`);
}
