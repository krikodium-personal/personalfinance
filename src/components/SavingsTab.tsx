import { useState } from 'react';
import type { SavingsFund, SavingsSnapshot, ThemePalette } from '../types';
import { fmt } from '../utils';
import { Icon, SkeletonCard } from './ui';

const today = () => new Date().toISOString().slice(0, 10);

const pct = (prev: number, curr: number): number =>
  prev === 0 ? 0 : ((curr - prev) / prev) * 100;

function PctBadge({ value, small }: { value: number; small?: boolean }) {
  const positive = value >= 0;
  const color = positive ? '#16a34a' : '#dc2626';
  const bg = positive ? '#dcfce7' : '#fee2e2';
  const sign = positive ? '+' : '';
  return (
    <span style={{
      display: 'inline-block',
      background: bg,
      color,
      borderRadius: 6,
      padding: small ? '1px 6px' : '2px 8px',
      fontSize: small ? 11 : 12,
      fontWeight: 600,
    }}>
      {sign}{value.toFixed(2)}%
    </span>
  );
}

export function SavingsTab({
  savingsData,
  setSavingsData,
  onPersistSavings,
  loading,
  t,
  accent,
  radius,
}: {
  savingsData: SavingsSnapshot;
  setSavingsData: React.Dispatch<React.SetStateAction<SavingsSnapshot>>;
  onPersistSavings: (data: SavingsSnapshot) => void;
  loading?: boolean;
  t: ThemePalette;
  accent: string;
  radius: number;
}) {
  const [expandedFundId, setExpandedFundId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);

  // Modal: nuevo fondo
  const [showAddFund, setShowAddFund] = useState(false);
  const [newFundName, setNewFundName] = useState('');
  const [newFundCurrency, setNewFundCurrency] = useState<'ARS' | 'USD'>('ARS');

  // Modal: actualizar monto
  const [updatingFund, setUpdatingFund] = useState<SavingsFund | null>(null);
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState(today());
  const previewPct = updatingFund && updatingFund.entries.length > 0
    ? pct(updatingFund.entries[updatingFund.entries.length - 1].amount, parseFloat(newAmount) || 0)
    : null;

  // Modal: editar entrada del historial
  const [editingEntry, setEditingEntry] = useState<{ fundId: string; entryIndex: number; date: string; amount: string } | null>(null);

  // Confirmar borrar entrada
  const [deletingEntry, setDeletingEntry] = useState<{ fundId: string; entryIndex: number } | null>(null);

  // Modal: eliminar fondo
  const [deletingFundId, setDeletingFundId] = useState<string | null>(null);

  const persist = (next: SavingsSnapshot) => {
    setSavingsData(next);
    queueMicrotask(() => onPersistSavings(next));
  };

  const handleAddFund = () => {
    if (!newFundName.trim()) return;
    const fund: SavingsFund = {
      id: `fund-${Date.now()}`,
      name: newFundName.trim(),
      currency: newFundCurrency,
      entries: [],
    };
    const next = { funds: [...savingsData.funds, fund] };
    persist(next);
    setNewFundName('');
    setNewFundCurrency('ARS');
    setShowAddFund(false);
  };

  const handleUpdateAmount = () => {
    if (!updatingFund || !newAmount) return;
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount < 0) return;
    const entry = { date: newDate, amount };
    const next: SavingsSnapshot = {
      funds: savingsData.funds.map(f =>
        f.id === updatingFund.id ? { ...f, entries: [...f.entries, entry] } : f,
      ),
    };
    persist(next);
    setUpdatingFund(null);
    setNewAmount('');
    setNewDate(today());
  };

  const handleDeleteFund = () => {
    if (!deletingFundId) return;
    const next = { funds: savingsData.funds.filter(f => f.id !== deletingFundId) };
    persist(next);
    setDeletingFundId(null);
    if (expandedFundId === deletingFundId) setExpandedFundId(null);
  };

  const handleEditEntry = () => {
    if (!editingEntry) return;
    const amount = parseFloat(editingEntry.amount);
    if (isNaN(amount) || amount < 0) return;
    const next: SavingsSnapshot = {
      funds: savingsData.funds.map(f => {
        if (f.id !== editingEntry.fundId) return f;
        const entries = f.entries.map((e, i) =>
          i === editingEntry.entryIndex ? { date: editingEntry.date, amount } : e,
        );
        return { ...f, entries };
      }),
    };
    persist(next);
    setEditingEntry(null);
  };

  const handleDeleteEntry = () => {
    if (!deletingEntry) return;
    const next: SavingsSnapshot = {
      funds: savingsData.funds.map(f => {
        if (f.id !== deletingEntry.fundId) return f;
        return { ...f, entries: f.entries.filter((_, i) => i !== deletingEntry.entryIndex) };
      }),
    };
    persist(next);
    setDeletingEntry(null);
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: radius * 0.5,
    border: `1px solid ${t.border}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 16,
    boxSizing: 'border-box' as const,
  };

  const labelStyle = { fontSize: 12, color: t.textSecondary, marginBottom: 4, display: 'block' as const };

  return (
    <div style={{ padding: '16px 16px 100px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: t.textSecondary, textTransform: 'uppercase' }}>
            AHORROS
          </div>
        </div>
        <button
          onClick={() => setShowAddFund(true)}
          style={{ background: accent, color: '#fff', border: 'none', borderRadius: radius * 0.6, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Icon name="plus" size={14} color="#fff" /> Nuevo fondo
        </button>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => <SkeletonCard key={i} t={t} radius={radius} />)}
        </div>
      )}

      {!loading && savingsData.funds.length === 0 && (
        <div style={{ textAlign: 'center', color: t.textSecondary, fontSize: 14, padding: '40px 0' }}>
          No tenés fondos todavía.<br />Tocá "Nuevo fondo" para empezar.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {savingsData.funds.map(fund => {
          const last = fund.entries[fund.entries.length - 1];
          const prev = fund.entries[fund.entries.length - 2];
          const periodPct = last && prev ? pct(prev.amount, last.amount) : null;

          const isExpanded = expandedFundId === fund.id;
          const histOpen = showHistory === fund.id;

          return (
            <div key={fund.id} style={{ background: t.card, borderRadius: radius, boxShadow: t.shadow, overflow: 'hidden' }}>
              {/* Header */}
              <button
                onClick={() => setExpandedFundId(isExpanded ? null : fund.id)}
                style={{ width: '100%', border: 'none', background: 'transparent', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: t.text }}>{fund.name}</span>
                  <span style={{ display: 'block', fontSize: 12, color: t.textSecondary, marginTop: 2 }}>
                    {fund.currency}{last ? <> · <span style={{ fontWeight: 600, color: t.text }}>{fmt(last.amount, fund.currency)}</span></> : ' · Sin datos aún'}{periodPct !== null && <> <PctBadge value={periodPct} small /></>}
                  </span>
                </span>
                <span style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(-90deg)', display: 'flex' }}>
                  <Icon name="chevronDown" size={18} color={t.textSecondary} />
                </span>
              </button>

              {/* Expanded */}
              {isExpanded && (
                <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Stats row */}
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => { setUpdatingFund(fund); setNewDate(today()); setNewAmount(''); }}
                      style={{ flex: 1, background: accent, color: '#fff', border: 'none', borderRadius: radius * 0.5, padding: '10px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Actualizar monto
                    </button>
                    {fund.entries.length > 0 && (
                      <button
                        onClick={() => setShowHistory(histOpen ? null : fund.id)}
                        style={{ background: t.cardAlt, color: t.text, border: 'none', borderRadius: radius * 0.5, padding: '10px 12px', fontSize: 13, cursor: 'pointer' }}
                      >
                        {histOpen ? 'Ocultar' : 'Historial'}
                      </button>
                    )}
                    <button
                      onClick={() => setDeletingFundId(fund.id)}
                      style={{ background: 'none', color: '#dc2626', border: `1px solid #dc262630`, borderRadius: radius * 0.5, padding: '10px 12px', fontSize: 13, cursor: 'pointer' }}
                    >
                      <Icon name="trash" size={14} color="#dc2626" />
                    </button>
                  </div>

                  {/* Historial */}
                  {histOpen && (
                    <div style={{ background: t.cardAlt, borderRadius: radius * 0.5, overflow: 'hidden' }}>
                      <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, letterSpacing: 0.5, color: t.textSecondary, textTransform: 'uppercase', borderBottom: `1px solid ${t.border}` }}>
                        Historial
                      </div>
                      {[...fund.entries].reverse().map((entry, i, arr) => {
                        const prevEntry = arr[i + 1];
                        const entryPct = prevEntry ? pct(prevEntry.amount, entry.amount) : null;
                        const originalIndex = fund.entries.length - 1 - i;
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderBottom: i < arr.length - 1 ? `1px solid ${t.border}` : 'none' }}>
                            <span style={{ fontSize: 12, color: t.textSecondary, minWidth: 80 }}>{entry.date}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: t.text, flex: 1 }}>{fmt(entry.amount, fund.currency)}</span>
                            {entryPct !== null ? <PctBadge value={entryPct} small /> : <span style={{ fontSize: 11, color: t.textSecondary }}>inicial</span>}
                            <button
                              onClick={() => setEditingEntry({ fundId: fund.id, entryIndex: originalIndex, date: entry.date, amount: String(entry.amount) })}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center' }}
                            ><Icon name="edit" size={13} color={t.textSecondary} /></button>
                            <button
                              onClick={() => setDeletingEntry({ fundId: fund.id, entryIndex: originalIndex })}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center' }}
                            ><Icon name="trash" size={13} color="#dc2626" /></button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: nuevo fondo */}
      {showAddFund && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: t.card, borderRadius: `${radius}px ${radius}px 0 0`, padding: 20, width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: t.text }}>Nuevo fondo</span>
              <button onClick={() => setShowAddFund(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Icon name="x" size={20} color={t.textSecondary} /></button>
            </div>
            <div>
              <label style={labelStyle}>Nombre</label>
              <input value={newFundName} onChange={e => setNewFundName(e.target.value)} placeholder="Ej: Fima, Cocos, Balanz" style={inputStyle} autoFocus />
            </div>
            <div>
              <label style={labelStyle}>Moneda</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['ARS', 'USD'] as const).map(c => (
                  <button key={c} onClick={() => setNewFundCurrency(c)} style={{ flex: 1, padding: '10px 0', borderRadius: radius * 0.5, border: `2px solid ${newFundCurrency === c ? accent : t.border}`, background: newFundCurrency === c ? `${accent}18` : t.inputBg, color: newFundCurrency === c ? accent : t.text, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                    {c === 'ARS' ? '🇦🇷 Pesos' : '🇺🇸 Dólares'}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleAddFund} disabled={!newFundName.trim()} style={{ background: accent, color: '#fff', border: 'none', borderRadius: radius * 0.5, padding: '13px 0', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: newFundName.trim() ? 1 : 0.5 }}>
              Crear fondo
            </button>
          </div>
        </div>
      )}

      {/* Modal: actualizar monto */}
      {updatingFund && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: t.card, borderRadius: `${radius}px ${radius}px 0 0`, padding: 20, width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: t.text }}>{updatingFund.name}</span>
              <button onClick={() => setUpdatingFund(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Icon name="x" size={20} color={t.textSecondary} /></button>
            </div>
            {updatingFund.entries.length > 0 && (
              <div style={{ background: t.cardAlt, borderRadius: radius * 0.5, padding: '10px 12px', fontSize: 13, color: t.textSecondary }}>
                Monto actual: <strong style={{ color: t.text }}>{fmt(updatingFund.entries[updatingFund.entries.length - 1].amount, updatingFund.currency)}</strong>
              </div>
            )}
            <div>
              <label style={labelStyle}>Nuevo monto ({updatingFund.currency})</label>
              <input
                type="number"
                inputMode="decimal"
                value={newAmount}
                onChange={e => setNewAmount(e.target.value)}
                placeholder="0"
                style={inputStyle}
                autoFocus
              />
            </div>
            {previewPct !== null && newAmount !== '' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: t.cardAlt, borderRadius: radius * 0.5, padding: '10px 12px' }}>
                <span style={{ fontSize: 13, color: t.textSecondary }}>Rendimiento:</span>
                <PctBadge value={previewPct} />
                <span style={{ fontSize: 12, color: t.textSecondary }}>
                  ({previewPct >= 0 ? '+' : ''}{fmt(Math.abs((parseFloat(newAmount) || 0) - updatingFund.entries[updatingFund.entries.length - 1].amount), updatingFund.currency)})
                </span>
              </div>
            )}
            <div>
              <label style={labelStyle}>Fecha</label>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={inputStyle} />
            </div>
            <button onClick={handleUpdateAmount} disabled={!newAmount} style={{ background: accent, color: '#fff', border: 'none', borderRadius: radius * 0.5, padding: '13px 0', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: newAmount ? 1 : 0.5 }}>
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Modal: editar entrada */}
      {editingEntry && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: t.card, borderRadius: `${radius}px ${radius}px 0 0`, padding: 20, width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: t.text }}>Editar registro</span>
              <button onClick={() => setEditingEntry(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Icon name="x" size={20} color={t.textSecondary} /></button>
            </div>
            <div>
              <label style={labelStyle}>Monto</label>
              <input type="number" inputMode="decimal" value={editingEntry.amount} onChange={e => setEditingEntry({ ...editingEntry, amount: e.target.value })} style={inputStyle} autoFocus />
            </div>
            <div>
              <label style={labelStyle}>Fecha</label>
              <input type="date" value={editingEntry.date} onChange={e => setEditingEntry({ ...editingEntry, date: e.target.value })} style={inputStyle} />
            </div>
            <button onClick={handleEditEntry} disabled={!editingEntry.amount} style={{ background: accent, color: '#fff', border: 'none', borderRadius: radius * 0.5, padding: '13px 0', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: editingEntry.amount ? 1 : 0.5 }}>
              Guardar cambios
            </button>
          </div>
        </div>
      )}

      {/* Modal: confirmar borrar entrada */}
      {deletingEntry && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: t.card, borderRadius: radius, padding: 20, width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: t.text }}>¿Eliminar registro?</span>
            <span style={{ fontSize: 14, color: t.textSecondary }}>Esta acción no se puede deshacer.</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDeletingEntry(null)} style={{ flex: 1, background: t.cardAlt, color: t.text, border: 'none', borderRadius: radius * 0.5, padding: '12px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleDeleteEntry} style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', borderRadius: radius * 0.5, padding: '12px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: confirmar eliminación */}
      {deletingFundId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: t.card, borderRadius: radius, padding: 20, width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: t.text }}>¿Eliminar fondo?</span>
            <span style={{ fontSize: 14, color: t.textSecondary }}>Se borrarán todos los datos e historial de este fondo. Esta acción no se puede deshacer.</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDeletingFundId(null)} style={{ flex: 1, background: t.cardAlt, color: t.text, border: 'none', borderRadius: radius * 0.5, padding: '12px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleDeleteFund} style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', borderRadius: radius * 0.5, padding: '12px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
