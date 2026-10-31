import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';
import { ENTITIES, KINDS, columnsFor } from '../db/entities';
import { listItems, parsePhotos } from '../db/repo';
import type { Kind, Row } from '../db/types';
import { toCsv } from './csv';
import { clearAllPhotos, readPhotoBase64, writePhotoBase64 } from './photos';

const BACKUP_FORMAT = 'safe-inventory-backup';
const META_COLUMNS = ['id', 'photos', 'created_at', 'updated_at'];

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function shareFile(name: string, contents: string, mimeType: string, uti?: string) {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.writeSync(contents);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, { mimeType, UTI: uti, dialogTitle: name });
}

export async function exportBackup(db: SQLiteDatabase, includePhotos: boolean) {
  const data: Record<string, Row[]> = {};
  const photos: Record<string, string> = {};
  for (const kind of KINDS) {
    data[kind] = await db.getAllAsync<Row>(`SELECT * FROM ${ENTITIES[kind].table} ORDER BY id`);
    if (includePhotos) {
      for (const row of data[kind]) {
        for (const name of parsePhotos(row)) {
          const b64 = readPhotoBase64(name);
          if (b64) photos[name] = b64;
        }
      }
    }
  }
  const payload = { format: BACKUP_FORMAT, version: 1, exportedAt: new Date().toISOString(), data, photos };
  await shareFile(`safe-backup-${today()}.json`, JSON.stringify(payload), 'application/json', 'public.json');
}

export async function exportCsv(db: SQLiteDatabase, kind: Kind) {
  const rows = await listItems(db, kind);
  const firearms = await listItems(db, 'firearms');
  const names = new Map(firearms.map((f) => [f.id, ENTITIES.firearms.title(f)]));
  await shareFile(`safe-${kind}-${today()}.csv`, toCsv(kind, rows, names), 'text/csv', 'public.comma-separated-values-text');
}

export interface ImportSummary {
  firearms: number;
  ammo: number;
  accessories: number;
  photos: number;
}

export async function pickBackupFile(): Promise<unknown | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.length) return null;
  const text = new File(result.assets[0].uri).textSync();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('That file is not a valid Safe backup (could not parse JSON).');
  }
}

export async function restoreBackup(db: SQLiteDatabase, payload: unknown): Promise<ImportSummary> {
  const p = payload as { format?: string; data?: Record<string, unknown>; photos?: Record<string, unknown> };
  if (!p || p.format !== BACKUP_FORMAT || typeof p.data !== 'object' || !p.data) {
    throw new Error('That file is not a Safe backup.');
  }
  const summary: ImportSummary = { firearms: 0, ammo: 0, accessories: 0, photos: 0 };
  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM accessories; DELETE FROM ammo; DELETE FROM firearms;');
    for (const kind of KINDS) {
      const rows = Array.isArray(p.data![kind]) ? (p.data![kind] as Record<string, unknown>[]) : [];
      const cols = [...META_COLUMNS, ...columnsFor(kind)];
      for (const row of rows) {
        const present = cols.filter((c) => row[c] !== undefined);
        if (!present.length) continue;
        const values = present.map((c) => {
          const v = row[c];
          return typeof v === 'number' || typeof v === 'string' ? v : v === null ? null : String(v);
        });
        await db.runAsync(
          `INSERT INTO ${ENTITIES[kind].table} (${present.join(', ')}) VALUES (${present.map(() => '?').join(', ')})`,
          values
        );
        summary[kind]++;
      }
    }
  });
  const photos = p.photos && typeof p.photos === 'object' ? p.photos : {};
  if (Object.keys(photos).length) {
    clearAllPhotos();
    for (const [name, data] of Object.entries(photos)) {
      if (typeof data === 'string') {
        writePhotoBase64(name, data);
        summary.photos++;
      }
    }
  }
  return summary;
}

export async function eraseAll(db: SQLiteDatabase) {
  await db.execAsync('DELETE FROM accessories; DELETE FROM ammo; DELETE FROM firearms;');
  clearAllPhotos();
}
