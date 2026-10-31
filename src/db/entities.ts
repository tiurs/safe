import type { FieldDef, Kind, Row } from './types';

export const FIREARM_TYPES = ['Handgun', 'Rifle', 'Shotgun', 'Revolver', 'Other'];
export const ACTIONS = ['Semi-auto', 'Bolt', 'Lever', 'Pump', 'Break', 'Single-action', 'Double-action', 'Other'];
export const CONDITIONS = ['New', 'Excellent', 'Very good', 'Good', 'Fair', 'Poor'];
export const BULLET_TYPES = ['FMJ', 'JHP', 'SP', 'BTHP', 'Polymer tip', 'Buckshot', 'Birdshot', 'Slug', 'Other'];
export const ACCESSORY_CATEGORIES = [
  'Optic',
  'Magazine',
  'Light',
  'Laser',
  'Holster',
  'Sling',
  'Suppressor',
  'Case',
  'Cleaning',
  'Grip/Stock',
  'Other',
];

export interface EntityDef {
  kind: Kind;
  table: string;
  singular: string;
  plural: string;
  icon: 'shield' | 'cube' | 'construct';
  fields: FieldDef[];
  searchColumns: string[];
  orderBy: string;
  title: (r: Row) => string;
  subtitle: (r: Row) => string;
}

const join = (...parts: (string | number | null | undefined)[]) =>
  parts.filter((p) => p !== null && p !== undefined && `${p}`.trim() !== '').join(' · ');

export const ENTITIES: Record<Kind, EntityDef> = {
  firearms: {
    kind: 'firearms',
    table: 'firearms',
    singular: 'Firearm',
    plural: 'Firearms',
    icon: 'shield',
    orderBy: 'make COLLATE NOCASE, model COLLATE NOCASE',
    searchColumns: ['make', 'model', 'caliber', 'serial_number', 'type', 'location', 'notes'],
    title: (r) => join(r.make, r.model) || 'Untitled firearm',
    subtitle: (r) => join(r.type, r.caliber, r.serial_number ? `SN ${r.serial_number}` : null),
    fields: [
      { key: 'make', label: 'Make / Manufacturer', type: 'text', required: true, placeholder: 'e.g. Glock' },
      { key: 'model', label: 'Model', type: 'text', required: true, placeholder: 'e.g. 19 Gen 5' },
      { key: 'type', label: 'Type', type: 'choice', options: FIREARM_TYPES },
      { key: 'action', label: 'Action', type: 'choice', options: ACTIONS },
      { key: 'caliber', label: 'Caliber / Gauge', type: 'text', placeholder: 'e.g. 9mm' },
      { key: 'serial_number', label: 'Serial number', type: 'text', sensitive: true },
      { key: 'barrel_length', label: 'Barrel length (in)', type: 'number' },
      { key: 'finish', label: 'Finish / Color', type: 'text' },
      { key: 'condition', label: 'Condition', type: 'choice', options: CONDITIONS },
      { key: 'round_count', label: 'Round count', type: 'number' },
      { key: 'purchase_date', label: 'Purchase date', type: 'date' },
      { key: 'purchase_price', label: 'Purchase price', type: 'money' },
      { key: 'purchased_from', label: 'Purchased from (dealer / FFL / private)', type: 'text' },
      { key: 'current_value', label: 'Current value', type: 'money' },
      { key: 'location', label: 'Storage location', type: 'text', placeholder: 'e.g. Safe, top shelf' },
      { key: 'notes', label: 'Notes', type: 'multiline' },
    ],
  },
  ammo: {
    kind: 'ammo',
    table: 'ammo',
    singular: 'Ammo',
    plural: 'Ammo',
    icon: 'cube',
    orderBy: 'caliber COLLATE NOCASE, brand COLLATE NOCASE',
    searchColumns: ['caliber', 'brand', 'product_line', 'bullet_type', 'location', 'lot_number', 'notes'],
    title: (r) => join(r.caliber, r.brand) || 'Untitled ammo',
    subtitle: (r) =>
      join(r.grain ? `${r.grain}gr` : null, r.bullet_type, `${Number(r.quantity ?? 0).toLocaleString()} rds`),
    fields: [
      { key: 'caliber', label: 'Caliber / Gauge', type: 'text', required: true, placeholder: 'e.g. 5.56 NATO' },
      { key: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g. Federal' },
      { key: 'product_line', label: 'Product line', type: 'text', placeholder: 'e.g. American Eagle' },
      { key: 'grain', label: 'Grain', type: 'number' },
      { key: 'bullet_type', label: 'Bullet type', type: 'choice', options: BULLET_TYPES },
      { key: 'quantity', label: 'Quantity (rounds)', type: 'number', required: true },
      { key: 'low_stock_threshold', label: 'Low-stock warning at (rounds)', type: 'number' },
      { key: 'cost_per_round', label: 'Cost per round', type: 'money' },
      { key: 'purchase_date', label: 'Purchase date', type: 'date' },
      { key: 'purchased_from', label: 'Purchased from', type: 'text' },
      { key: 'lot_number', label: 'Lot number', type: 'text' },
      { key: 'location', label: 'Storage location', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'multiline' },
    ],
  },
  accessories: {
    kind: 'accessories',
    table: 'accessories',
    singular: 'Accessory',
    plural: 'Accessories',
    icon: 'construct',
    orderBy: 'category COLLATE NOCASE, name COLLATE NOCASE',
    searchColumns: ['name', 'category', 'brand', 'model', 'serial_number', 'location', 'notes'],
    title: (r) => (r.name as string) || join(r.brand, r.model) || 'Untitled accessory',
    subtitle: (r) => join(r.category, r.brand, Number(r.quantity ?? 1) > 1 ? `x${r.quantity}` : null),
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. Red dot' },
      { key: 'category', label: 'Category', type: 'choice', options: ACCESSORY_CATEGORIES },
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'model', label: 'Model', type: 'text' },
      { key: 'serial_number', label: 'Serial number', type: 'text', sensitive: true },
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'firearm_id', label: 'Mounted on / used with', type: 'firearm' },
      { key: 'purchase_date', label: 'Purchase date', type: 'date' },
      { key: 'purchase_price', label: 'Purchase price (each)', type: 'money' },
      { key: 'current_value', label: 'Current value (each)', type: 'money' },
      { key: 'location', label: 'Storage location', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'multiline' },
    ],
  },
};

export const KINDS: Kind[] = ['firearms', 'ammo', 'accessories'];

export function isKind(value: unknown): value is Kind {
  return typeof value === 'string' && (KINDS as string[]).includes(value);
}

export function columnsFor(kind: Kind): string[] {
  return ENTITIES[kind].fields.map((f) => f.key);
}
