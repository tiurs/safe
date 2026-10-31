import { useColorScheme } from 'react-native';

const light = {
  bg: '#F4F5F0',
  card: '#FFFFFF',
  text: '#1B1F1B',
  muted: '#6B716B',
  border: '#DADDD5',
  accent: '#4B5D3A',
  accentText: '#FFFFFF',
  danger: '#B3261E',
  warn: '#A15C00',
  chip: '#E7EAE1',
  input: '#FFFFFF',
};

const dark: typeof light = {
  bg: '#111411',
  card: '#1B201B',
  text: '#ECEFE8',
  muted: '#9AA196',
  border: '#2E352D',
  accent: '#8BA36F',
  accentText: '#111411',
  danger: '#F2B8B5',
  warn: '#F0B35A',
  chip: '#262D25',
  input: '#161A16',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export function money(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '';
  return Number(n).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}
