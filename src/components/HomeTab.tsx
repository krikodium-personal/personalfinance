import { useEffect, useState } from 'react';
import { CATEGORIES, MONTHS } from '../constants';
import type { Category, ThemePalette, Transaction } from '../types';
import { fmt, parseTxDate } from '../utils';
import { Icon, Spinner } from './ui';

interface HomeTabProps {
  transactions: Transaction[];
  categories: Category[];
  loading: boolean;
  t: ThemePalette;
  accent: string;
  radius: number;
  onDelete: (id: string | string[]) => void;
  onEdit: (tx: Transaction) => void;
  onAddDateContextChange?: (date: string | null) => void;
}

const fallbackCategory: Category = { id: 'other', label: 'Otras', icon: '📦', color: '#a0a0a0', subcategories: [] };
const usdSaleExpensePrefix = 'Venta USD a ';
const usdSaleIncomePrefix = 'Ingreso ARS por venta USD a ';

type DisplayItem =
  | { kind: 'single'; tx: Transaction }
  | { kind: 'dollar_sale'; expenseUsd: Transaction; incomeArs: Transaction; vendor: string; timestamp: Date };

const extractSaleVendor = (tx: Transaction): string | null => {
  const firstSegment = (tx.desc || '').split(' · ')[0]?.trim() || '';
  if (!firstSegment) return null;
  if (firstSegment.startsWith(usdSaleIncomePrefix)) {
    return firstSegment.slice(usdSaleIncomePrefix.length).trim() || null;
  }
  if (firstSegment.startsWith(usdSaleExpensePrefix)) {
    return firstSegment.slice(usdSaleExpensePrefix.length).trim() || null;
  }
  return null;
};

export function HomeTab({ transactions, categories, loading, t, accent, radius, onDelete, onEdit, onAddDateContextChange }: HomeTabProps) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const [filterMonth, setFilterMonth] = useState(now.getMonth());
  const [balanceView, setBalanceView] = useState<'monthly' | 'annual'>('monthly');
  const [selectedDollarSale, setSelectedDollarSale] = useState<DisplayItem | null>(null);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [pendingDeleteLabel, setPendingDeleteLabel] = useState('');
  const filterYear = currentYear;

  useEffect(() => {
    if (!onAddDateContextChange) return;
    const isCurrentMonth = filterMonth === currentMonth && filterYear === currentYear;
    if (isCurrentMonth) {
      onAddDateContextChange(null);
      return;
    }
    const month = String(filterMonth + 1).padStart(2, '0');
    onAddDateContextChange(`${filterYear}-${month}-01`);
  }, [currentMonth, currentYear, filterMonth, filterYear, onAddDateContextChange]);

  const filtered = transactions.filter(tx => {
    const d = parseTxDate(tx.date);
    return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
  });

  const arsIncomeMonth = filtered.filter(tx => tx.type === 'income' && tx.currency !== 'USD').reduce((s, tx) => s + tx.amount, 0);
  const arsExpenseMonth = filtered.filter(tx => tx.type === 'expense' && tx.currency !== 'USD').reduce((s, tx) => s + tx.amount, 0);
  const usdIncomeMonth = filtered.filter(tx => tx.type === 'income' && tx.currency === 'USD').reduce((s, tx) => s + tx.amount, 0);
  const usdExpenseMonth = filtered.filter(tx => tx.type === 'expense' && tx.currency === 'USD').reduce((s, tx) => s + tx.amount, 0);
  const yearly = transactions.filter(tx => parseTxDate(tx.date).getFullYear() === filterYear);
  const arsIncomeYear = yearly.filter(tx => tx.type === 'income' && tx.currency !== 'USD').reduce((s, tx) => s + tx.amount, 0);
  const arsExpenseYear = yearly.filter(tx => tx.type === 'expense' && tx.currency !== 'USD').reduce((s, tx) => s + tx.amount, 0);
  const usdIncomeYear = yearly.filter(tx => tx.type === 'income' && tx.currency === 'USD').reduce((s, tx) => s + tx.amount, 0);
  const usdExpenseYear = yearly.filter(tx => tx.type === 'expense' && tx.currency === 'USD').reduce((s, tx) => s + tx.amount, 0);

  const arsIncome = balanceView === 'monthly' ? arsIncomeMonth : arsIncomeYear;
  const arsExpense = balanceView === 'monthly' ? arsExpenseMonth : arsExpenseYear;
  const usdIncome = balanceView === 'monthly' ? usdIncomeMonth : usdIncomeYear;
  const usdExpense = balanceView === 'monthly' ? usdExpenseMonth : usdExpenseYear;
  const arsNet = arsIncome - arsExpense;
  const usdNet = usdIncome - usdExpense;
  const balanceLabel = balanceView === 'monthly' ? 'BALANCE DEL MES' : `BALANCE ANUAL ${filterYear}`;

  const sorted = [...filtered].sort(
    (a, b) =>
      new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime(),
  );

  const displayItems: DisplayItem[] = [];
  const usedTxIds = new Set<string>();

  const askDelete = (ids: string[], label: string) => {
    setPendingDeleteIds(ids);
    setPendingDeleteLabel(label);
  };

  sorted.forEach(tx => {
    if (usedTxIds.has(tx.id)) return;

    const vendor = extractSaleVendor(tx);
    if (!vendor) {
      displayItems.push({ kind: 'single', tx });
      usedTxIds.add(tx.id);
      return;
    }

    const isExpenseUsd = tx.type === 'expense' && tx.currency === 'USD';
    const isIncomeArs = tx.type === 'income' && tx.currency !== 'USD';
    if (!isExpenseUsd && !isIncomeArs) {
      displayItems.push({ kind: 'single', tx });
      usedTxIds.add(tx.id);
      return;
    }

    const pair = sorted.find(candidate => {
      if (candidate.id === tx.id || usedTxIds.has(candidate.id)) return false;
      if (candidate.date !== tx.date) return false;
      if (extractSaleVendor(candidate) !== vendor) return false;
      return (
        (isExpenseUsd && candidate.type === 'income' && candidate.currency !== 'USD') ||
        (isIncomeArs && candidate.type === 'expense' && candidate.currency === 'USD')
      );
    });

    if (!pair) {
      displayItems.push({ kind: 'single', tx });
      usedTxIds.add(tx.id);
      return;
    }

    const expenseUsd = isExpenseUsd ? tx : pair;
    const incomeArs = isIncomeArs ? tx : pair;
    const txDate = new Date(tx.createdAt || tx.date).getTime();
    const pairDate = new Date(pair.createdAt || pair.date).getTime();
    displayItems.push({
      kind: 'dollar_sale',
      expenseUsd,
      incomeArs,
      vendor,
      timestamp: new Date(Math.max(txDate, pairDate)),
    });
    usedTxIds.add(tx.id);
    usedTxIds.add(pair.id);
  });

  return (
    <div style={{ padding: '0 16px' }}>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '16px 0' }}>
        {MONTHS.map((m, i) => (
          (() => {
            const isSelected = filterMonth === i;
            const isCurrentMonth = i === now.getMonth();
            return (
              <button
                key={m}
                onClick={() => setFilterMonth(i)}
                style={{
                  flexShrink: 0,
                  padding: '6px 14px',
                  border: isCurrentMonth && !isSelected ? `1px solid ${accent}` : 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: isCurrentMonth ? 700 : 500,
                  borderRadius: 20,
                  background: isSelected ? accent : isCurrentMonth ? `${accent}1a` : t.inputBg,
                  color: isSelected ? '#fff' : isCurrentMonth ? accent : t.textSecondary,
                }}
              >
                {m}
              </button>
            );
          })()
        ))}
      </div>

      <div style={{ background: t.card, borderRadius: radius, marginBottom: 12, overflow: 'hidden' }}>
        <div style={{ background: accent, padding: 24, color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 500 }}>{balanceLabel}</div>
            <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.16)', padding: 3, borderRadius: 999 }}>
              <button
                onClick={() => setBalanceView('monthly')}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 999,
                  padding: '5px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  background: balanceView === 'monthly' ? '#fff' : 'transparent',
                  color: balanceView === 'monthly' ? accent : '#fff',
                }}
              >
                Mensual
              </button>
              <button
                onClick={() => setBalanceView('annual')}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 999,
                  padding: '5px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  background: balanceView === 'annual' ? '#fff' : 'transparent',
                  color: balanceView === 'annual' ? accent : '#fff',
                }}
              >
                Anual
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.85 }}>ARS</span>
              <span style={{ fontSize: 'clamp(21px, 6.2vw, 36px)', fontWeight: 700, letterSpacing: -1, whiteSpace: 'nowrap', lineHeight: 1.05 }}>
                {fmt(arsNet, 'ARS')}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.85 }}>USD</span>
              <span style={{ fontSize: 'clamp(21px, 6.2vw, 36px)', fontWeight: 700, letterSpacing: -1, whiteSpace: 'nowrap', lineHeight: 1.05 }}>
                {fmt(usdNet, 'USD')}
              </span>
            </div>
          </div>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: t.textSecondary }}>
              <span style={{ color: '#16a34a', fontWeight: 700 }}>↑</span> ARS Ingresos
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: t.text, whiteSpace: 'nowrap' }}>{fmt(arsIncome, 'ARS')}</div>
          </div>
          <div style={{ width: 1, background: t.border }} />
          <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: t.textSecondary }}>
              <span style={{ color: '#dc2626', fontWeight: 700 }}>↓</span> ARS Gastos
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: t.text, whiteSpace: 'nowrap' }}>{fmt(arsExpense, 'ARS')}</div>
          </div>
        </div>
          <div style={{ height: 1, background: t.border, margin: '12px 0' }} />
          <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: t.textSecondary }}>
              <span style={{ color: '#16a34a', fontWeight: 700 }}>↑</span> USD Ingresos
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: t.text, whiteSpace: 'nowrap' }}>{fmt(usdIncome, 'USD')}</div>
          </div>
          <div style={{ width: 1, background: t.border }} />
          <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: t.textSecondary }}>
              <span style={{ color: '#dc2626', fontWeight: 700 }}>↓</span> USD Gastos
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: t.text, whiteSpace: 'nowrap' }}>{fmt(usdExpense, 'USD')}</div>
          </div>
        </div>
        </div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 12, marginTop: 4 }}>MOVIMIENTOS</div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
          <Spinner color={accent} />
        </div>
      )}

      {!loading && displayItems.length === 0 && (
        <div style={{ textAlign: 'center', color: t.textSecondary, padding: '40px 0', fontSize: 14 }}>No hay movimientos este mes</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {displayItems.map(item => {
          if (item.kind === 'dollar_sale') {
            const timestampLabel = `${item.timestamp.getDate()} ${MONTHS[item.timestamp.getMonth()]} ${item.timestamp.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
            return (
              <div
                key={`${item.expenseUsd.id}-${item.incomeArs.id}`}
                onClick={() => setSelectedDollarSale(item)}
                style={{ background: t.card, borderRadius: radius * 0.75, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    background: '#166534',
                  }}
                >
                  <Icon name="exchange" size={18} color="#fff" />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Venta USD a {item.vendor}
                  </div>
                  <div style={{ marginTop: 2, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Operación cambio</span>
                    <span style={{ fontSize: 12, color: t.textSecondary }}>· {timestampLabel}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: accent }}>+{fmt(item.incomeArs.amount, 'ARS')}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: t.text }}>-{fmt(item.expenseUsd.amount, 'USD')}</div>
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      askDelete([item.expenseUsd.id, item.incomeArs.id], `la operación “Venta USD a ${item.vendor}”`);
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textSecondary, opacity: 0.5 }}
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </div>
              </div>
            );
          }
          const tx = item.tx;
          const cat =
            categories.find(category => category.id === tx.category) ||
            CATEGORIES.find(category => category.id === tx.category) ||
            fallbackCategory;
          const created = new Date(tx.createdAt || tx.date);
          const timestampLabel = `${created.getDate()} ${MONTHS[created.getMonth()]} ${created.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;

          return (
            <div
              key={tx.id}
              onClick={() => onEdit(tx)}
              style={{ background: t.card, borderRadius: radius * 0.75, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  flexShrink: 0,
                  background: tx.type === 'income' ? `${accent}20` : `${cat.color}18`,
                }}
              >
                {tx.type === 'income' ? '💰' : cat.icon}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.desc}</div>
                <div style={{ marginTop: 2, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{tx.type === 'income' ? 'Ingreso' : cat.label}</span>
                  <span style={{ fontSize: 12, color: t.textSecondary }}>· {timestampLabel}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: tx.type === 'income' ? accent : t.text }}>
                  {tx.type === 'income' ? '+' : '-'}
                  {fmt(tx.amount, tx.currency)}
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    askDelete([tx.id], 'este movimiento');
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textSecondary, opacity: 0.5 }}
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedDollarSale && selectedDollarSale.kind === 'dollar_sale' && (
        <div
          onClick={() => setSelectedDollarSale(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 120 }}
        >
          <div
            onClick={event => event.stopPropagation()}
            style={{ width: '100%', maxWidth: 390, margin: '0 12px 20px', background: t.card, borderRadius: radius, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: t.text }}>Detalle venta de dólares</div>
              <button onClick={() => setSelectedDollarSale(null)} style={{ border: 'none', background: 'none', color: t.textSecondary, cursor: 'pointer' }}>
                <Icon name="x" size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: t.textSecondary }}>Comprador</span>
              <span style={{ color: t.text, fontWeight: 600 }}>{selectedDollarSale.vendor}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: t.textSecondary }}>USD vendidos</span>
              <span style={{ color: t.text, fontWeight: 600 }}>{fmt(selectedDollarSale.expenseUsd.amount, 'USD')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: t.textSecondary }}>ARS recibidos</span>
              <span style={{ color: accent, fontWeight: 700 }}>{fmt(selectedDollarSale.incomeArs.amount, 'ARS')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: t.textSecondary }}>Fecha</span>
              <span style={{ color: t.text, fontWeight: 600 }}>
                {new Date(selectedDollarSale.incomeArs.date).toLocaleDateString('es-AR')}
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedDollarSale(null);
                askDelete(
                  [selectedDollarSale.expenseUsd.id, selectedDollarSale.incomeArs.id],
                  `la operación “Venta USD a ${selectedDollarSale.vendor}”`,
                );
              }}
              style={{ marginTop: 6, border: 'none', background: '#dc2626', color: '#fff', borderRadius: 10, padding: '10px 12px', cursor: 'pointer', fontWeight: 600 }}
            >
              Borrar operación completa
            </button>
          </div>
        </div>
      )}

      {pendingDeleteIds && (
        <div
          onClick={() => {
            setPendingDeleteIds(null);
            setPendingDeleteLabel('');
          }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 130 }}
        >
          <div
            onClick={event => event.stopPropagation()}
            style={{ width: '100%', maxWidth: 360, margin: '0 16px', background: t.card, borderRadius: radius * 0.75, padding: 16 }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 8 }}>Confirmar borrado</div>
            <div style={{ fontSize: 13, color: t.textSecondary, marginBottom: 14 }}>
              ¿Seguro que querés borrar {pendingDeleteLabel || 'este elemento'}? Esta acción no se puede deshacer.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => {
                  setPendingDeleteIds(null);
                  setPendingDeleteLabel('');
                }}
                style={{ border: 'none', background: t.inputBg, color: t.textSecondary, borderRadius: 8, padding: '7px 12px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDelete(pendingDeleteIds);
                  setPendingDeleteIds(null);
                  setPendingDeleteLabel('');
                }}
                style={{ border: 'none', background: '#dc2626', color: '#fff', borderRadius: 8, padding: '7px 12px', cursor: 'pointer' }}
              >
                Borrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
