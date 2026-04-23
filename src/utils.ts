import { CATEGORIES } from './constants';
import type { Currency } from './types';

export const getCat = (id: string) => CATEGORIES.find(c => c.id === id) || CATEGORIES[9];

export const fmt = (n: number, currency: Currency = 'ARS'): string => {
  const abs = Math.abs(n);
  if (currency === 'USD') return `U$S ${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (abs >= 1_000_000) return `$${(n/1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(n/1_000).toFixed(0)}K`;
  return `$${n.toLocaleString('es-AR')}`;
};
