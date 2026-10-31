import { ENTITIES } from '../db/entities';
import type { Kind, Row } from '../db/types';

function escape(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s = String(value);
  // Stop spreadsheets from treating text like "=HYPERLINK(...)" as a formula.
  if (typeof value === 'string' && /^\s*[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(kind: Kind, rows: Row[], firearmNames: Map<number, string>): string {
  const fields = ENTITIES[kind].fields;
  const header = ['id', ...fields.map((f) => f.label)];
  const lines = [header.map(escape).join(',')];
  for (const row of rows) {
    const cells = [
      row.id,
      ...fields.map((f) =>
        f.type === 'firearm' && row[f.key] != null ? firearmNames.get(Number(row[f.key])) ?? '' : row[f.key]
      ),
    ];
    lines.push(cells.map(escape).join(','));
  }
  return lines.join('\r\n');
}
