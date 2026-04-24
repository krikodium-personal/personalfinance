import { useState } from 'react';
import { MONTHS } from '../constants';
import type { Category, ThemePalette, Transaction } from '../types';
import { fmt } from '../utils';
import { Icon, Spinner } from './ui';

interface HomeTabProps {
  transactions: Transaction[];
  categories: Category[];
  loading: boolean;
  t: ThemePalette;
  accent: string;
  radius: number;
  onDelete: (id: string) => void;
}

const fallbackCategory: Category = { id: 'other', label: 'Otras', icon: '📦', color: '#a0a0a0' };

export function HomeTab({ transactions, categories, loading, t, accent, radius, onDelete }: HomeTabProps) {
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth());
  const [balanceView, setBalanceView] = useState<'monthly' | 'annual'>('monthly');
  const filterYear = now.getFullYear();

  const filtered = transactions.filter(tx => {
    const d = new Date(tx.date);
    return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
  });

  const arsIncomeMonth = filtered.filter(tx => tx.type === 'income' && tx.currency !== 'USD').reduce((s, tx) => s + tx.amount, 0);
  const arsExpenseMonth = filtered.filter(tx => tx.type === 'expense' && tx.currency !== 'USD').reduce((s, tx) => s + tx.amount, 0);
  const usdIncomeMonth = filtered.filter(tx => tx.type === 'income' && tx.currency === 'USD').reduce((s, tx) => s + tx.amount, 0);
  const usdExpenseMonth = filtered.filter(tx => tx.type === 'expense' && tx.currency === 'USD').reduce((s, tx) => s + tx.amount, 0);
  const yearly = transactions.filter(tx => new Date(tx.date).getFullYear() === filterYear);
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
  const balanceValue = arsIncome - arsExpense;
  const balanceLabel = balanceView === 'monthly' ? 'BALANCE DEL MES (ARS)' : `BALANCE ANUAL ${filterYear} (ARS)`;

  const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div style={{ padding: '0 16px' }}>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '16px 0' }}>
        {MONTHS.map((m, i) => (
          <button
            key={m}
            onClick={() => setFilterMonth(i)}
            style={{
              flexShrink: 0,
              padding: '6px 14px',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 20,
              background: filterMonth === i ? accent : t.inputBg,
              color: filterMonth === i ? '#fff' : t.textSecondary,
            }}
          >
            {m}
          </button>
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
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1 }}>{fmt(balanceValue)}</div>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ minWidth: 130 }}>
            <div style={{ fontSize: 11, color: t.textSecondary }}>↑ ARS Ingresos</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{fmt(arsIncome, 'ARS')}</div>
          </div>
          <div style={{ width: 1, background: t.border }} />
          <div style={{ minWidth: 130 }}>
            <div style={{ fontSize: 11, color: t.textSecondary }}>↓ ARS Gastos</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{fmt(arsExpense, 'ARS')}</div>
          </div>
          <div style={{ width: 1, background: t.border }} />
          <div style={{ minWidth: 130 }}>
            <div style={{ fontSize: 11, color: t.textSecondary }}>= ARS Saldo</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: arsNet >= 0 ? accent : '#dc2626' }}>{fmt(arsNet, 'ARS')}</div>
          </div>
        </div>
          <div style={{ height: 1, background: t.border, margin: '12px 0' }} />
          <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ minWidth: 130 }}>
            <div style={{ fontSize: 11, color: t.textSecondary }}>↑ USD Ingresos</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{fmt(usdIncome, 'USD')}</div>
          </div>
          <div style={{ width: 1, background: t.border }} />
          <div style={{ minWidth: 130 }}>
            <div style={{ fontSize: 11, color: t.textSecondary }}>↓ USD Gastos</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{fmt(usdExpense, 'USD')}</div>
          </div>
          <div style={{ width: 1, background: t.border }} />
          <div style={{ minWidth: 130 }}>
            <div style={{ fontSize: 11, color: t.textSecondary }}>= USD Saldo</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: usdNet >= 0 ? accent : '#dc2626' }}>{fmt(usdNet, 'USD')}</div>
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

      {!loading && sorted.length === 0 && (
        <div style={{ textAlign: 'center', color: t.textSecondary, padding: '40px 0', fontSize: 14 }}>No hay movimientos este mes</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map(tx => {
          const cat = categories.find(category => category.id === tx.category) || fallbackCategory;
          const d = new Date(tx.date);

          return (
            <div key={tx.id} style={{ background: t.card, borderRadius: radius * 0.75, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
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
                <div style={{ fontSize: 12, color: t.textSecondary, marginTop: 2 }}>
                  {tx.type === 'income' ? 'Ingreso' : cat.label} · {d.getDate()} {MONTHS[d.getMonth()]}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: tx.type === 'income' ? accent : t.text }}>
                  {tx.type === 'income' ? '+' : '-'}
                  {fmt(tx.amount, tx.currency)}
                </div>
                <button onClick={() => onDelete(tx.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textSecondary, opacity: 0.5 }}>
                  <Icon name="trash" size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
