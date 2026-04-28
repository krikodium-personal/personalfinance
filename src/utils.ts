import { CATEGORIES } from './constants';
import type { Currency } from './types';

export const getCat = (id: string) => CATEGORIES.find(c => c.id === id) || CATEGORIES[9];

export const fmt = (n: number, currency: Currency = 'ARS'): string => {
  if (currency === 'USD') {
    return `U$S ${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/** Parse transaction dates safely for both ISO timestamps and `YYYY-MM-DD` strings. */
export const parseTxDate = (raw: string): Date => {
  const calendarMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (calendarMatch) {
    const [, y, m, d] = calendarMatch;
    const year = Number(y);
    const month = Number(m);
    const day = Number(d);
    return new Date(year, month - 1, day, 12, 0, 0);
  }
  return new Date(raw);
};

/** Format a transaction date for `<input type="date">` without timezone shifting. */
export const txDateToInputValue = (raw: string): string => {
  const d = parseTxDate(raw);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
