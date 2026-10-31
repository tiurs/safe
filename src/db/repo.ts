import type { SQLiteDatabase } from 'expo-sqlite';
import { ENTITIES, columnsFor } from './entities';
import type { Kind, Row } from './types';

export type FormValues = Record<string, string>;

export function parsePhotos(row: Row | null | undefined): string[] {
  if (!row?.photos) return [];
  try {
    const parsed = JSON.parse(String(row.photos));
    return Array.isArray(parsed) ? parsed.filter((p) => typeof p === 'string') : [];
  } catch {
    return [];
  }
}

export function toFormValues(kind: Kind, row: Row | null): FormValues {
  const values: FormValues = {};
  for (const f of ENTITIES[kind].fields) {
    const v = row?.[f.key];
    values[f.key] = v === null || v === undefined ? '' : String(v);
  }
  return values;
}

function coerce(kind: Kind, key: string, raw: string | undefined): string | number | null {
  const field = ENTITIES[kind].fields.find((f) => f.key === key);
  const value = (raw ?? '').trim();
  if (value === '') return null;
  if (field?.type === 'number' || field?.type === 'money') {
    const n = Number(value.replace(/[$,\s]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  if (field?.type === 'firearm') {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : null;
  }
  return value;
}

export function validate(kind: Kind, values: FormValues): string | null {
  for (const f of ENTITIES[kind].fields) {
    const raw = (values[f.key] ?? '').trim();
    if (f.required && raw === '') return `${f.label} is required.`;
    if (raw === '') continue;
    if (f.type === 'number' || f.type === 'money') {
      const n = Number(raw.replace(/[$,\s]/g, ''));
      if (!Number.isFinite(n)) return `${f.label} must be a number.`;
      if (n < 0) return `${f.label} cannot be negative.`;
    }
    if (f.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return `${f.label} must be in YYYY-MM-DD format.`;
    }
  }
  return null;
}

export async function listItems(db: SQLiteDatabase, kind: Kind, search = ''): Promise<Row[]> {
  const def = ENTITIES[kind];
  const term = search.trim();
  if (!term) {
    return db.getAllAsync<Row>(`SELECT * FROM ${def.table} ORDER BY ${def.orderBy}`);
  }
  const where = def.searchColumns.map((c) => `${c} LIKE $q`).join(' OR ');
  return db.getAllAsync<Row>(`SELECT * FROM ${def.table} WHERE ${where} ORDER BY ${def.orderBy}`, {
    $q: `%${term}%`,
  });
}

export async function getItem(db: SQLiteDatabase, kind: Kind, id: number): Promise<Row | null> {
  return db.getFirstAsync<Row>(`SELECT * FROM ${ENTITIES[kind].table} WHERE id = ?`, id);
}

export async function saveItem(
  db: SQLiteDatabase,
  kind: Kind,
  values: FormValues,
  photos: string[],
  id?: number
): Promise<number> {
  const table = ENTITIES[kind].table;
  const cols = columnsFor(kind);
  const params = [...cols.map((c) => coerce(kind, c, values[c])), JSON.stringify(photos)];
  if (id) {
    const sets = [...cols, 'photos'].map((c) => `${c} = ?`).join(', ');
    await db.runAsync(`UPDATE ${table} SET ${sets}, updated_at = datetime('now') WHERE id = ?`, [...params, id]);
    return id;
  }
  const allCols = [...cols, 'photos'];
  const result = await db.runAsync(
    `INSERT INTO ${table} (${allCols.join(', ')}) VALUES (${allCols.map(() => '?').join(', ')})`,
    params
  );
  return result.lastInsertRowId;
}

export async function deleteItem(db: SQLiteDatabase, kind: Kind, id: number): Promise<string[]> {
  const row = await getItem(db, kind, id);
  await db.runAsync(`DELETE FROM ${ENTITIES[kind].table} WHERE id = ?`, id);
  return parsePhotos(row);
}

export async function addAmmo(db: SQLiteDatabase, id: number, rounds: number) {
  await db.runAsync(
    `UPDATE ammo SET quantity = quantity + ?, updated_at = datetime('now') WHERE id = ?`,
    rounds,
    id
  );
}

/** Removes rounds only if enough are on hand (checked in SQL), then credits the firearm in the same transaction. */
export async function spendAmmo(
  db: SQLiteDatabase,
  id: number,
  rounds: number,
  firearmId: number | null
): Promise<boolean> {
  let used = false;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `UPDATE ammo SET quantity = quantity - ?, updated_at = datetime('now') WHERE id = ? AND quantity >= ?`,
      rounds,
      id,
      rounds
    );
    if (result.changes === 0) return;
    if (firearmId !== null) {
      await db.runAsync(
        `UPDATE firearms SET round_count = COALESCE(round_count, 0) + ?, updated_at = datetime('now') WHERE id = ?`,
        rounds,
        firearmId
      );
    }
    used = true;
  });
  return used;
}

export async function accessoriesForFirearm(db: SQLiteDatabase, firearmId: number): Promise<Row[]> {
  return db.getAllAsync<Row>(
    `SELECT * FROM accessories WHERE firearm_id = ? ORDER BY ${ENTITIES.accessories.orderBy}`,
    firearmId
  );
}

export interface Stats {
  firearmCount: number;
  ammoRounds: number;
  accessoryCount: number;
  firearmValue: number;
  ammoValue: number;
  accessoryValue: number;
  byCaliber: { caliber: string; rounds: number }[];
  lowStock: Row[];
}

export async function getStats(db: SQLiteDatabase): Promise<Stats> {
  const f = await db.getFirstAsync<{ n: number; v: number }>(
    `SELECT COUNT(*) AS n, COALESCE(SUM(COALESCE(current_value, purchase_price, 0)), 0) AS v FROM firearms`
  );
  const a = await db.getFirstAsync<{ n: number; v: number }>(
    `SELECT COALESCE(SUM(quantity), 0) AS n, COALESCE(SUM(quantity * COALESCE(cost_per_round, 0)), 0) AS v FROM ammo`
  );
  const x = await db.getFirstAsync<{ n: number; v: number }>(
    `SELECT COALESCE(SUM(COALESCE(quantity, 1)), 0) AS n,
            COALESCE(SUM(COALESCE(quantity, 1) * COALESCE(current_value, purchase_price, 0)), 0) AS v
     FROM accessories`
  );
  const byCaliber = await db.getAllAsync<{ caliber: string; rounds: number }>(
    `SELECT COALESCE(caliber, 'Unknown') AS caliber, SUM(quantity) AS rounds
     FROM ammo GROUP BY caliber COLLATE NOCASE ORDER BY rounds DESC`
  );
  const lowStock = await db.getAllAsync<Row>(
    `SELECT * FROM ammo WHERE low_stock_threshold IS NOT NULL AND quantity <= low_stock_threshold
     ORDER BY caliber COLLATE NOCASE`
  );
  return {
    firearmCount: f?.n ?? 0,
    firearmValue: f?.v ?? 0,
    ammoRounds: a?.n ?? 0,
    ammoValue: a?.v ?? 0,
    accessoryCount: x?.n ?? 0,
    accessoryValue: x?.v ?? 0,
    byCaliber,
    lowStock,
  };
}

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string | null }>('SELECT value FROM settings WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string) {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value
  );
}
