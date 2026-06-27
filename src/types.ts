export type TxType = 'expense' | 'income';
export type Currency = 'ARS' | 'USD';
export type TabId = 'home' | 'summary' | 'budget' | 'services' | 'savings' | 'converter';

export type PropertyType = 'casa' | 'depto';

export interface RentalService {
  id: string;
  name: string;
  serviceType: string;
}

export interface RentalProperty {
  id: string;
  name: string;
  type: PropertyType;
  services: RentalService[];
}

export interface ServicePeriodStatus {
  propertyId: string;
  serviceId: string;
  /** YYYY-MM */
  period: string;
  tenantReceivedAt: string | null;
  servicePaidAt: string | null;
}

export interface ServicesSnapshot {
  properties: RentalProperty[];
  statuses: ServicePeriodStatus[];
}

export interface Transaction {
  id: string;
  type: TxType;
  category: string;
  amount: number;
  currency: Currency;
  desc: string;
  date: string;
  createdAt?: string;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  color: string;
  subcategories: string[];
}

export interface SavingsEntry {
  date: string; // YYYY-MM-DD
  amount: number;
}

export interface SavingsFund {
  id: string;
  name: string;
  currency: Currency;
  entries: SavingsEntry[];
}

export interface SavingsSnapshot {
  funds: SavingsFund[];
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
