export type TxType = 'expense' | 'income';
export type Currency = 'ARS' | 'USD';
export type TabId = 'home' | 'summary' | 'budget' | 'converter';

export interface Transaction {
  id: string;
  type: TxType;
  category: string;
  amount: number;
  currency: Currency;
  desc: string;
  date: string;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export interface Tweaks {
  theme: 'light' | 'dark' | 'warm';
  accentColor: string;
  cardRadius: number;
  fontScale: number;
}

export interface ThemePalette {
  bg: string;
  card: string;
  cardAlt: string;
  text: string;
  textSecondary: string;
  border: string;
  navBg: string;
  inputBg: string;
  shadow: string;
}
