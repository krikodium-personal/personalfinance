import { useState } from 'react';
import type { Category, Currency, ThemePalette, Transaction, TxType } from '../types';
import { Icon, Spinner } from './ui';

interface AddModalProps {
  onClose: () => void;
  onAdd: (tx: Omit<Transaction, 'id'>) => Promise<{ ok: boolean; error?: string }>;
  categories: Category[];
  t: ThemePalette;
  accent: string;
  radius: number;
}

export function AddModal({ onClose, onAdd, categories, t, accent, radius }: AddModalProps) {
  const [type, setType] = useState<TxType>('expense');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [subcategory, setSubcategory] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCats, setShowCats] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

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

  const submit = async () => {
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
    if (!subcategory) {
      setFormError('Seleccioná una subcategoría.');
      return;
    }

    setSaving(true);
    const result = await onAdd({
      type,
      category,
      amount: num,
      currency,
      desc: subcategory,
      date: new Date(date).toISOString(),
    });
    setSaving(false);
    if (!result.ok) {
      setFormError(result.error || 'No se pudo guardar la transacción.');
      return;
    }
    onClose();
  };

  return (
    <div
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
          <span style={{ fontSize: 17, fontWeight: 600, color: t.text }}>Nueva transacción</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textSecondary }}>
            <Icon name="x" size={22} />
          </button>
        </div>

        <div style={{ display: 'flex', background: t.inputBg, borderRadius: radius * 0.6, padding: 3, marginBottom: 20 }}>
          {(['expense', 'income'] as const).map(tp => (
            <button
              key={tp}
              onClick={() => setType(tp)}
              style={{
                flex: 1,
                padding: '9px 0',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                borderRadius: radius * 0.5,
                background: type === tp ? accent : 'transparent',
                color: type === tp ? '#fff' : t.textSecondary,
              }}
            >
              {tp === 'expense' ? 'Gasto' : 'Ingreso'}
            </button>
          ))}
        </div>

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

        <div style={{ marginBottom: 14, position: 'relative' }}>
          <label style={{ fontSize: 12, color: t.textSecondary, display: 'block', marginBottom: 6, fontWeight: 500 }}>
            CATEGORÍA <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <button
            onClick={() => setShowCats(!showCats)}
            style={{
              ...inputStyle,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              textAlign: 'left',
              border: `1.5px solid ${showCats ? accent : t.border}`,
            }}
          >
            <span>
              {selectedCategory ? `${selectedCategory.icon} ${selectedCategory.label}` : 'Selecciona una opción'}
            </span>
            <Icon name="chevronDown" size={16} color={t.textSecondary} />
          </button>

          {showCats && (
            <div
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: 0,
                right: 0,
                background: t.card,
                border: `1px solid ${t.border}`,
                borderRadius: radius * 0.6,
                zIndex: 20,
                boxShadow: t.shadow,
                maxHeight: 220,
                overflowY: 'auto',
              }}
            >
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    setCategory(c.id);
                    setSubcategory('');
                    setShowCats(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    color: t.text,
                    fontSize: 14,
                    background: category === c.id ? t.cardAlt : 'transparent',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{c.icon}</span> {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: t.textSecondary, display: 'block', marginBottom: 6, fontWeight: 500 }}>
            SUBCATEGORÍA <span style={{ color: '#dc2626' }}>*</span>
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
          ) : (
            'Guardar'
          )}
        </button>
      </div>
    </div>
  );
}
