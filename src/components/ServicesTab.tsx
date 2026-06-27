import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { MONTHS } from '../constants';
import {
  formatStatusDate,
  getMonthServicesStatus,
  newId,
  parsePeriod,
  periodForYearMonth,
  periodFromDate,
  PROPERTY_TYPE_LABELS,
  toggleStatusField,
} from '../lib/servicesData';
import type { PropertyType, RentalProperty, ServicesSnapshot, ThemePalette } from '../types';
import { Icon, ServicesMonthBarChart } from './ui';

interface ServicesTabProps {
  servicesData: ServicesSnapshot;
  setServicesData: Dispatch<SetStateAction<ServicesSnapshot>>;
  onPersistServices: (data: ServicesSnapshot) => Promise<void>;
  t: ThemePalette;
  accent: string;
  radius: number;
}

export function ServicesTab({
  servicesData,
  setServicesData,
  onPersistServices,
  t,
  accent,
  radius,
}: ServicesTabProps) {
  const [period, setPeriod] = useState(() => periodFromDate(new Date()));
  const [showConfig, setShowConfig] = useState(false);
  const [expandedPropertyId, setExpandedPropertyId] = useState<string | null>(null);

  const [newPropertyName, setNewPropertyName] = useState('');
  const [newPropertyType, setNewPropertyType] = useState<PropertyType>('casa');
  const [newServiceByProperty, setNewServiceByProperty] = useState<Record<string, { name: string; type: string }>>({});

  const persist = (updater: (prev: ServicesSnapshot) => ServicesSnapshot) => {
    setServicesData(prev => {
      const next = updater(prev);
      queueMicrotask(() => void onPersistServices(next));
      return next;
    });
  };

  const properties = servicesData.properties;
  const { year: selectedYear, monthIndex: selectedMonthIndex } = parsePeriod(period);
  const now = useMemo(() => new Date(), []);

  const monthlyData = useMemo(
    () =>
      Array.from({ length: 12 }, (_, monthIndex) => {
        const monthPeriod = periodForYearMonth(selectedYear, monthIndex);
        return {
          label: MONTHS[monthIndex],
          status: getMonthServicesStatus(servicesData, monthPeriod),
          current: monthIndex === now.getMonth() && selectedYear === now.getFullYear(),
          monthIndex,
        };
      }),
    [selectedYear, servicesData, now],
  );

  const handleAddProperty = () => {
    const name = newPropertyName.trim();
    if (!name) return;
    persist(prev => ({
      ...prev,
      properties: [
        ...prev.properties,
        {
          id: newId('prop'),
          name,
          type: newPropertyType,
          services: [],
        },
      ],
    }));
    setNewPropertyName('');
    setNewPropertyType('casa');
  };

  const handleDeleteProperty = (propertyId: string) => {
    persist(prev => ({
      properties: prev.properties.filter(property => property.id !== propertyId),
      statuses: prev.statuses.filter(status => status.propertyId !== propertyId),
    }));
  };

  const handleAddService = (propertyId: string) => {
    const draft = newServiceByProperty[propertyId] || { name: '', type: '' };
    const name = draft.name.trim();
    const serviceType = draft.type.trim();
    if (!name) return;

    persist(prev => ({
      ...prev,
      properties: prev.properties.map(property => {
        if (property.id !== propertyId) return property;
        return {
          ...property,
          services: [
            ...property.services,
            { id: newId('svc'), name, serviceType: serviceType || 'otro' },
          ],
        };
      }),
    }));
    setNewServiceByProperty(prev => ({ ...prev, [propertyId]: { name: '', type: '' } }));
  };

  const handleDeleteService = (propertyId: string, serviceId: string) => {
    persist(prev => ({
      properties: prev.properties.map(property => {
        if (property.id !== propertyId) return property;
        return {
          ...property,
          services: property.services.filter(service => service.id !== serviceId),
        };
      }),
      statuses: prev.statuses.filter(
        status => !(status.propertyId === propertyId && status.serviceId === serviceId),
      ),
    }));
  };

  const handleToggle = (
    propertyId: string,
    serviceId: string,
    field: 'tenantReceivedAt' | 'servicePaidAt',
  ) => {
    persist(prev => toggleStatusField(prev, propertyId, serviceId, period, field));
  };

  const renderStatusRow = (property: RentalProperty, serviceId: string, serviceName: string, serviceType: string) => {
    const status =
      servicesData.statuses.find(
        item =>
          item.propertyId === property.id && item.serviceId === serviceId && item.period === period,
      ) ?? {
        propertyId: property.id,
        serviceId,
        period,
        tenantReceivedAt: null,
        servicePaidAt: null,
      };

    const rowStyle = {
      background: t.card,
      borderRadius: radius * 0.75,
      padding: '12px 14px',
      border: `1px solid ${t.border}`,
    };

    const checkboxRow = (
      field: 'tenantReceivedAt' | 'servicePaidAt',
      label: string,
      checked: boolean,
      dateValue: string | null,
    ) => (
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          marginTop: 8,
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={() => handleToggle(property.id, serviceId, field)}
          style={{ width: 18, height: 18, accentColor: accent }}
        />
        <span style={{ flex: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontSize: 14, color: t.text, fontWeight: 500 }}>{label}</span>
          {checked && dateValue && (
            <span style={{ fontSize: 12, color: t.textSecondary }}>
              {formatStatusDate(dateValue)}
            </span>
          )}
        </span>
      </label>
    );

    return (
      <div key={serviceId} style={rowStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{serviceName}</div>
            <div style={{ fontSize: 12, color: t.textSecondary, marginTop: 2 }}>{serviceType}</div>
          </div>
        </div>
        {checkboxRow(
          'tenantReceivedAt',
          'Cobré al inquilino',
          Boolean(status.tenantReceivedAt),
          status.tenantReceivedAt,
        )}
        {checkboxRow(
          'servicePaidAt',
          'Pagué el servicio',
          Boolean(status.servicePaidAt),
          status.servicePaidAt,
        )}
      </div>
    );
  };

  const renderPropertyCard = (property: RentalProperty) => {
    const expanded = expandedPropertyId === property.id;
    const doneCount = property.services.filter(service => {
      const status = servicesData.statuses.find(
        item =>
          item.propertyId === property.id && item.serviceId === service.id && item.period === period,
      );
      return Boolean(status?.tenantReceivedAt && status?.servicePaidAt);
    }).length;

    return (
      <div
        key={property.id}
        style={{
          background: t.card,
          borderRadius: radius * 0.75,
          border: `1px solid ${t.border}`,
          overflow: 'hidden',
        }}
      >
        <button
          type="button"
          onClick={() => setExpandedPropertyId(expanded ? null : property.id)}
          style={{
            width: '100%',
            border: 'none',
            background: 'transparent',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{ fontSize: 22 }}>{property.type === 'casa' ? '🏠' : '🏢'}</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: t.text }}>{property.name}</span>
            <span style={{ display: 'block', fontSize: 12, color: t.textSecondary, marginTop: 2 }}>
              {PROPERTY_TYPE_LABELS[property.type]} · {doneCount}/{property.services.length} completos
            </span>
          </span>
          <span style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(-90deg)', display: 'flex' }}>
            <Icon name="chevronDown" size={18} color={t.textSecondary} />
          </span>
        </button>

        {expanded && (
          <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {property.services.length === 0 ? (
              <div style={{ fontSize: 13, color: t.textSecondary, padding: '8px 4px' }}>
                Sin servicios configurados. Andá a Configurar para agregarlos.
              </div>
            ) : (
              property.services.map(service =>
                renderStatusRow(property, service.id, service.name, service.serviceType),
              )
            )}
          </div>
        )}
      </div>
    );
  };

  const renderConfig = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: t.card, borderRadius: radius * 0.75, padding: '12px 14px', border: `1px solid ${t.border}` }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 8 }}>Nueva propiedad</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            value={newPropertyName}
            onChange={event => setNewPropertyName(event.target.value)}
            placeholder="Nombre (ej. Casa 116)"
            style={{
              flex: 1,
              fontSize: 14,
              padding: '8px 10px',
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              background: t.inputBg,
              color: t.text,
            }}
          />
          <select
            value={newPropertyType}
            onChange={event => setNewPropertyType(event.target.value as PropertyType)}
            style={{
              fontSize: 14,
              padding: '8px 10px',
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              background: t.inputBg,
              color: t.text,
            }}
          >
            <option value="casa">Casa</option>
            <option value="depto">Depto</option>
          </select>
        </div>
        <button
          onClick={handleAddProperty}
          style={{
            padding: '8px 12px',
            background: accent,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Agregar propiedad
        </button>
      </div>

      {properties.map(property => {
        const draft = newServiceByProperty[property.id] || { name: '', type: '' };
        return (
          <div
            key={property.id}
            style={{
              background: t.card,
              borderRadius: radius * 0.75,
              padding: '12px 14px',
              border: `1px solid ${t.border}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{property.name}</div>
                <div style={{ fontSize: 12, color: t.textSecondary }}>{PROPERTY_TYPE_LABELS[property.type]}</div>
              </div>
              <button
                onClick={() => handleDeleteProperty(property.id)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }}
                aria-label={`Borrar ${property.name}`}
              >
                <Icon name="trash" size={16} color="#dc2626" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {property.services.map(service => (
                <div
                  key={service.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 8px',
                    background: t.inputBg,
                    borderRadius: 8,
                  }}
                >
                  <span style={{ fontSize: 13, color: t.text }}>
                    {service.name} <span style={{ color: t.textSecondary }}>({service.serviceType})</span>
                  </span>
                  <button
                    onClick={() => handleDeleteService(property.id, service.id)}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                    aria-label={`Borrar servicio ${service.name}`}
                  >
                    <Icon name="x" size={14} color={t.textSecondary} />
                  </button>
                </div>
              ))}
              {property.services.length === 0 && (
                <span style={{ fontSize: 12, color: t.textSecondary }}>Sin servicios</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={draft.name}
                onChange={event =>
                  setNewServiceByProperty(prev => ({
                    ...prev,
                    [property.id]: { ...draft, name: event.target.value },
                  }))
                }
                placeholder="Nombre (ej. Naturgy)"
                style={{
                  flex: 1,
                  fontSize: 14,
                  padding: '8px 10px',
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                  background: t.inputBg,
                  color: t.text,
                }}
              />
              <input
                value={draft.type}
                onChange={event =>
                  setNewServiceByProperty(prev => ({
                    ...prev,
                    [property.id]: { ...draft, type: event.target.value },
                  }))
                }
                placeholder="Tipo (ej. gas)"
                style={{
                  width: 110,
                  fontSize: 14,
                  padding: '8px 10px',
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                  background: t.inputBg,
                  color: t.text,
                }}
              />
              <button
                onClick={() => handleAddService(property.id)}
                style={{
                  padding: '8px 10px',
                  background: accent,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                +
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary }}>
          SERVICIOS — {selectedYear}
        </div>
        <button
          onClick={() => setShowConfig(value => !value)}
          style={{
            border: `1px solid ${showConfig ? accent : t.border}`,
            background: showConfig ? `${accent}14` : t.card,
            color: showConfig ? accent : t.textSecondary,
            borderRadius: 10,
            padding: '8px 12px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {showConfig ? 'Ver mes' : 'Configurar'}
        </button>
      </div>

      {!showConfig && (
        <div
          style={{
            background: t.card,
            borderRadius: radius * 0.75,
            padding: '12px 8px',
            marginBottom: 14,
            border: `1px solid ${t.border}`,
          }}
        >
          <ServicesMonthBarChart
            monthlyData={monthlyData}
            accent={accent}
            selectedIndex={selectedMonthIndex}
            onSelect={monthIndex => setPeriod(periodForYearMonth(selectedYear, monthIndex))}
          />
        </div>
      )}

      {showConfig ? (
        renderConfig()
      ) : properties.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            color: t.textSecondary,
            padding: '40px 16px',
            fontSize: 14,
            background: t.card,
            borderRadius: radius * 0.75,
            border: `1px solid ${t.border}`,
          }}
        >
          Todavía no hay propiedades. Tocá <strong>Configurar</strong> para agregar casas, deptos y sus servicios.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{properties.map(renderPropertyCard)}</div>
      )}

      {!showConfig && properties.length > 0 && (
        <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 14, marginBottom: 8, lineHeight: 1.5 }}>
          Marcá cada casilla cuando cobres al inquilino o pagues el servicio. Se guarda la fecha automáticamente.
        </div>
      )}
    </div>
  );
}
