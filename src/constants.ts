import type { Category } from './types';

export const CATEGORIES: Category[] = [
  { id: 'food',      label: 'Comida',       icon: '🍽', color: '#e07b54' },
  { id: 'transport', label: 'Transporte',   icon: '🚗', color: '#5b8dee' },
  { id: 'housing',   label: 'Vivienda',     icon: '🏠', color: '#7c6fcd' },
  { id: 'health',    label: 'Salud',        icon: '💊', color: '#4caf8a' },
  { id: 'entertain', label: 'Entretenim.',  icon: '🎬', color: '#f2a93b' },
  { id: 'clothing',  label: 'Ropa',         icon: '👗', color: '#e06b9a' },
  { id: 'grocery',   label: 'Supermercado', icon: '🛒', color: '#6fba6f' },
  { id: 'services',  label: 'Servicios',    icon: '⚡', color: '#f5c842' },
  { id: 'education', label: 'Educación',    icon: '📚', color: '#5eafc7' },
  { id: 'other',     label: 'Otras',        icon: '📦', color: '#a0a0a0' },
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
