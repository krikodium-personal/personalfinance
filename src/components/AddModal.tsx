import { useEffect, useMemo, useState } from 'react';
import type { Category, Currency, ThemePalette, Transaction, TxType } from '../types';
import { arsFromUsdSaleBlueMid, blueMid, fetchDolarHoyRates, type DollarRates } from '../lib/dolarRates';
import { fmt } from '../utils';
import { Icon, Spinner } from './ui';

type EntryMode = 'expense' | 'income' | 'dollar_sale';

interface AddModalProps {
  onClose: () => void;
  onSubmit: (tx: Omit<Transaction, 'id'>) => Promise<{ ok: boolean; error?: string }>;
  /** Venta de USD por ARS: guarda gasto en USD + ingreso en ARS (solo modal nuevo). La categoría es fija en servidor. */
  onSubmitDollarSale?: (payload: {
    usdAmount: number;
    arsAmount: number;
    descExpenseUsd: string;
    descIncomeArs: string;
    date: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  categories: Category[];
  t: ThemePalette;
  accent: string;
  radius: number;
  initialTransaction?: Transaction | null;
}

function modeFromTx(tx: Transaction): 'expense' | 'income' {
  return tx.type === 'income' ? 'income' : 'expense';
}

export function AddModal({
  onClose,
  onSubmit,
  onSubmitDollarSale,
  categories,
  t,
  accent,
  radius,
  initialTransaction = null,
}: AddModalProps) {
  const isEdit = Boolean(initialTransaction);
  const descParts = initialTransaction?.desc?.split(' · ') || [];
  const initialSubcategory = descParts[0] || '';
  const initialDescription = descParts.slice(1).join(' · ');

  const [entryMode, setEntryMode] = useState<EntryMode>(() =>
    initialTransaction ? modeFromTx(initialTransaction) : 'expense',
  );
  const [type, setType] = useState<TxType>(initialTransaction?.type || 'expense');
  const [amount, setAmount] = useState(
    initialTransaction?.amount
      ? initialTransaction.amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '',
  );
  const [currency, setCurrency] = useState<Currency>(initialTransaction?.currency || 'ARS');
  const [subcategory, setSubcategory] = useState(initialSubcategory);
  const [description, setDescription] = useState(initialDescription);
  const [category, setCategory] = useState(initialTransaction?.category || '');
  const [date, setDate] = useState(
    initialTransaction ? new Date(initialTransaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [usdSellAmount, setUsdSellAmount] = useState('');
  const [vendor, setVendor] = useState('');
  const [rates, setRates] = useState<DollarRates | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState('');

  const loadRates = async () => {
    setRatesLoading(true);
    setRatesError('');
    try {
      const next = await fetchDolarHoyRates();
      setRates(next);
    } catch (err) {
      setRates(null);
      setRatesError(err instanceof Error ? err.message : 'No se pudieron cargar las cotizaciones.');
    } finally {
      setRatesLoading(false);
    }
  };

  useEffect(() => {
    void loadRates();
  }, []);

  const formatAmountInput = (value: string) => {
    const cleaned = value.replace(/[^\d,]/g, '');
    const parts = cleaned.split(',');
    const intRaw = parts[0] || '';
    const decRaw = parts.slice(1).join('');

    const intFormatted = intRaw
      ? Number(intRaw).toLocaleString('es-AR').replace(/,/g, '.')
      : '';

    if (parts.length > 1) {
      return `${intFormatted},${decRaw.slice(0, 2)}`;
    }

    return intFormatted;
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    border: `1.5px solid ${t.border}`,
    borderRadius: radius * 0.6,
    background: t.inputBg,
    color: t.text,
    fontSize: 15,
    outline: 'none',
  };

  const selectedCategory = categories.find(item => item.id === category) || null;
  const subcategoryOptions = selectedCategory?.subcategories || [];

  const usdNumeric = useMemo(() => {
    const normalized = usdSellAmount.replace(/\./g, '').replace(',', '.');
    const n = Number(normalized);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [usdSellAmount]);

  const arsFromSale = useMemo(() => {
    if (!rates || usdNumeric <= 0) return 0;
    return Math.round(arsFromUsdSaleBlueMid(usdNumeric, rates.blue) * 100) / 100;
  }, [rates, usdNumeric]);

  const syncEntryModeToType = (mode: EntryMode) => {
    setEntryMode(mode);
    if (mode === 'expense') setType('expense');
    else if (mode === 'income') setType('income');
  };

  const buildDescPair = (vendorTrimmed: string, trimmedDescription: string) => {
    const tailUsd = `Venta USD a ${vendorTrimmed}`;
    const tailArs = `Ingreso ARS por venta USD a ${vendorTrimmed}`;
    if (trimmedDescription) {
      return {
        usd: `${tailUsd} · ${trimmedDescription}`,
        ars: `${tailArs} · ${trimmedDescription}`,
      };
    }
    return { usd: tailUsd, ars: tailArs };
  };

  const submitDollarSale = async () => {
    setFormError('');
    if (!onSubmitDollarSale) {
      setFormError('Esta acción no está disponible al editar.');
      return;
    }
    if (!usdNumeric || usdNumeric <= 0) {
      setFormError('Ingresá cuántos dólares vendés.');
      return;
    }
    const vendorTrimmed = vendor.trim();
    if (!vendorTrimmed) {
      setFormError('Indicá a quién le vendiste.');
      return;
    }
    if (!rates) {
      setFormError('No hay cotización del dólar blue. Probá actualizar o intentá más tarde.');
      return;
    }
    const arsAmount = Math.round(arsFromUsdSaleBlueMid(usdNumeric, rates.blue) * 100) / 100;
    if (arsAmount <= 0) {
      setFormError('El monto en pesos no es válido.');
      return;
    }

    const trimmedDescription = description.trim();
    const { usd: descExpenseUsd, ars: descIncomeArs } = buildDescPair(vendorTrimmed, trimmedDescription);

    setSaving(true);
    const result = await onSubmitDollarSale({
      usdAmount: usdNumeric,
      arsAmount,
      descExpenseUsd,
      descIncomeArs,
      date: new Date(date).toISOString(),
    });
    setSaving(false);
    if (!result.ok) {
      setFormError(result.error || 'No se pudo guardar la operación.');
      return;
    }
    onClose();
  };

  const submit = async () => {
    if (entryMode === 'dollar_sale') {
      await submitDollarSale();
      return;
    }

    setFormError('');
    const normalizedAmount = amount.replace(/\./g, '').replace(',', '.');
    const num = Number(normalizedAmount);
    if (!num || num <= 0) {
      setFormError('Ingresá un monto válido mayor a 0.');
      return;
    }
    if (!category) {
      setFormError('Seleccioná una categoría.');
      return;
    }
    setSaving(true);
    const trimmedDescription = description.trim();
    const composedDescription =
      subcategory && trimmedDescription
        ? `${subcategory} · ${trimmedDescription}`
        : subcategory || trimmedDescription;
    const result = await onSubmit({
      type,
      category,
      amount: num,
      currency,
      desc: composedDescription,
      date: new Date(date).toISOString(),
    });
    setSaving(false);
    if (!result.ok) {
      setFormError(result.error || 'No se pudo guardar la transacción.');
      return;
    }
    onClose();
  };

  const toggleModes: EntryMode[] = isEdit ? ['expense', 'income'] : ['expense', 'income', 'dollar_sale'];

  const toggleLabel = (mode: EntryMode) => {
    if (mode === 'expense') return 'Gasto';
    if (mode === 'income') return 'Ingreso';
    return 'Dólares';
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 100,
        backdropFilter: 'blur(4px)',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 390,
          maxHeight: '92vh',
          overflowY: 'auto',
          background: t.card,
          borderRadius: radius,
          padding: 24,
          paddingBottom: 30,
          margin: '0 12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: t.text }}>
            {initialTransaction ? 'Editar transacción' : 'Nueva transacción'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textSecondary }}>
            <Icon name="x" size={22} />
          </button>
        </div>

        <div style={{ display: 'flex', background: t.inputBg, borderRadius: radius * 0.6, padding: 3, marginBottom: 20 }}>
          {toggleModes.map(mode => (
            <button
              key={mode}
              onClick={() => syncEntryModeToType(mode)}
              style={{
                flex: 1,
                padding: '9px 4px',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                borderRadius: radius * 0.5,
                background: entryMode === mode ? accent : 'transparent',
                color: entryMode === mode ? '#fff' : t.textSecondary,
              }}
            >
              {toggleLabel(mode)}
            </button>
          ))}
        </div>

        {entryMode === 'dollar_sale' && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: t.textSecondary, display: 'block', marginBottom: 6, fontWeight: 500 }}>
                Cantidad de dólares a vender: <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                style={inputStyle}
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={usdSellAmount}
                onChange={e => setUsdSellAmount(formatAmountInput(e.target.value))}
              />
              {ratesLoading && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: t.textSecondary }}>
                  <Spinner color={accent} /> Cotización blue…
                </div>
              )}
              {!ratesLoading && ratesError && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 13, color: '#b42318', marginBottom: 6 }}>{ratesError}</div>
                  <button
                    type="button"
                    onClick={() => void loadRates()}
                    style={{
                      border: `1px solid ${accent}`,
                      background: 'transparent',
                      color: accent,
                      borderRadius: 8,
                      padding: '6px 12px',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    Reintentar
                  </button>
                </div>
              )}
              {!ratesLoading && rates && usdNumeric > 0 && (
                <div style={{ marginTop: 12, padding: '12px 14px', background: t.inputBg, borderRadius: radius * 0.6, border: `1px solid ${t.border}` }}>
                  <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 4 }}>Equivale a (dólar blue intermedio)</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: t.text }}>{fmt(arsFromSale, 'ARS')}</div>
                  <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 6 }}>
                    Tipo intermedio: {fmt(blueMid(rates.blue), 'ARS')} por USD · Fuente: dolarhoy.com
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: t.textSecondary, display: 'block', marginBottom: 6, fontWeight: 500 }}>
                A quién le vendí: <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                style={inputStyle}
                type="text"
                placeholder="Nombre o referencia"
                value={vendor}
                onChange={e => setVendor(e.target.value)}
                autoCapitalize="sentences"
              />
            </div>
          </>
        )}

        {entryMode !== 'dollar_sale' && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: t.textSecondary, display: 'block', marginBottom: 6, fontWeight: 500 }}>
              MONTO <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ display: 'flex', background: t.inputBg, borderRadius: radius * 0.6, padding: 3, flexShrink: 0 }}>
                {(['ARS', 'USD'] as const).map(cur => (
                  <button
                    key={cur}
                    onClick={() => setCurrency(cur)}
                    style={{
                      padding: '8px 12px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                      borderRadius: radius * 0.45,
                      background: currency === cur ? accent : 'transparent',
                      color: currency === cur ? '#fff' : t.textSecondary,
                    }}
                  >
                    {cur}
                  </button>
                ))}
              </div>
              <input
                style={inputStyle}
                type="text"
                inputMode="decimal"
                placeholder=""
                value={amount}
                onChange={e => setAmount(formatAmountInput(e.target.value))}
              />
            </div>
          </div>
        )}

        {entryMode !== 'dollar_sale' && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: t.textSecondary, display: 'block', marginBottom: 6, fontWeight: 500 }}>
                CATEGORÍA <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                style={inputStyle}
                value={category}
                onChange={e => {
                  setCategory(e.target.value);
                  setSubcategory('');
                }}
              >
                <option value="">Selecciona una opción</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {`${c.icon} ${c.label}`}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: t.textSecondary, display: 'block', marginBottom: 6, fontWeight: 500 }}>
                SUBCATEGORÍA
              </label>
              <select
                style={inputStyle}
                value={subcategory}
                onChange={e => setSubcategory(e.target.value)}
                disabled={!selectedCategory}
              >
                <option value="">{selectedCategory ? 'Selecciona una opción' : 'Primero elegí una categoría'}</option>
                {subcategoryOptions.map(item => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: t.textSecondary, display: 'block', marginBottom: 6, fontWeight: 500 }}>DESCRIPCIÓN</label>
          <input
            style={inputStyle}
            type="text"
            placeholder="Detalle opcional"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, color: t.textSecondary, display: 'block', marginBottom: 6, fontWeight: 500 }}>FECHA</label>
          <input style={inputStyle} type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        {formError && (
          <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 10, background: '#fde8e8', color: '#b42318', fontSize: 13 }}>
            {formError}
          </div>
        )}

        <button
          onClick={submit}
          disabled={saving}
          style={{
            width: '100%',
            padding: '14px',
            background: accent,
            color: '#fff',
            border: 'none',
            borderRadius: radius * 0.7,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            opacity: saving ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {saving ? (
            <>
              <Spinner color="#fff" /> Guardando...
            </>
          ) : initialTransaction ? (
            'Guardar cambios'
          ) : entryMode === 'dollar_sale' ? (
            'Guardar venta USD / ingreso ARS'
          ) : (
            'Guardar'
          )}
        </button>
      </div>
    </div>
  );
}
