import type {
  PropertyType,
  RentalProperty,
  RentalService,
  ServicePeriodStatus,
  ServicesSnapshot,
} from '../types';

export const EMPTY_SERVICES_SNAPSHOT: ServicesSnapshot = {
  properties: [],
  statuses: [],
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  casa: 'Casa',
  depto: 'Depto',
};

export function slugify(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}

export function periodFromDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function formatPeriodLabel(period: string) {
  const [y, m] = period.split('-').map(Number);
  if (!y || !m) return period;
  const month = new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long' });
  const monthLabel = month.charAt(0).toUpperCase() + month.slice(1);
  return `${monthLabel} ${y}`;
}

export function shiftPeriod(period: string, delta: number) {
  const [y, m] = period.split('-').map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  return periodFromDate(date);
}

export function todayIsoDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatStatusDate(iso: string) {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return iso;
  const [, y, m, d] = match;
  return `${d}/${m}/${y.slice(-2)}`;
}

function normalizeProperty(raw: unknown, idx: number): RentalProperty | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Partial<RentalProperty>;
  const type: PropertyType = item.type === 'depto' ? 'depto' : 'casa';
  const servicesRaw = Array.isArray(item.services) ? item.services : [];
  const services = servicesRaw
    .map((service, serviceIdx) => normalizeService(service, serviceIdx))
    .filter((service): service is RentalService => service !== null);

  return {
    id: typeof item.id === 'string' && item.id ? item.id : newId(`prop-${idx}`),
    name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : `Propiedad ${idx + 1}`,
    type,
    services,
  };
}

function normalizeService(raw: unknown, idx: number): RentalService | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Partial<RentalService>;
  const name = typeof item.name === 'string' ? item.name.trim() : '';
  const serviceType = typeof item.serviceType === 'string' ? item.serviceType.trim() : '';
  if (!name) return null;
  return {
    id: typeof item.id === 'string' && item.id ? item.id : newId(`svc-${idx}`),
    name,
    serviceType: serviceType || 'otro',
  };
}

function normalizeStatus(raw: unknown): ServicePeriodStatus | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Partial<ServicePeriodStatus>;
  if (
    typeof item.propertyId !== 'string' ||
    typeof item.serviceId !== 'string' ||
    typeof item.period !== 'string' ||
    !/^\d{4}-\d{2}$/.test(item.period)
  ) {
    return null;
  }
  return {
    propertyId: item.propertyId,
    serviceId: item.serviceId,
    period: item.period,
    tenantReceivedAt: typeof item.tenantReceivedAt === 'string' ? item.tenantReceivedAt : null,
    servicePaidAt: typeof item.servicePaidAt === 'string' ? item.servicePaidAt : null,
  };
}

export function normalizeServicesSnapshot(raw: unknown): ServicesSnapshot {
  if (!raw || typeof raw !== 'object') return EMPTY_SERVICES_SNAPSHOT;
  const item = raw as Partial<ServicesSnapshot>;
  const properties = Array.isArray(item.properties)
    ? item.properties
        .map((property, idx) => normalizeProperty(property, idx))
        .filter((property): property is RentalProperty => property !== null)
    : [];
  const statuses = Array.isArray(item.statuses)
    ? item.statuses
        .map(status => normalizeStatus(status))
        .filter((status): status is ServicePeriodStatus => status !== null)
    : [];
  return { properties, statuses };
}

export function statusKey(propertyId: string, serviceId: string, period: string) {
  return `${propertyId}::${serviceId}::${period}`;
}

export function getPeriodStatus(
  snapshot: ServicesSnapshot,
  propertyId: string,
  serviceId: string,
  period: string,
): ServicePeriodStatus {
  return (
    snapshot.statuses.find(
      item =>
        item.propertyId === propertyId && item.serviceId === serviceId && item.period === period,
    ) ?? {
      propertyId,
      serviceId,
      period,
      tenantReceivedAt: null,
      servicePaidAt: null,
    }
  );
}

export function upsertPeriodStatus(
  snapshot: ServicesSnapshot,
  nextStatus: ServicePeriodStatus,
): ServicesSnapshot {
  const idx = snapshot.statuses.findIndex(
    item =>
      item.propertyId === nextStatus.propertyId &&
      item.serviceId === nextStatus.serviceId &&
      item.period === nextStatus.period,
  );
  const statuses = [...snapshot.statuses];
  if (idx >= 0) statuses[idx] = nextStatus;
  else statuses.push(nextStatus);
  return { ...snapshot, statuses };
}

export function getMonthServicesStatus(snapshot: ServicesSnapshot, period: string): 'complete' | 'pending' | 'empty' {
  const totalServices = snapshot.properties.reduce((sum, property) => sum + property.services.length, 0);
  if (totalServices === 0) return 'empty';

  let completeCount = 0;
  for (const property of snapshot.properties) {
    for (const service of property.services) {
      const status = getPeriodStatus(snapshot, property.id, service.id, period);
      if (status.tenantReceivedAt && status.servicePaidAt) {
        completeCount += 1;
      }
    }
  }

  return completeCount === totalServices ? 'complete' : 'pending';
}

export function periodForYearMonth(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

export function parsePeriod(period: string) {
  const [yearRaw, monthRaw] = period.split('-');
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;
  return {
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
    monthIndex: Number.isFinite(monthIndex) && monthIndex >= 0 && monthIndex < 12 ? monthIndex : new Date().getMonth(),
  };
}

export function toggleStatusField(
  snapshot: ServicesSnapshot,
  propertyId: string,
  serviceId: string,
  period: string,
  field: 'tenantReceivedAt' | 'servicePaidAt',
): ServicesSnapshot {
  const current = getPeriodStatus(snapshot, propertyId, serviceId, period);
  const nextValue = current[field] ? null : todayIsoDate();
  return upsertPeriodStatus(snapshot, { ...current, [field]: nextValue });
}
