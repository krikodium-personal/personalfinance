import type { ReactNode } from 'react';
import { fmt } from '../utils';
import type { Currency, ThemePalette } from '../types';

export function Icon({ name, size = 20, color = 'currentColor' }: { name: string; size?: number; color?: string }) {
  const icons: Record<string, ReactNode> = {
    home: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    chart: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
    wallet: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>,
    categories: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><circle cx="4" cy="6" r="1.5"/><circle cx="4" cy="12" r="1.5"/><circle cx="4" cy="18" r="1.5"/></svg>,
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
    grip: <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>,
    services: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18Z"/><path d="M6 12H4a2 2 0 00-2 2v6a2 2 0 002 2h2"/><path d="M18 9h2a2 2 0 012 2v9a2 2 0 01-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>,
    savings: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 1 Q12 4.5 17 1 L16 7 Q12 6.5 8 7 Z"/><path d="M8 7 Q2 9 2 16 Q2 23 12 23 Q22 23 22 16 Q22 9 16 7 Q12 6.5 8 7 Z"/><line x1="12" y1="11" x2="12" y2="21"/><path d="M15 13.5 Q15 11 12 11 Q9 11 9 13.5 Q9 16 12 16 Q15 16 15 18.5 Q15 21 12 21 Q9 21 9 18.5"/></svg>,
    settings: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  };
  return icons[name] || null;
}

export function SkeletonCard({ t, radius, lines = 2 }: { t: ThemePalette; radius: number; lines?: number }) {
  return (
    <div style={{ background: t.card, borderRadius: radius, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ height: 14, width: '40%', background: t.cardAlt, borderRadius: 6, marginBottom: 10, animation: 'pulse 1.4s ease-in-out infinite' }} />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{ height: 11, width: i === lines - 1 ? '55%' : '70%', background: t.cardAlt, borderRadius: 6, marginBottom: i < lines - 1 ? 7 : 0, animation: 'pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  );
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
  t,
}: {
  data: Array<{ value: number; color: string }>;
  size?: number;
  currency?: Currency;
  t?: ThemePalette;
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
      <text x={cx} y={cy - size * 0.04} textAnchor="middle" fontSize={size * 0.07} fill={t?.textSecondary ?? '#6b6560'}>Total</text>
      <text x={cx} y={cy + size * 0.08} textAnchor="middle" fontSize={amountFontSize} fontWeight="600" fill={t?.text ?? '#1a1714'}>{totalLabel}</text>
    </svg>
  );
}

export function ServicesMonthBarChart({
  monthlyData,
  accent,
  selectedIndex,
  onSelect,
}: {
  monthlyData: Array<{ label: string; status: 'complete' | 'pending' | 'empty'; current: boolean }>;
  accent: string;
  selectedIndex?: number;
  onSelect?: (index: number) => void;
}) {
  const statusColor = (status: 'complete' | 'pending' | 'empty') => {
    if (status === 'complete') return '#16a34a';
    if (status === 'pending') return '#eab308';
    return '#e8e3dd';
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80, padding: '0 4px' }}>
      {monthlyData.map((item, index) => {
        const isSelected = selectedIndex === index;
        const fillHeight = item.status === 'empty' ? 0 : 100;
        return (
          <button
            key={index}
            type="button"
            onClick={() => onSelect?.(index)}
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
            <div
              style={{
                width: '100%',
                background: '#e8e3dd',
                borderRadius: 4,
                height: 70,
                display: 'flex',
                alignItems: 'flex-end',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '100%',
                  background: statusColor(item.status),
                  borderRadius: 4,
                  height: `${fillHeight}%`,
                  opacity: isSelected ? 1 : item.current ? 0.9 : 0.65,
                }}
              />
            </div>
            <span
              style={{
                fontSize: isSelected ? 11 : 10,
                color: isSelected ? accent : '#6b6560',
                fontWeight: isSelected ? 700 : 500,
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
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
