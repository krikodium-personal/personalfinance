import type { ReactNode } from 'react';
import { fmt } from '../utils';
import type { Currency, ThemePalette } from '../types';

export function Icon({ name, size = 20, color = 'currentColor' }: { name: string; size?: number; color?: string }) {
  const icons: Record<string, ReactNode> = {
    home: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    chart: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
    wallet: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>,
    plus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    x: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    chevronDown: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>,
    trash: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
    edit: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 113 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>,
    refresh: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
    cloud: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg>,
    exchange: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>,
    eye: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    eyeOff: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  };
  return icons[name] || null;
}

export function Spinner({ color }: { color: string }) {
  return <div style={{ width: 20, height: 20, border: `2px solid ${color}30`, borderTop: `2px solid ${color}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}

export function Toast({ message, type, t }: { message: string; type: 'info' | 'error'; t: ThemePalette }) {
  return <div style={{ position: 'absolute', top: 60, left: 16, right: 16, zIndex: 200, background: type === 'error' ? '#e05555' : t.text, color: '#fff', padding: '12px 16px', borderRadius: 12, fontSize: 13, fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.2)', animation: 'fadeIn 0.2s ease' }}>{message}</div>;
}

export function DonutChart({
  data,
  size = 160,
  currency = 'ARS',
}: {
  data: Array<{ value: number; color: string }>;
  size?: number;
  /** Moneda del total central y del gráfico (solo afecta el formato del número). */
  currency?: Currency;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 13 }}>Sin datos</div>;
  const r = size * 0.33;
  const stroke = Math.max(16, size * 0.12);
  const totalLabel = fmt(total, currency);
  const innerDiameter = (r - stroke / 2) * 2;
  const estimatedCharWidth = 0.56;
  const maxAmountFont = size * 0.1;
  const minAmountFont = 14;
  const fittedAmountFont = innerDiameter / Math.max(totalLabel.length * estimatedCharWidth, 1);
  const amountFontSize = Math.max(minAmountFont, Math.min(maxAmountFont, fittedAmountFont));
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let cumulative = 0;
  const slices = data.map(d => {
    const pct = d.value / total;
    const dash = pct * circumference;
    const offset = cumulative * circumference;
    cumulative += pct;
    return { ...d, dash, offset: circumference - offset };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e8e3dd" strokeWidth={stroke} />
      {slices.map((s, i) => <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={stroke} strokeDasharray={`${s.dash} ${circumference - s.dash}`} strokeDashoffset={s.offset} strokeLinecap="round" style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }} />)}
      <text x={cx} y={cy - size * 0.04} textAnchor="middle" fontSize={size * 0.07} fill="#6b6560">Total</text>
      <text x={cx} y={cy + size * 0.08} textAnchor="middle" fontSize={amountFontSize} fontWeight="600" fill="#1a1714">{totalLabel}</text>
    </svg>
  );
}

export function BarChart({
  monthlyData,
  accent,
  selectedIndex,
  onSelect,
}: {
  monthlyData: Array<{ label: string; expense: number; current: boolean }>;
  accent: string;
  selectedIndex?: number;
  onSelect?: (index: number) => void;
}) {
  const max = Math.max(...monthlyData.map(d => d.expense), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80, padding: '0 4px' }}>
      {monthlyData.map((d, i) => {
        const isSelected = selectedIndex === i;
        return (
          <button
            key={i}
            onClick={() => onSelect?.(i)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              border: isSelected ? `2px solid ${accent}` : '2px solid transparent',
              borderRadius: 8,
              background: isSelected ? `${accent}14` : 'transparent',
              boxShadow: isSelected ? '0 4px 14px rgba(0,0,0,0.12)' : 'none',
              transform: isSelected ? 'translateY(-2px)' : 'none',
              transition: 'all 0.18s ease',
              cursor: 'pointer',
              padding: 2,
            }}
          >
            <div style={{ width: '100%', background: '#e8e3dd', borderRadius: 4, height: 70, display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
              <div style={{ width: '100%', background: accent, borderRadius: 4, height: `${(d.expense / max) * 100}%`, opacity: isSelected ? 1 : d.current ? 0.85 : 0.5 }} />
            </div>
            <span style={{ fontSize: isSelected ? 11 : 10, color: isSelected ? accent : '#6b6560', fontWeight: isSelected ? 700 : 500 }}>
              {d.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
