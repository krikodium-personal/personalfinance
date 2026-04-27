import type { Category } from './types';

/** Categoría usada solo para ventas USD→ARS (sin elegir en el modal). */
export const DOLLAR_SALE_CATEGORY_ID = 'cambio-usd';

export const CATEGORIES: Category[] = [
  { id: 'cambio-usd', label: 'Cambio USD', icon: '💵', color: '#6b7280', subcategories: [] },
  { id: 'comida', label: 'Comida', icon: '🍽', color: '#e07b54', subcategories: ['Verdulería', 'Carnicería', 'Milanesas', 'Super', 'Almacén'] },
  { id: 'visa', label: 'Visa', icon: '💳', color: '#4f8ef7', subcategories: [] },
  { id: 'amex', label: 'Amex', icon: '💳', color: '#6ba9ff', subcategories: [] },
  { id: 'tenis', label: 'Tenis', icon: '🎾', color: '#4caf8a', subcategories: ['Flavio', 'Encordado', 'Torneos', 'Pelotas'] },
  { id: 'casa-102', label: 'Casa 102', icon: '🏠', color: '#7c6fcd', subcategories: [] },
  { id: 'casa-116', label: 'Casa 116', icon: '🏡', color: '#9a83d8', subcategories: [] },
  { id: 'auto', label: 'Auto', icon: '🚗', color: '#5b8dee', subcategories: [] },
  { id: 'monotributo', label: 'Monotributo', icon: '🧾', color: '#f2a93b', subcategories: [] },
  { id: 'piti', label: 'Piti', icon: '🧴', color: '#e06b9a', subcategories: ['Librería', 'Remis', 'Semanalidad', 'Salidas', 'Depilación'] },
  { id: 'servicios', label: 'Servicios', icon: '⚡', color: '#f5c842', subcategories: [] },
  { id: 'salidas', label: 'Salidas', icon: '🍻', color: '#5eafc7', subcategories: [] },
  { id: 'regalos', label: 'Regalos', icon: '🎁', color: '#a0a0a0', subcategories: [] },
];

export const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export const themes = {
  light: { bg:'#f5f2ed', card:'#ffffff', cardAlt:'#f9f7f4', text:'#1a1714', textSecondary:'#6b6560', border:'#e8e3dd', navBg:'#ffffff', inputBg:'#f5f2ed', shadow:'0 2px 16px rgba(0,0,0,0.08)' },
  dark:  { bg:'#111110', card:'#1c1b19', cardAlt:'#242320', text:'#f0ede8', textSecondary:'#8a8680', border:'#2e2c28', navBg:'#1c1b19', inputBg:'#242320', shadow:'0 2px 16px rgba(0,0,0,0.4)' },
  warm:  { bg:'#fdf6ee', card:'#fffdf9', cardAlt:'#fdf6ee', text:'#2d1f0e', textSecondary:'#8a7060', border:'#f0e4d4', navBg:'#fffdf9', inputBg:'#fdf6ee', shadow:'0 2px 16px rgba(180,100,0,0.1)' },
};

export const TWEAK_DEFAULTS = {
  theme: 'warm',
  accentColor: '#0891b2',
  cardRadius: 24,
  fontScale: 1,
} as const;
