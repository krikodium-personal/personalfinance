import { useState } from 'react';
import { MONTHS } from '../constants';
import type { Category, ThemePalette, Transaction } from '../types';
import { fmt } from '../utils';
import { BarChart, DonutChart } from './ui';

interface SummaryTabProps {
  transactions: Transaction[];
  categories: Category[];
  t: ThemePalette;
  accent: string;
  radius: number;
}

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

  const curMonth = transactions.filter(tx => {
    const d = new Date(tx.date);
    return tx.type === 'expense' && tx.currency !== 'USD' && d.getMonth() === selectedMonthData.month && d.getFullYear() === selectedMonthData.year;
  });

  const byCat = categories
    .map(c => {
      const txByCategory = curMonth.filter(tx => tx.category === c.id);
      const value = txByCategory.reduce((s, tx) => s + tx.amount, 0);
      const bySubMap = new Map<string, number>();

      txByCategory.forEach(tx => {
        const key = tx.desc?.trim() || 'Sin subcategoría';
        bySubMap.set(key, (bySubMap.get(key) || 0) + tx.amount);
      });

      const subcategories = Array.from(bySubMap.entries())
        .map(([label, amount]) => ({ label, amount }))
        .sort((a, b) => b.amount - a.amount);

      return {
        label: c.label,
        color: c.color,
        value,
        subcategories,
      };
    })
    .filter(d => d.value > 0);

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 12 }}>GASTOS ARS — ÚLTIMOS 6 MESES</div>
      <div style={{ background: t.card, borderRadius: radius, padding: 20, marginBottom: 16 }}>
        <BarChart monthlyData={monthlyData} accent={accent} selectedIndex={selectedMonthIndex} onSelect={setSelectedMonthIndex} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 12 }}>{`DISTRIBUCIÓN ${selectedMonthData.label.toUpperCase()} ${selectedMonthData.year}`}</div>
      <div style={{ background: t.card, borderRadius: radius, padding: 20, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
        <DonutChart data={byCat} size={320} />
        <div style={{ width: '100%', maxWidth: 540, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {byCat.map(categoryItem => (
            <div key={categoryItem.label} style={{ borderBottom: `1px solid ${t.border}`, paddingBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: 5, background: categoryItem.color }} />
                <span style={{ fontSize: 14, color: t.textSecondary, flex: 1 }}>{categoryItem.label}</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: t.text }}>{fmt(categoryItem.value)}</span>
              </div>
              <div style={{ marginTop: 6, marginLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {categoryItem.subcategories.map(sub => (
                  <div key={`${categoryItem.label}-${sub.label}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: t.textSecondary, flex: 1 }}>{sub.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: t.textSecondary }}>{fmt(sub.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {byCat.length === 0 && <span style={{ fontSize: 13, color: t.textSecondary }}>Sin datos</span>}
        </div>
      </div>
    </div>
  );
}
