import { useState } from 'react';
import { CATEGORIES } from '../constants';
import type { ThemePalette, Transaction } from '../types';
import { fmt } from '../utils';

interface BudgetTabProps {
  transactions: Transaction[];
  budgets: Record<string, number>;
  onSaveBudget: (catId: string, amount: number) => Promise<void>;
  t: ThemePalette;
  accent: string;
  radius: number;
}

export function BudgetTab({ transactions, budgets, onSaveBudget, t, accent, radius }: BudgetTabProps) {
  const now = new Date();
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');

  const currentExpenses = transactions.filter(tx => {
    const d = new Date(tx.date);
    return tx.type === 'expense' && tx.currency !== 'USD' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const handleSave = async (catId: string) => {
    const val = parseFloat(editVal);
    if (!Number.isNaN(val) && val >= 0) await onSaveBudget(catId, val);
    setEditing(null);
  };

  return <div style={{ padding: '16px 16px 0' }}><div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 4 }}>PRESUPUESTO MENSUAL (ARS)</div><div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 16 }}>Toca cualquier categoría para editar</div><div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{CATEGORIES.filter(c => c.id !== 'other').map(cat => { const spent = currentExpenses.filter(tx => tx.category === cat.id).reduce((s, tx) => s + tx.amount, 0); const budget = budgets[cat.id] || 0; const pct = budget > 0 ? Math.min(spent / budget, 1) : 0; const over = spent > budget && budget > 0; return <div key={cat.id} style={{ background: t.card, borderRadius: radius * 0.75, padding: '14px 16px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: budget > 0 ? 10 : 0 }}><span style={{ fontSize: 20 }}>{cat.icon}</span><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 500, color: t.text }}>{cat.label}</div>{editing === cat.id ? <div style={{ display: 'flex', gap: 6, marginTop: 4 }}><input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave(cat.id)} style={{ flex: 1, fontSize: 13, padding: '4px 8px', border: `1px solid ${accent}`, borderRadius: 6, background: t.inputBg, color: t.text, outline: 'none' }} /><button onClick={() => handleSave(cat.id)} style={{ padding: '4px 10px', background: accent, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>OK</button></div> : <button onClick={() => { setEditing(cat.id); setEditVal(String(budget)); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textSecondary, fontSize: 12, padding: 0, textAlign: 'left', marginTop: 2 }}>{budget > 0 ? `Presupuesto: ${fmt(budget)}` : 'Definir presupuesto'}</button>}</div><div style={{ textAlign: 'right' }}><div style={{ fontSize: 14, fontWeight: 600, color: over ? '#e05555' : t.text }}>{fmt(spent)}</div>{budget > 0 && <div style={{ fontSize: 11, color: t.textSecondary }}>de {fmt(budget)}</div>}</div></div>{budget > 0 && <div style={{ background: t.inputBg, borderRadius: 4, height: 5, overflow: 'hidden' }}><div style={{ height: '100%', borderRadius: 4, background: over ? '#e05555' : accent, width: `${pct * 100}%`, transition: 'width 0.5s' }} /></div>}</div>; })}</div></div>;
}
