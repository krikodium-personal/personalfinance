import { CATEGORIES } from './constants';
import type { Currency } from './types';

export const getCat = (id: string) => CATEGORIES.find(c => c.id === id) || CATEGORIES[9];

export const fmt = (n: number, currency: Currency = 'ARS'): string => {
  if (currency === 'USD') {
    return `U$S ${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
