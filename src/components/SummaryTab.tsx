import { useEffect, useMemo, useState } from 'react';
import { CATEGORIES, MONTHS } from '../constants';
import type { Category, Currency, ThemePalette, Transaction } from '../types';
import { fmt, parseTxDate } from '../utils';
import { BarChart, DonutChart, Icon } from './ui';

interface SummaryTabProps {
  transactions: Transaction[];
  categories: Category[];
  t: ThemePalette;
  accent: string;
  radius: number;
}

type DistItem = {
  catKey: string;
  label: string;
  color: string;
  value: number;
  subcategories: Array<{ label: string; amount: number }>;
};

type AnnualCategoryItem = {
  catKey: string;
  label: string;
  color: string;
  incomeArs: number;
  expenseArs: number;
  incomeUsd: number;
  expenseUsd: number;
};

export function SummaryTab({ transactions, categories, t, accent, radius }: SummaryTabProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const [periodView, setPeriodView] = useState<'monthly' | 'annual'>('monthly');
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(currentYear, i, 1);
    const txs = transactions.filter(tx => {
      const td = parseTxDate(tx.date);
      return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear() && tx.currency !== 'USD';
    });
    return {
      label: MONTHS[d.getMonth()],
      expense: txs.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0),
      current: d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(),
      month: d.getMonth(),
      year: d.getFullYear(),
    };
  });
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(now.getMonth());
  const [expandedCategoryKeys, setExpandedCategoryKeys] = useState<Record<string, boolean>>({});
  const selectedMonthData = monthlyData[selectedMonthIndex] || monthlyData[monthlyData.length - 1];
  const availableYears = useMemo(() => {
    const yearSet = new Set<number>();
    transactions.forEach(tx => yearSet.add(parseTxDate(tx.date).getFullYear()));
    yearSet.add(currentYear);
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [currentYear, transactions]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const effectiveAnnualYear = availableYears.includes(selectedYear) ? selectedYear : availableYears[0];

  useEffect(() => {
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const annualExpenseTotal = useMemo(() => {
    return transactions
      .filter(tx => {
        const d = parseTxDate(tx.date);
        return tx.type === 'expense' && tx.currency !== 'USD' && d.getFullYear() === effectiveAnnualYear;
      })
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [effectiveAnnualYear, transactions]);

  const resolveCategoryLook = (categoryId: string): { label: string; color: string } => {
    const fromUser = categories.find(c => c.id === categoryId);
    if (fromUser) return { label: fromUser.label, color: fromUser.color };
    const fromDefaults = CATEGORIES.find(c => c.id === categoryId);
    if (fromDefaults) return { label: fromDefaults.label, color: fromDefaults.color };
    return { label: categoryId || 'Sin categoría', color: '#a0a0a0' };
  };

  const annualCategorySummary = useMemo(() => {
    const byCat = new Map<string, AnnualCategoryItem>();
    transactions.forEach(tx => {
      const d = parseTxDate(tx.date);
      if (d.getFullYear() !== effectiveAnnualYear) return;
      const key = (tx.category && tx.category.trim()) || '__none__';
      if (!byCat.has(key)) {
        const look = resolveCategoryLook(key === '__none__' ? '' : key);
        byCat.set(key, {
          catKey: key,
          label: look.label,
          color: look.color,
          incomeArs: 0,
          expenseArs: 0,
          incomeUsd: 0,
          expenseUsd: 0,
        });
      }
      const item = byCat.get(key)!;
      if (tx.currency === 'USD') {
        if (tx.type === 'income') item.incomeUsd += tx.amount;
        else item.expenseUsd += tx.amount;
      } else {
        if (tx.type === 'income') item.incomeArs += tx.amount;
        else item.expenseArs += tx.amount;
      }
    });
    return Array.from(byCat.values())
      .filter(item => item.incomeArs + item.expenseArs + item.incomeUsd + item.expenseUsd > 0)
      .sort((a, b) => (b.incomeArs + b.expenseArs + b.incomeUsd + b.expenseUsd) - (a.incomeArs + a.expenseArs + a.incomeUsd + a.expenseUsd));
  }, [effectiveAnnualYear, transactions]);

  const distributionByCategory = useMemo(() => {
    const month = selectedMonthData.month;
    const year = selectedMonthData.year;

    const curMonthExpense = transactions.filter(tx => {
      const d = parseTxDate(tx.date);
      if (tx.type !== 'expense' || tx.currency === 'USD') return false;
      return periodView === 'annual'
        ? d.getFullYear() === effectiveAnnualYear
        : d.getMonth() === month && d.getFullYear() === year;
    });

    const curMonthExpenseUsd = transactions.filter(tx => {
      const d = parseTxDate(tx.date);
      if (tx.type !== 'expense' || tx.currency !== 'USD') return false;
      return periodView === 'annual'
        ? d.getFullYear() === effectiveAnnualYear
        : d.getMonth() === month && d.getFullYear() === year;
    });

    const curMonthIncomeArs = transactions.filter(tx => {
      const d = parseTxDate(tx.date);
      if (tx.type !== 'income' || tx.currency === 'USD') return false;
      return periodView === 'annual'
        ? d.getFullYear() === effectiveAnnualYear
        : d.getMonth() === month && d.getFullYear() === year;
    });

    const curMonthIncomeUsd = transactions.filter(tx => {
      const d = parseTxDate(tx.date);
      if (tx.type !== 'income' || tx.currency !== 'USD') return false;
      return periodView === 'annual'
        ? d.getFullYear() === effectiveAnnualYear
        : d.getMonth() === month && d.getFullYear() === year;
    });

    /** Agrupa por el `category` real de cada movimiento; así no se pierden categorías que están en BD pero no en tu lista editada (p. ej. Cambio USD). */
    function build(rows: Transaction[]): DistItem[] {
      const byCatId = new Map<string, Transaction[]>();
      rows.forEach(tx => {
        const key = (tx.category && tx.category.trim()) || '__none__';
        if (!byCatId.has(key)) byCatId.set(key, []);
        byCatId.get(key)!.push(tx);
      });

      return Array.from(byCatId.entries())
        .map(([catKey, txs]) => {
          const look = resolveCategoryLook(catKey === '__none__' ? '' : catKey);
          const value = txs.reduce((s, tx) => s + tx.amount, 0);
          const bySubMap = new Map<string, number>();

          txs.forEach(tx => {
            const rawDescription = tx.desc?.trim() || '';
            const subLabel = rawDescription.split(' · ')[0]?.trim() || 'Sin subcategoría';
            bySubMap.set(subLabel, (bySubMap.get(subLabel) || 0) + tx.amount);
          });

          const subcategories = Array.from(bySubMap.entries())
            .map(([label, amount]) => ({ label, amount }))
            .sort((a, b) => b.amount - a.amount);

          return {
            catKey,
            label: look.label,
            color: look.color,
            value,
            subcategories,
          };
        })
        .filter(d => d.value > 0)
        .sort((a, b) => b.value - a.value);
    }

    return {
      expense: build(curMonthExpense),
      expenseUsd: build(curMonthExpenseUsd),
      incomeArs: build(curMonthIncomeArs),
      incomeUsd: build(curMonthIncomeUsd),
    };
  }, [categories, effectiveAnnualYear, periodView, selectedMonthData.month, selectedMonthData.year, transactions]);

  const {
    expense: byCatExpense,
    expenseUsd: byCatExpenseUsd,
    incomeArs: byCatIncomeArs,
    incomeUsd: byCatIncomeUsd,
  } = distributionByCategory;

  const toggleCategory = (key: string) => {
    setExpandedCategoryKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderDistributionBody = (items: DistItem[], currency: Currency = 'ARS') => (
    <>
      <DonutChart data={items} size={300} currency={currency} />
      <div style={{ width: '100%', maxWidth: 540, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map(categoryItem => (
          <div key={categoryItem.catKey} style={{ borderBottom: `1px solid ${t.border}`, paddingBottom: 10 }}>
            <button
              type="button"
              onClick={() => toggleCategory(categoryItem.catKey)}
              style={{ width: '100%', border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: 5, background: categoryItem.color }} />
                <span style={{ fontSize: 14, color: t.textSecondary, flex: 1, textAlign: 'left' }}>{categoryItem.label}</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: t.text }}>{fmt(categoryItem.value, currency)}</span>
                <div
                  style={{
                    transform: expandedCategoryKeys[categoryItem.catKey] ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.18s ease',
                    color: t.textSecondary,
                  }}
                >
                  <Icon name="chevronDown" size={14} color={t.textSecondary} />
                </div>
              </div>
            </button>
            {expandedCategoryKeys[categoryItem.catKey] && (
              <div style={{ marginTop: 6, marginLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {categoryItem.subcategories.map(sub => (
                  <div key={`${categoryItem.catKey}-${sub.label}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: t.textSecondary, flex: 1 }}>{sub.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: t.textSecondary }}>{fmt(sub.amount, currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && <span style={{ fontSize: 13, color: t.textSecondary }}>Sin datos</span>}
      </div>
    </>
  );

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary }}>
          {periodView === 'monthly' ? `GASTOS ARS — ${currentYear}` : `GASTOS ARS — RESUMEN ANUAL ${effectiveAnnualYear}`}
        </div>
        <div style={{ display: 'flex', background: t.inputBg, borderRadius: 999, padding: 3 }}>
          <button
            onClick={() => setPeriodView('monthly')}
            style={{
              border: 'none',
              borderRadius: 999,
              padding: '5px 10px',
              fontSize: 11,
              cursor: 'pointer',
              background: periodView === 'monthly' ? accent : 'transparent',
              color: periodView === 'monthly' ? '#fff' : t.textSecondary,
            }}
          >
            Mes
          </button>
          <button
            onClick={() => setPeriodView('annual')}
            style={{
              border: 'none',
              borderRadius: 999,
              padding: '5px 10px',
              fontSize: 11,
              cursor: 'pointer',
              background: periodView === 'annual' ? accent : 'transparent',
              color: periodView === 'annual' ? '#fff' : t.textSecondary,
            }}
          >
            Año
          </button>
        </div>
      </div>
      <div style={{ background: t.card, borderRadius: radius, padding: 20, marginBottom: 16 }}>
        {periodView === 'monthly' ? (
          <BarChart monthlyData={monthlyData} accent={accent} selectedIndex={selectedMonthIndex} onSelect={setSelectedMonthIndex} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              {availableYears.map(year => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  style={{
                    border: `1px solid ${year === effectiveAnnualYear ? accent : t.border}`,
                    borderRadius: 999,
                    background: year === effectiveAnnualYear ? `${accent}16` : t.inputBg,
                    color: year === effectiveAnnualYear ? accent : t.textSecondary,
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '5px 10px',
                    cursor: 'pointer',
                  }}
                >
                  {year}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: t.textSecondary }}>Total de gastos ARS del año</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: t.text }}>{fmt(annualExpenseTotal, 'ARS')}</div>
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 12 }}>
        {periodView === 'monthly'
          ? `DISTRIBUCIÓN ${selectedMonthData.label.toUpperCase()} ${selectedMonthData.year}`
          : `DISTRIBUCIÓN ANUAL ${effectiveAnnualYear}`}
      </div>
      {periodView === 'monthly' ? (
        <>
          <div style={{ background: t.card, borderRadius: radius, padding: 20, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 22, alignItems: 'center' }}>
            <div style={{ width: '100%', fontSize: 13, fontWeight: 600, color: t.text }}>Gastos por categoría</div>
            {renderDistributionBody(byCatExpense)}
          </div>
          <div style={{ background: t.card, borderRadius: radius, padding: 20, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 22, alignItems: 'center' }}>
            <div style={{ width: '100%', fontSize: 13, fontWeight: 600, color: t.text }}>Gastos USD por categoría</div>
            {renderDistributionBody(byCatExpenseUsd, 'USD')}
          </div>
          <div style={{ background: t.card, borderRadius: radius, padding: 20, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 22, alignItems: 'center' }}>
            <div style={{ width: '100%', fontSize: 13, fontWeight: 600, color: t.text }}>Ingresos ARS por categoría</div>
            {renderDistributionBody(byCatIncomeArs, 'ARS')}
          </div>
          <div style={{ background: t.card, borderRadius: radius, padding: 20, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 22, alignItems: 'center' }}>
            <div style={{ width: '100%', fontSize: 13, fontWeight: 600, color: t.text }}>Ingresos USD por categoría</div>
            {renderDistributionBody(byCatIncomeUsd, 'USD')}
          </div>
        </>
      ) : (
        <div style={{ background: t.card, borderRadius: radius, padding: 20, marginBottom: 16 }}>
          <div style={{ width: '100%', fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 10 }}>Resumen anual por categoría</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {annualCategorySummary.map(item => {
              const balanceArs = item.incomeArs - item.expenseArs;
              const balanceUsd = item.incomeUsd - item.expenseUsd;
              const zeroColor = '#cfc7bc';
              return (
                <div key={item.catKey} style={{ borderBottom: `1px solid ${t.border}`, paddingBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 5, background: item.color }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{item.label}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, color: t.textSecondary }}>Ingresos</div>
                      <div style={{ fontSize: 12, color: item.incomeArs === 0 ? zeroColor : t.text }}>{fmt(item.incomeArs, 'ARS')}</div>
                      <div style={{ fontSize: 12, color: item.incomeUsd === 0 ? zeroColor : t.text }}>{fmt(item.incomeUsd, 'USD')}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: t.textSecondary }}>Gastos</div>
                      <div style={{ fontSize: 12, color: item.expenseArs === 0 ? zeroColor : t.text }}>{fmt(item.expenseArs, 'ARS')}</div>
                      <div style={{ fontSize: 12, color: item.expenseUsd === 0 ? zeroColor : t.text }}>{fmt(item.expenseUsd, 'USD')}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: t.textSecondary }}>Saldo</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: balanceArs === 0 ? zeroColor : balanceArs >= 0 ? accent : '#dc2626' }}>{fmt(balanceArs, 'ARS')}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: balanceUsd === 0 ? zeroColor : balanceUsd >= 0 ? accent : '#dc2626' }}>{fmt(balanceUsd, 'USD')}</div>
                    </div>
                  </div>
                </div>
              );
            })}
            {annualCategorySummary.length === 0 && <span style={{ fontSize: 13, color: t.textSecondary }}>Sin datos</span>}
          </div>
        </div>
      )}
    </div>
  );
}
