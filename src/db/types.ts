export type Kind = 'firearms' | 'ammo' | 'accessories';

export type FieldType = 'text' | 'multiline' | 'number' | 'money' | 'date' | 'choice' | 'firearm';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  placeholder?: string;
  sensitive?: boolean;
  integer?: boolean;
}

export type Row = Record<string, string | number | null> & { id: number };
