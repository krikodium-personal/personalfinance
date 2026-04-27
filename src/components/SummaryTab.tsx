import { useMemo, useState } from 'react';
import { CATEGORIES, MONTHS } from '../constants';
import type { Category, Currency, ThemePalette, Transaction } from '../types';
import { fmt } from '../utils';
import { BarChart, DonutChart } from './ui';

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

export function SummaryTab({ transactions, categories, t, accent, radius }: SummaryTabProps) {
  const now = new Date();
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const txs = transactions.filter(tx => {
      const td = new Date(tx.date);
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
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(5);
  const selectedMonthData = monthlyData[selectedMonthIndex] || monthlyData[monthlyData.length - 1];

  const distributionByCategory = useMemo(() => {
    const month = selectedMonthData.month;
    const year = selectedMonthData.year;

    const curMonthExpense = transactions.filter(tx => {
      const d = new Date(tx.date);
      return tx.type === 'expense' && tx.currency !== 'USD' && d.getMonth() === month && d.getFullYear() === year;
    });

    const curMonthIncomeArs = transactions.filter(tx => {
      const d = new Date(tx.date);
      return tx.type === 'income' && tx.currency !== 'USD' && d.getMonth() === month && d.getFullYear() === year;
    });

    const curMonthIncomeUsd = transactions.filter(tx => {
      const d = new Date(tx.date);
      return tx.type === 'income' && tx.currency === 'USD' && d.getMonth() === month && d.getFullYear() === year;
    });

    function resolveCategoryLook(categoryId: string): { label: string; color: string } {
      const fromUser = categories.find(c => c.id === categoryId);
      if (fromUser) return { label: fromUser.label, color: fromUser.color };
      const fromDefaults = CATEGORIES.find(c => c.id === categoryId);
      if (fromDefaults) return { label: fromDefaults.label, color: fromDefaults.color };
      return { label: categoryId || 'Sin categoría', color: '#a0a0a0' };
    }

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
      incomeArs: build(curMonthIncomeArs),
      incomeUsd: build(curMonthIncomeUsd),
    };
  }, [categories, selectedMonthData.month, selectedMonthData.year, transactions]);

  const { expense: byCatExpense, incomeArs: byCatIncomeArs, incomeUsd: byCatIncomeUsd } = distributionByCategory;

  const renderDistributionBody = (items: DistItem[], currency: Currency = 'ARS') => (
    <>
      <DonutChart data={items} size={300} currency={currency} />
      <div style={{ width: '100%', maxWidth: 540, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map(categoryItem => (
          <div key={categoryItem.catKey} style={{ borderBottom: `1px solid ${t.border}`, paddingBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: categoryItem.color }} />
              <span style={{ fontSize: 14, color: t.textSecondary, flex: 1 }}>{categoryItem.label}</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: t.text }}>{fmt(categoryItem.value, currency)}</span>
            </div>
            <div style={{ marginTop: 6, marginLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {categoryItem.subcategories.map(sub => (
                <div key={`${categoryItem.catKey}-${sub.label}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: t.textSecondary, flex: 1 }}>{sub.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: t.textSecondary }}>{fmt(sub.amount, currency)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {items.length === 0 && <span style={{ fontSize: 13, color: t.textSecondary }}>Sin datos</span>}
      </div>
    </>
  );

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 12 }}>GASTOS ARS — ÚLTIMOS 6 MESES</div>
      <div style={{ background: t.card, borderRadius: radius, padding: 20, marginBottom: 16 }}>
        <BarChart monthlyData={monthlyData} accent={accent} selectedIndex={selectedMonthIndex} onSelect={setSelectedMonthIndex} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 12 }}>{`DISTRIBUCIÓN ${selectedMonthData.label.toUpperCase()} ${selectedMonthData.year}`}</div>
      <div style={{ background: t.card, borderRadius: radius, padding: 20, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 22, alignItems: 'center' }}>
        <div style={{ width: '100%', fontSize: 13, fontWeight: 600, color: t.text }}>Gastos por categoría</div>
        {renderDistributionBody(byCatExpense)}
      </div>
      <div style={{ background: t.card, borderRadius: radius, padding: 20, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 22, alignItems: 'center' }}>
        <div style={{ width: '100%', fontSize: 13, fontWeight: 600, color: t.text }}>Ingresos ARS por categoría</div>
        {renderDistributionBody(byCatIncomeArs, 'ARS')}
      </div>
      <div style={{ background: t.card, borderRadius: radius, padding: 20, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 22, alignItems: 'center' }}>
        <div style={{ width: '100%', fontSize: 13, fontWeight: 600, color: t.text }}>Ingresos USD por categoría</div>
        {renderDistributionBody(byCatIncomeUsd, 'USD')}
      </div>
    </div>
  );
}
