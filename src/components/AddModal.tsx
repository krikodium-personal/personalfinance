import { useState } from 'react';
import { CATEGORIES } from '../constants';
import type { Currency, ThemePalette, Transaction, TxType } from '../types';
import { getCat } from '../utils';
import { Icon, Spinner } from './ui';

interface AddModalProps {
  onClose: () => void;
  onAdd: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  t: ThemePalette;
  accent: string;
  radius: number;
}

export function AddModal({ onClose, onAdd, t, accent, radius }: AddModalProps) {
  const [type, setType] = useState<TxType>('expense');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCats, setShowCats] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const num = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (!num || !desc.trim()) return;
    setSaving(true);
    await onAdd({ type, category, amount: num, currency, desc: desc.trim(), date: new Date(date).toISOString() });
    setSaving(false);
    onClose();
  };

  return <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}><div style={{ width: '100%', maxWidth: 390, background: t.card, borderRadius: `${radius}px ${radius}px 0 0`, padding: 24, paddingBottom: 36 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}><span style={{ fontSize: 17, fontWeight: 600, color: t.text }}>Nueva transacción</span><button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textSecondary }}><Icon name="x" size={22} /></button></div><div style={{ display: 'flex', background: t.inputBg, borderRadius: radius * 0.6, padding: 3, marginBottom: 20 }}>{(['expense', 'income'] as const).map(tp => <button key={tp} onClick={() => setType(tp)} style={{ flex: 1, padding: '9px 0', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, borderRadius: radius * 0.5, background: type === tp ? accent : 'transparent', color: type === tp ? '#fff' : t.textSecondary }}>{tp === 'expense' ? 'Gasto' : 'Ingreso'}</button>)}</div><div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: t.textSecondary, display: 'block', marginBottom: 6, fontWeight: 500 }}>MONTO</label><div style={{ display: 'flex', gap: 8 }}><div style={{ display: 'flex', background: t.inputBg, borderRadius: radius * 0.6, padding: 3, flexShrink: 0 }}>{(['ARS', 'USD'] as const).map(cur => <button key={cur} onClick={() => setCurrency(cur)} style={{ padding: '8px 12px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, borderRadius: radius * 0.45, background: currency === cur ? accent : 'transparent', color: currency === cur ? '#fff' : t.textSecondary }}>{cur}</button>)}</div><input style={{ width: '100%', padding: '12px 14px', border: `1.5px solid ${t.border}`, borderRadius: radius * 0.6, background: t.inputBg, color: t.text, fontSize: 15, outline: 'none' }} type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} /></div></div><div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: t.textSecondary, display: 'block', marginBottom: 6, fontWeight: 500 }}>DESCRIPCIÓN</label><input style={{ width: '100%', padding: '12px 14px', border: `1.5px solid ${t.border}`, borderRadius: radius * 0.6, background: t.inputBg, color: t.text, fontSize: 15, outline: 'none' }} type="text" placeholder="¿En qué gastaste?" value={desc} onChange={e => setDesc(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} /></div>{type === 'expense' && <div style={{ marginBottom: 14, position: 'relative' }}><label style={{ fontSize: 12, color: t.textSecondary, display: 'block', marginBottom: 6, fontWeight: 500 }}>CATEGORÍA</label><button onClick={() => setShowCats(!showCats)} style={{ width: '100%', padding: '12px 14px', border: `1.5px solid ${showCats ? accent : t.border}`, borderRadius: radius * 0.6, background: t.inputBg, color: t.text, fontSize: 15, outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}><span>{getCat(category).icon} {getCat(category).label}</span><Icon name="chevronDown" size={16} color={t.textSecondary} /></button>{showCats && <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: t.card, border: `1px solid ${t.border}`, borderRadius: radius * 0.6, zIndex: 10, boxShadow: t.shadow, maxHeight: 220, overflowY: 'auto' }}>{CATEGORIES.map(c => <button key={c.id} onClick={() => { setCategory(c.id); setShowCats(false); }} style={{ width: '100%', padding: '11px 14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, color: t.text, fontSize: 14, background: category === c.id ? t.cardAlt : 'transparent' }}><span style={{ fontSize: 18 }}>{c.icon}</span> {c.label}</button>)}</div>}</div>}<div style={{ marginBottom: 24 }}><label style={{ fontSize: 12, color: t.textSecondary, display: 'block', marginBottom: 6, fontWeight: 500 }}>FECHA</label><input style={{ width: '100%', padding: '12px 14px', border: `1.5px solid ${t.border}`, borderRadius: radius * 0.6, background: t.inputBg, color: t.text, fontSize: 15, outline: 'none' }} type="date" value={date} onChange={e => setDate(e.target.value)} /></div><button onClick={submit} disabled={saving} style={{ width: '100%', padding: '14px', background: accent, color: '#fff', border: 'none', borderRadius: radius * 0.7, fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>{saving ? <><Spinner color="#fff" /> Guardando...</> : 'Guardar'}</button></div></div>;
}
