import { CATEGORIES, MONTHS } from '../constants';
import type { ThemePalette, Transaction } from '../types';
import { fmt } from '../utils';
import { BarChart, DonutChart } from './ui';

interface SummaryTabProps {
  transactions: Transaction[];
  t: ThemePalette;
  accent: string;
  radius: number;
}

export function SummaryTab({ transactions, t, accent, radius }: SummaryTabProps) {
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
    };
  });

  const curMonth = transactions.filter(tx => {
    const d = new Date(tx.date);
    return tx.type === 'expense' && tx.currency !== 'USD' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const byCat = CATEGORIES.map(c => ({
    label: c.label,
    color: c.color,
    value: curMonth.filter(tx => tx.category === c.id).reduce((s, tx) => s + tx.amount, 0),
  })).filter(d => d.value > 0);

  return <div style={{ padding: '16px 16px 0' }}><div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 12 }}>GASTOS ARS — ÚLTIMOS 6 MESES</div><div style={{ background: t.card, borderRadius: radius, padding: 20, marginBottom: 16 }}><BarChart monthlyData={monthlyData} accent={accent} /></div><div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 12 }}>DISTRIBUCIÓN ESTE MES</div><div style={{ background: t.card, borderRadius: radius, padding: 20, marginBottom: 16, display: 'flex', gap: 20, alignItems: 'center' }}><DonutChart data={byCat} size={160} /><div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>{byCat.slice(0, 5).map(d => <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 8, height: 8, borderRadius: 4, background: d.color }} /><span style={{ fontSize: 12, color: t.textSecondary, flex: 1 }}>{d.label}</span><span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{fmt(d.value)}</span></div>)}{byCat.length > 5 && <span style={{ fontSize: 11, color: t.textSecondary }}>+{byCat.length - 5} más</span>}{byCat.length === 0 && <span style={{ fontSize: 12, color: t.textSecondary }}>Sin datos</span>}</div></div></div>;
}
